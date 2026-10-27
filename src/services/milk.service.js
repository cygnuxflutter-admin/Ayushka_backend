const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const MilkProduction = require('../models/MilkProduction');
const MilkDistribution = require('../models/MilkDistribution');
const MilkDisposal = require('../models/MilkDisposal');
const Cow = require('../models/cow.model');
const Shed = require('../models/Shed');
const Worker = require('../models/Worker');
const Gaushala = require('../models/Gaushala');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { isSuperAdmin, isAdmin } = require('../utils/roles');

class MilkService {
  /**
   * Helper: Get today's date formatted as YYYY-MM-DD
   */
  getTodayDateString() {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch (e) {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  /**
   * Helper: Check if date string is in the future
   */
  isFutureDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const today = this.getTodayDateString();
    return dateStr.trim() > today;
  }

  /**
   * Helper: Get previous calendar date as YYYY-MM-DD
   */
  getPreviousDateString(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // =========================================================================
  // 1. ALERT LOGIC (DAILY & MONTHLY)
  // =========================================================================

  /**
   * Check daily variance for a cow's production compared to previous record
   * Triggers an in-app alert if deviation is >= +-10%
   */
  async checkDailyMilkAlert({ gaushalaId, cowId, shift, date, quantity }) {
    try {
      if (quantity === undefined || quantity === null) return;

      const prevDate = this.getPreviousDateString(date);

      // 1. Look for previous day record in same shift
      let prevEntry = await MilkProduction.findOne({
        gaushalaId,
        cowId,
        shift,
        date: prevDate,
        isDeleted: false,
      });

      // If no yesterday entry, check most recent prior entry for same shift
      if (!prevEntry) {
        prevEntry = await MilkProduction.findOne({
          gaushalaId,
          cowId,
          shift,
          date: { $lt: date },
          isDeleted: false,
        }).sort({ date: -1 });
      }

      if (!prevEntry || prevEntry.quantity <= 0) {
        return; // First record or previous quantity 0, cannot calculate % change
      }

      const prevQty = prevEntry.quantity;
      const diff = quantity - prevQty;
      const percentChange = (diff / prevQty) * 100;

      // Check if variance is >= +-10%
      if (Math.abs(percentChange) >= 10) {
        const cow = await Cow.findById(cowId).select('tag_id calf_name');
        const cowTag = cow ? cow.tag_id || cow.calf_name || 'Cow' : 'Cow';

        const isDrop = percentChange < 0;
        const changeWord = isDrop ? 'drop' : 'increase';
        const formattedPercent = Math.abs(percentChange).toFixed(1);

        const title = `⚠️ Milk Production Alert: Cow #${cowTag}`;
        const message = `Cow #${cowTag} produced ${quantity}L in ${shift} shift on ${date}, which is a ${formattedPercent}% ${changeWord} compared to prior production (${prevQty}L).`;

        // Check if an identical notification was already generated today for this cow & shift
        const existingAlert = await Notification.findOne({
          gaushalaId,
          cowId,
          type: 'MILK_PRODUCTION_ALERT',
          title,
          isDeleted: false,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        });

        if (!existingAlert) {
          await Notification.create({
            gaushalaId,
            recipientUserId: null, // Broadcast to all admins/managers
            title,
            message,
            type: 'MILK_PRODUCTION_ALERT',
            cowId,
            scheduledDate: new Date(),
          });
        }
      }
    } catch (err) {
      console.error('Error in checkDailyMilkAlert:', err);
    }
  }

  /**
   * Check monthly milk variance per cow (Month M vs Month M-1)
   * Triggers alert if monthly total varies by >= +-10%
   */
  async checkMonthlyMilkAlerts(gaushalaId, targetYear, targetMonth) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    const now = new Date();
    const year = Number(targetYear) || now.getFullYear();
    const month = Number(targetMonth) || now.getMonth() + 1; // 1-12

    // Format target month bounds (YYYY-MM-01 to YYYY-MM-31)
    const targetMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    const targetStart = `${targetMonthStr}-01`;
    const targetEndDate = new Date(year, month, 0).getDate();
    const targetEnd = `${targetMonthStr}-${String(targetEndDate).padStart(2, '0')}`;

    // Previous month bounds
    const prevDateObj = new Date(year, month - 2, 1);
    const prevYear = prevDateObj.getFullYear();
    const prevMonth = prevDateObj.getMonth() + 1;
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevStart = `${prevMonthStr}-01`;
    const prevEndDate = new Date(prevYear, prevMonth, 0).getDate();
    const prevEnd = `${prevMonthStr}-${String(prevEndDate).padStart(2, '0')}`;

    // Aggregate monthly production per cow per shift for target month
    const targetMonthData = await MilkProduction.aggregate([
      {
        $match: {
          gaushalaId: new mongoose.Types.ObjectId(gaushalaId),
          date: { $gte: targetStart, $lte: targetEnd },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { cowId: '$cowId', shift: '$shift' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    // Aggregate monthly production per cow per shift for previous month
    const prevMonthData = await MilkProduction.aggregate([
      {
        $match: {
          gaushalaId: new mongoose.Types.ObjectId(gaushalaId),
          date: { $gte: prevStart, $lte: prevEnd },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { cowId: '$cowId', shift: '$shift' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const prevMap = new Map();
    prevMonthData.forEach((item) => {
      prevMap.set(`${item._id.cowId}_${item._id.shift}`, item.totalQuantity);
    });

    const alertsGenerated = [];

    for (const item of targetMonthData) {
      const cowId = item._id.cowId;
      const shift = item._id.shift;
      const currentQty = item.totalQuantity;
      const key = `${cowId}_${shift}`;
      const prevQty = prevMap.get(key);

      if (prevQty && prevQty > 0) {
        const diff = currentQty - prevQty;
        const percentChange = (diff / prevQty) * 100;

        if (Math.abs(percentChange) >= 10) {
          const cow = await Cow.findById(cowId).select('tag_id calf_name');
          const cowTag = cow ? cow.tag_id || cow.calf_name || 'Cow' : 'Cow';
          const isDrop = percentChange < 0;
          const changeWord = isDrop ? 'decrease' : 'increase';
          const formattedPercent = Math.abs(percentChange).toFixed(1);

          const title = `📊 Monthly Milk Alert: Cow #${cowTag}`;
          const message = `Cow #${cowTag} monthly ${shift} milk for ${targetMonthStr} was ${currentQty.toFixed(1)}L vs previous month (${prevMonthStr}) ${prevQty.toFixed(1)}L (${formattedPercent}% ${changeWord}).`;

          // Check if already notified
          const existing = await Notification.findOne({
            gaushalaId,
            cowId,
            type: 'MILK_PRODUCTION_ALERT',
            title,
            isDeleted: false,
          });

          if (!existing) {
            await Notification.create({
              gaushalaId,
              recipientUserId: null,
              title,
              message,
              type: 'MILK_PRODUCTION_ALERT',
              cowId,
              scheduledDate: new Date(),
            });

            alertsGenerated.push({
              cowId,
              cowTag,
              shift,
              currentMonthQty: currentQty,
              prevMonthQty: prevQty,
              percentChange,
            });
          }
        }
      }
    }

    return {
      targetMonth: targetMonthStr,
      previousMonth: prevMonthStr,
      alertsCount: alertsGenerated.length,
      alerts: alertsGenerated,
    };
  }

  // =========================================================================
  // 2. MILK PRODUCTION (SINGLE & BULK)
  // =========================================================================

  /**
   * Record single cow milk production entry
   */
  async recordMilkProduction(data, user) {
    const { gaushalaId, date, shift, cowId, workerId, quantity, fat, snf, remarks } = data;

    if (this.isFutureDate(date)) {
      throw new AppError('Production date cannot be a future date', 400);
    }

    // Validate Cow exists & belongs to Gaushala
    const cow = await Cow.findOne({ _id: cowId, isDelete: false });
    if (!cow) {
      throw new AppError('Cow not found or inactive', 404);
    }

    // Validate Worker exists & belongs to Gaushala
    const worker = await Worker.findOne({ _id: workerId, isDelete: false, isActive: true });
    if (!worker) {
      throw new AppError('Worker not found or inactive', 404);
    }

    // Upsert or create production record to prevent duplicate entries for same cow/shift/date
    let record = await MilkProduction.findOne({
      gaushalaId,
      date,
      shift,
      cowId,
      isDeleted: false,
    });

    if (record) {
      record.workerId = workerId;
      record.quantity = quantity;
      record.fat = fat !== undefined ? fat : record.fat;
      record.snf = snf !== undefined ? snf : record.snf;
      record.remarks = remarks !== undefined ? remarks : record.remarks;
      record.addedBy = user?._id || record.addedBy;
      await record.save();
    } else {
      record = await MilkProduction.create({
        gaushalaId,
        date,
        shift,
        cowId,
        workerId,
        quantity,
        fat,
        snf,
        remarks,
        addedBy: user?._id || null,
      });
    }

    // Trigger daily variance check asynchronously
    this.checkDailyMilkAlert({ gaushalaId, cowId, shift, date, quantity }).catch((err) =>
      console.error('Failed to check daily variance alert:', err),
    );

    return record.populate(['cow', 'worker']);
  }

  /**
   * Record bulk milk production entries (multiple cows in one shift session)
   */
  async recordBulkMilkProduction(data, user) {
    const { gaushalaId, date, shift, entries } = data;

    const savedRecords = [];

    for (const entry of entries) {
      const record = await this.recordMilkProduction(
        {
          gaushalaId,
          date,
          shift,
          cowId: entry.cowId,
          workerId: entry.workerId,
          quantity: entry.quantity,
          fat: entry.fat,
          snf: entry.snf,
          remarks: entry.remarks,
        },
        user,
      );
      savedRecords.push(record);
    }

    return {
      totalRecorded: savedRecords.length,
      records: savedRecords,
    };
  }

  // =========================================================================
  // 3. DAILY MILK SUMMARY & INVENTORY
  // =========================================================================

  /**
   * Calculate complete daily milk balance sheet for a specific date
   * Morning produced, Evening produced, Distributed, Disposed, Fridge remaining
   */
  async getDailyMilkSummary(gaushalaId, date) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }
    if (!date) {
      throw new AppError('Date is required (YYYY-MM-DD)', 400);
    }

    const gId = new mongoose.Types.ObjectId(gaushalaId);

    // 1. Production aggregation for this date
    const prodAggregate = await MilkProduction.aggregate([
      { $match: { gaushalaId: gId, date, isDeleted: false } },
      {
        $group: {
          _id: '$shift',
          totalQuantity: { $sum: '$quantity' },
          cowCount: { $addToSet: '$cowId' },
        },
      },
    ]);

    let morningProduced = 0;
    let eveningProduced = 0;
    let morningCowsCount = 0;
    let eveningCowsCount = 0;

    prodAggregate.forEach((item) => {
      if (item._id === 'morning') {
        morningProduced = Number(item.totalQuantity.toFixed(2));
        morningCowsCount = item.cowCount.length;
      } else if (item._id === 'evening') {
        eveningProduced = Number(item.totalQuantity.toFixed(2));
        eveningCowsCount = item.cowCount.length;
      }
    });

    const totalProduced = Number((morningProduced + eveningProduced).toFixed(2));

    // 2. Distribution aggregation for this target milk date
    const distAggregate = await MilkDistribution.aggregate([
      { $match: { gaushalaId: gId, milkDate: date, isDeleted: false } },
      {
        $group: {
          _id: '$shift',
          totalDistributed: { $sum: '$quantity' },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let morningDistributed = 0;
    let eveningDistributed = 0;
    let allDistributed = 0;
    let totalRevenue = 0;

    distAggregate.forEach((item) => {
      totalRevenue += item.totalAmount || 0;
      if (item._id === 'morning') {
        morningDistributed = Number(item.totalDistributed.toFixed(2));
      } else if (item._id === 'evening') {
        eveningDistributed = Number(item.totalDistributed.toFixed(2));
      } else if (item._id === 'all') {
        allDistributed = Number(item.totalDistributed.toFixed(2));
      }
    });

    const totalDistributed = Number(
      (morningDistributed + eveningDistributed + allDistributed).toFixed(2),
    );

    // 3. Disposal aggregation for this target milk date
    const disposalAggregate = await MilkDisposal.aggregate([
      { $match: { gaushalaId: gId, milkDate: date, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalDisposed: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalDisposed = disposalAggregate.length
      ? Number(disposalAggregate[0].totalDisposed.toFixed(2))
      : 0;

    // 4. Calculations: Available stocks & Fridge Remaining
    const morningAvailable = Math.max(0, Number((morningProduced - morningDistributed).toFixed(2)));
    const eveningAvailable = Math.max(0, Number((eveningProduced - eveningDistributed).toFixed(2)));

    // Total remaining milk stored in fridge for this date
    const remainingFridgeMilk = Math.max(
      0,
      Number((totalProduced - (totalDistributed + totalDisposed)).toFixed(2)),
    );

    return {
      date,
      gaushalaId,
      production: {
        morningProduced,
        eveningProduced,
        totalProduced,
        morningCowsCount,
        eveningCowsCount,
      },
      distribution: {
        morningDistributed,
        eveningDistributed,
        allDistributed,
        totalDistributed,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
      disposal: {
        totalDisposed,
      },
      stockBalance: {
        morningAvailable,
        eveningAvailable,
        remainingFridgeMilk, // Bachelu dudh in cold storage/fridge
      },
    };
  }

  // =========================================================================
  // 4. MILK DISTRIBUTION (SAME DAY VS DELAYED NEXT-DAY)
  // =========================================================================

  /**
   * Record milk distribution entry
   * If entered same day: deducts strictly from shift-specific production
   * If entered delayed/next day: deducts automatically from ALL milk pool of that date
   */
  async recordMilkDistribution(data, user) {
    const { gaushalaId, milkDate, quantity, recipientType, recipientName, customerId, ratePerLiter, remarks } =
      data;

    const todayStr = this.getTodayDateString();
    const isSameDay = milkDate === todayStr;

    // Get current milk balance for the target milkDate
    const summary = await this.getDailyMilkSummary(gaushalaId, milkDate);

    let assignedShift = data.shift;
    let isDelayedEntry = false;

    if (isSameDay) {
      // SAME DAY FLOW: Must deduct from morning or evening shift directly
      if (!assignedShift || !['morning', 'evening'].includes(assignedShift)) {
        throw new AppError(
          'For same-day distribution entry, shift must be explicitly specified (morning or evening)',
          400,
        );
      }

      if (assignedShift === 'morning') {
        const available = summary.stockBalance.morningAvailable;
        if (quantity > available) {
          throw new AppError(
            `Insufficient morning milk stock for date ${milkDate}. Available: ${available}L, requested: ${quantity}L`,
            400,
          );
        }
      } else if (assignedShift === 'evening') {
        const available = summary.stockBalance.eveningAvailable;
        if (quantity > available) {
          throw new AppError(
            `Insufficient evening milk stock for date ${milkDate}. Available: ${available}L, requested: ${quantity}L`,
            400,
          );
        }
      }
    } else {
      // DELAYED / NEXT-DAY FLOW:
      // If user forgot on that date and enters later, deducts automatically from ALL milk pool
      assignedShift = 'all';
      isDelayedEntry = true;

      const availableInFridge = summary.stockBalance.remainingFridgeMilk;
      if (quantity > availableInFridge) {
        throw new AppError(
          `Insufficient total milk stock for date ${milkDate}. Available in fridge: ${availableInFridge}L, requested: ${quantity}L`,
          400,
        );
      }
    }

    const rate = Number(ratePerLiter) || 0;
    const totalAmount = Number((rate * quantity).toFixed(2));

    const distribution = await MilkDistribution.create({
      gaushalaId,
      milkDate,
      entryDate: todayStr,
      shift: assignedShift,
      recipientType: recipientType || 'customer',
      recipientName: recipientName || '',
      customerId: customerId || null,
      quantity,
      ratePerLiter: rate,
      totalAmount,
      isDelayedEntry,
      remarks: remarks || '',
      addedBy: user?._id || null,
    });

    return distribution.populate(['customer']);
  }

  // =========================================================================
  // 5. MILK DISPOSAL / SPOILAGE (BAGDELU DOODH)
  // =========================================================================

  /**
   * Record disposal of spoiled/waste milk from cold storage/fridge
   */
  async recordMilkDisposal(data, user) {
    const { gaushalaId, milkDate, disposalDate, quantity, reason, reportedBy, remarks } = data;

    const actualDisposalDate = disposalDate || this.getTodayDateString();

    // Check current remaining fridge stock for this milk date
    const summary = await this.getDailyMilkSummary(gaushalaId, milkDate);
    const availableFridge = summary.stockBalance.remainingFridgeMilk;

    if (quantity > availableFridge) {
      throw new AppError(
        `Disposal quantity (${quantity}L) cannot exceed remaining fridge milk (${availableFridge}L) for date ${milkDate}`,
        400,
      );
    }

    const disposal = await MilkDisposal.create({
      gaushalaId,
      milkDate,
      disposalDate: actualDisposalDate,
      quantity,
      reason: reason || 'spoiled',
      reportedBy: reportedBy || null,
      remarks: remarks || '',
      addedBy: user?._id || null,
    });

    return disposal.populate(['worker']);
  }

  // =========================================================================
  // 6. FRIDGE STOCK REPORT (ALL DATES WITH REMAINING MILK)
  // =========================================================================

  /**
   * Get all dates that have remaining leftover milk in the fridge
   */
  async getFridgeStock(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    const gId = new mongoose.Types.ObjectId(gaushalaId);

    // Find all distinct milk dates from production
    const dates = await MilkProduction.distinct('date', { gaushalaId: gId, isDeleted: false });
    dates.sort((a, b) => b.localeCompare(a)); // Newest first

    const fridgeStockList = [];
    let totalFridgeVolume = 0;

    for (const date of dates) {
      const summary = await this.getDailyMilkSummary(gaushalaId, date);
      const remaining = summary.stockBalance.remainingFridgeMilk;

      if (remaining > 0) {
        fridgeStockList.push({
          milkDate: date,
          totalProduced: summary.production.totalProduced,
          totalDistributed: summary.distribution.totalDistributed,
          totalDisposed: summary.disposal.totalDisposed,
          remainingFridgeMilk: remaining,
        });
        totalFridgeVolume += remaining;
      }
    }

    return {
      gaushalaId,
      totalFridgeVolume: Number(totalFridgeVolume.toFixed(2)),
      datesCount: fridgeStockList.length,
      stockByDate: fridgeStockList,
    };
  }

  // =========================================================================
  // 7. LISTING & PAGINATION APIS
  // =========================================================================

  /**
   * Get production records list with filters
   */
  async getProductionList(params = {}) {
    const { gaushalaId, date, startDate, endDate, shift, cowId, workerId, page = 1, limit = 20 } =
      params;

    const filter = { gaushalaId, isDeleted: false };

    if (date) {
      filter.date = date;
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    if (shift) filter.shift = shift;
    if (cowId && mongoose.isValidObjectId(cowId)) filter.cowId = cowId;
    if (workerId && mongoose.isValidObjectId(workerId)) filter.workerId = workerId;

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      MilkProduction.find(filter)
        .populate('cow', 'tag_id calf_name isFemale shed_id')
        .populate('worker', 'name departmentId')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MilkProduction.countDocuments(filter),
    ]);

    return {
      records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get distribution records list with filters
   */
  async getDistributionList(params = {}) {
    const { gaushalaId, milkDate, startDate, endDate, shift, recipientType, page = 1, limit = 20 } =
      params;

    const filter = { gaushalaId, isDeleted: false };

    if (milkDate) {
      filter.milkDate = milkDate;
    } else if (startDate || endDate) {
      filter.milkDate = {};
      if (startDate) filter.milkDate.$gte = startDate;
      if (endDate) filter.milkDate.$lte = endDate;
    }

    if (shift) filter.shift = shift;
    if (recipientType) filter.recipientType = recipientType;

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      MilkDistribution.find(filter)
        .populate('customer', 'name email phone')
        .sort({ milkDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MilkDistribution.countDocuments(filter),
    ]);

    return {
      records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get disposal records list with filters
   */
  async getDisposalList(params = {}) {
    const { gaushalaId, milkDate, disposalDate, reason, page = 1, limit = 20 } = params;

    const filter = { gaushalaId, isDeleted: false };

    if (milkDate) filter.milkDate = milkDate;
    if (disposalDate) filter.disposalDate = disposalDate;
    if (reason) filter.reason = reason;

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      MilkDisposal.find(filter)
        .populate('worker', 'name departmentId')
        .sort({ disposalDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MilkDisposal.countDocuments(filter),
    ]);

    return {
      records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  // =========================================================================
  // 8. MILK PRODUCTION MATRIX (DATE RANGE GRID & EXCEL EXPORT)
  // =========================================================================

  /**
   * Get date-range cow-wise milk production matrix (Morning & Evening grid)
   *
   * @param {Object} params
   * @param {string} params.gaushalaId
   * @param {string} params.startDate YYYY-MM-DD
   * @param {string} params.endDate YYYY-MM-DD
   * @param {string} [params.cowId] Optional single cow filter
   * @param {string} [params.shedId] Optional shed filter
   * @param {boolean} [params.includeAllCows] Whether to include cows without records in range
   */
  async getMilkProductionMatrix(params = {}) {
    const { gaushalaId, startDate, endDate, cowId, shedId, includeAllCows } = params;

    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid gaushalaId is required', 400);
    }

    // 1. Generate full list of calendar dates between startDate and endDate
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    const startUTC = Date.UTC(sY, sM - 1, sD);
    const endUTC = Date.UTC(eY, eM - 1, eD);

    const dates = [];
    const columns = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let curr = new Date(startUTC);
    const end = new Date(endUTC);
    while (curr <= end) {
      const y = curr.getUTCFullYear();
      const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const d = String(curr.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const displayDate = `${m}/${d}/${y}`; // MM/DD/YYYY e.g. 10/18/2026
      const dayName = dayNames[curr.getUTCDay()];

      dates.push(dateStr);
      columns.push({
        date: dateStr,
        displayDate,
        dayName,
        shifts: ['morning', 'evening'],
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // 2. Fetch all production records in the date range
    const prodFilter = {
      gaushalaId: new mongoose.Types.ObjectId(gaushalaId),
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    };

    if (cowId && mongoose.isValidObjectId(cowId)) {
      prodFilter.cowId = new mongoose.Types.ObjectId(cowId);
    }

    const prodRecords = await MilkProduction.find(prodFilter)
      .select('cowId date shift quantity fat snf remarks')
      .lean();

    // 3. Map production by cowId -> date -> shift
    const cowRecordMap = new Map();
    const recordedCowIdSet = new Set();

    for (const rec of prodRecords) {
      if (!rec.cowId) continue;
      const cId = rec.cowId.toString();
      recordedCowIdSet.add(cId);

      if (!cowRecordMap.has(cId)) {
        cowRecordMap.set(cId, {});
      }
      const cowDates = cowRecordMap.get(cId);
      if (!cowDates[rec.date]) {
        cowDates[rec.date] = { morning: null, evening: null };
      }

      const shift = (rec.shift || '').toLowerCase().trim();
      if (shift === 'morning' || shift === 'evening') {
        const currentQty = cowDates[rec.date][shift];
        cowDates[rec.date][shift] =
          (currentQty !== null ? currentQty : 0) + (Number(rec.quantity) || 0);
      }
    }

    // 4. Resolve cows to display
    let cows = [];
    if (cowId && mongoose.isValidObjectId(cowId)) {
      const singleCow = await Cow.findOne({
        _id: cowId,
        gaushala_id: gaushalaId,
        isDelete: { $ne: true },
      })
        .select('tag_id calf_name shed_id isFemale breedingStatus avatarUrl')
        .populate('shed_id', 'shedNumber')
        .lean();
      if (singleCow) cows = [singleCow];
    } else if (includeAllCows) {
      const cowQuery = {
        gaushala_id: gaushalaId,
        isDelete: { $ne: true },
      };
      if (shedId && mongoose.isValidObjectId(shedId)) {
        cowQuery.shed_id = shedId;
      }
      cows = await Cow.find(cowQuery)
        .select('tag_id calf_name shed_id isFemale breedingStatus avatarUrl')
        .populate('shed_id', 'shedNumber')
        .lean();
    } else {
      // Include cows that have records in this date range
      const cowQuery = {
        _id: { $in: Array.from(recordedCowIdSet).map((id) => new mongoose.Types.ObjectId(id)) },
        isDelete: { $ne: true },
      };
      if (shedId && mongoose.isValidObjectId(shedId)) {
        cowQuery.shed_id = shedId;
      }
      cows = await Cow.find(cowQuery)
        .select('tag_id calf_name shed_id isFemale breedingStatus avatarUrl')
        .populate('shed_id', 'shedNumber')
        .lean();

      // Ensure any cow IDs in records that may not have matched cowQuery are still preserved
      const foundIds = new Set(cows.map((c) => c._id.toString()));
      for (const cId of recordedCowIdSet) {
        if (!foundIds.has(cId) && (!shedId || shedId === 'null')) {
          cows.push({
            _id: cId,
            tag_id: `ID_${cId.slice(-4)}`,
            calf_name: '',
            shed_id: null,
          });
        }
      }
    }

    // Natural sort cows by tag_id (e.g. 1, 4, 10, 14, 16)
    cows.sort((a, b) => {
      const tagA = (a.tag_id || '').toString();
      const tagB = (b.tag_id || '').toString();
      return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 5. Build rows and summary totals
    const rows = [];
    const dayWiseTotals = {};

    dates.forEach((d) => {
      dayWiseTotals[d] = { morning: 0, evening: 0, total: 0 };
    });

    let grandTotalMilk = 0;
    let grandMorningTotal = 0;
    let grandEveningTotal = 0;

    for (const cow of cows) {
      const cId = cow._id.toString();
      const cowDates = cowRecordMap.get(cId) || {};

      let cowTotal = 0;
      let cowMorningTotal = 0;
      let cowEveningTotal = 0;
      const entries = {};

      dates.forEach((d) => {
        const dayData = cowDates[d] || {};
        const morningQty =
          dayData.morning !== undefined && dayData.morning !== null
            ? Number(dayData.morning.toFixed(2))
            : null;
        const eveningQty =
          dayData.evening !== undefined && dayData.evening !== null
            ? Number(dayData.evening.toFixed(2))
            : null;

        let dayTotal = null;
        if (morningQty !== null || eveningQty !== null) {
          dayTotal = Number(((morningQty || 0) + (eveningQty || 0)).toFixed(2));
        }

        entries[d] = {
          morning: morningQty,
          evening: eveningQty,
          total: dayTotal,
        };

        if (morningQty !== null) {
          cowMorningTotal += morningQty;
          cowTotal += morningQty;
          dayWiseTotals[d].morning += morningQty;
          dayWiseTotals[d].total += morningQty;
          grandMorningTotal += morningQty;
          grandTotalMilk += morningQty;
        }
        if (eveningQty !== null) {
          cowEveningTotal += eveningQty;
          cowTotal += eveningQty;
          dayWiseTotals[d].evening += eveningQty;
          dayWiseTotals[d].total += eveningQty;
          grandEveningTotal += eveningQty;
          grandTotalMilk += eveningQty;
        }
      });

      rows.push({
        cowId: cow._id,
        tag_id: cow.tag_id || '',
        cattleId: cow.tag_id || '',
        calf_name: cow.calf_name || '',
        shed: cow.shed_id
          ? {
              _id: cow.shed_id._id || cow.shed_id,
              shedNumber: cow.shed_id.shedNumber || '',
            }
          : null,
        totalMilk: Number(cowTotal.toFixed(2)),
        morningTotal: Number(cowMorningTotal.toFixed(2)),
        eveningTotal: Number(cowEveningTotal.toFixed(2)),
        entries,
      });
    }

    // Round day totals
    for (const d of dates) {
      dayWiseTotals[d].morning = Number(dayWiseTotals[d].morning.toFixed(2));
      dayWiseTotals[d].evening = Number(dayWiseTotals[d].evening.toFixed(2));
      dayWiseTotals[d].total = Number(dayWiseTotals[d].total.toFixed(2));
    }

    return {
      startDate,
      endDate,
      totalDays: dates.length,
      dates,
      columns,
      summary: {
        totalCows: rows.length,
        totalMilk: Number(grandTotalMilk.toFixed(2)),
        morningTotal: Number(grandMorningTotal.toFixed(2)),
        eveningTotal: Number(grandEveningTotal.toFixed(2)),
        dayWiseTotals,
      },
      rows,
    };
  }

  /**
   * Export date-range milk matrix to styled Excel buffer matching the reference layout
   *
   * @param {Object} params
   * @returns {Promise<Buffer>}
   */
  async exportMilkMatrixExcel(params = {}) {
    const data = await this.getMilkProductionMatrix(params);
    const { dates, columns, rows, summary } = data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ayushka Gaushala System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Milk_Production', {
      views: [{ showGridLines: true }],
    });

    // Soft alternating colors matching reference sheet
    const dateColor1 = 'FFFFF2CC'; // Soft yellow / peach
    const dateColor2 = 'FFE2EFDA'; // Soft green

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    const headerBottomBorder = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    // 1. Cattle I'D header (merged A1:A2)
    worksheet.mergeCells('A1:A2');
    const cellA1 = worksheet.getCell('A1');
    cellA1.value = "Cattle I'D";
    cellA1.font = { name: 'Arial', size: 12, bold: true };
    cellA1.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    };
    cellA1.border = headerBottomBorder;
    worksheet.getCell('A2').border = headerBottomBorder;
    worksheet.getColumn(1).width = 14;

    let colIndex = 2; // Column B starts at 2
    dates.forEach((dateStr, idx) => {
      const colStart = colIndex;
      const colEnd = colIndex + 1;
      const displayDate = columns[idx]?.displayDate || dateStr;
      const bgColor = idx % 2 === 0 ? dateColor1 : dateColor2;

      // Merge date header over Morning & Evening
      worksheet.mergeCells(1, colStart, 1, colEnd);
      const dateCell = worksheet.getCell(1, colStart);
      dateCell.value = displayDate;
      dateCell.font = { name: 'Arial', size: 11, bold: true };
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
      dateCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      dateCell.border = thinBorder;
      worksheet.getCell(1, colEnd).border = thinBorder;

      // Row 2: Morning
      const morningCell = worksheet.getCell(2, colStart);
      morningCell.value = 'Morning';
      morningCell.font = { name: 'Arial', size: 10, bold: true };
      morningCell.alignment = { vertical: 'middle', horizontal: 'center' };
      morningCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      morningCell.border = headerBottomBorder;

      // Row 2: Evening
      const eveningCell = worksheet.getCell(2, colEnd);
      eveningCell.value = 'Evening';
      eveningCell.font = { name: 'Arial', size: 10, bold: true };
      eveningCell.alignment = { vertical: 'middle', horizontal: 'center' };
      eveningCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      eveningCell.border = headerBottomBorder;

      worksheet.getColumn(colStart).width = 11;
      worksheet.getColumn(colEnd).width = 11;

      colIndex += 2;
    });

    // Total Column at end
    const totalCol = colIndex;
    worksheet.mergeCells(1, totalCol, 2, totalCol);
    const totalHeaderCell = worksheet.getCell(1, totalCol);
    totalHeaderCell.value = 'Total (L)';
    totalHeaderCell.font = { name: 'Arial', size: 11, bold: true };
    totalHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
    totalHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAECEE' },
    };
    totalHeaderCell.border = headerBottomBorder;
    worksheet.getCell(2, totalCol).border = headerBottomBorder;
    worksheet.getColumn(totalCol).width = 13;

    worksheet.getRow(1).height = 24;
    worksheet.getRow(2).height = 22;

    // Data rows
    let currentExcelRow = 3;
    for (const row of rows) {
      const excelRow = worksheet.getRow(currentExcelRow);
      excelRow.height = 20;

      // Col A: Cattle ID
      const idCell = excelRow.getCell(1);
      idCell.value = row.tag_id || row.cattleId;
      idCell.font = { name: 'Arial', size: 11, bold: true };
      idCell.alignment = { vertical: 'middle', horizontal: 'center' };
      idCell.border = thinBorder;

      let cCol = 2;
      dates.forEach((dateStr, idx) => {
        const entry = row.entries[dateStr] || {};
        const bgColor = idx % 2 === 0 ? dateColor1 : dateColor2;

        // Morning
        const mCell = excelRow.getCell(cCol);
        mCell.value = entry.morning !== null ? entry.morning : '';
        mCell.alignment = { vertical: 'middle', horizontal: 'center' };
        mCell.font = { name: 'Arial', size: 10 };
        mCell.border = thinBorder;
        mCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };

        // Evening
        const eCell = excelRow.getCell(cCol + 1);
        eCell.value = entry.evening !== null ? entry.evening : '';
        eCell.alignment = { vertical: 'middle', horizontal: 'center' };
        eCell.font = { name: 'Arial', size: 10 };
        eCell.border = thinBorder;
        eCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };

        cCol += 2;
      });

      // Total cell
      const tCell = excelRow.getCell(totalCol);
      tCell.value = row.totalMilk;
      tCell.alignment = { vertical: 'middle', horizontal: 'center' };
      tCell.font = { name: 'Arial', size: 10, bold: true };
      tCell.border = thinBorder;
      tCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF4F6F6' },
      };

      currentExcelRow++;
    }

    // Summary Totals row at bottom
    const summaryRow = worksheet.getRow(currentExcelRow);
    summaryRow.height = 22;

    const summaryLabelCell = summaryRow.getCell(1);
    summaryLabelCell.value = 'TOTAL';
    summaryLabelCell.font = { name: 'Arial', size: 11, bold: true };
    summaryLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summaryLabelCell.border = thinBorder;
    summaryLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD5D8DC' },
    };

    let sumCol = 2;
    dates.forEach((dateStr) => {
      const dayTotal = summary.dayWiseTotals[dateStr] || { morning: 0, evening: 0 };

      const mSumCell = summaryRow.getCell(sumCol);
      mSumCell.value = dayTotal.morning;
      mSumCell.font = { name: 'Arial', size: 10, bold: true };
      mSumCell.alignment = { vertical: 'middle', horizontal: 'center' };
      mSumCell.border = thinBorder;
      mSumCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEBEDEF' },
      };

      const eSumCell = summaryRow.getCell(sumCol + 1);
      eSumCell.value = dayTotal.evening;
      eSumCell.font = { name: 'Arial', size: 10, bold: true };
      eSumCell.alignment = { vertical: 'middle', horizontal: 'center' };
      eSumCell.border = thinBorder;
      eSumCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEBEDEF' },
      };

      sumCol += 2;
    });

    const grandTotalCell = summaryRow.getCell(totalCol);
    grandTotalCell.value = summary.totalMilk;
    grandTotalCell.font = { name: 'Arial', size: 11, bold: true };
    grandTotalCell.alignment = { vertical: 'middle', horizontal: 'center' };
    grandTotalCell.border = thinBorder;
    grandTotalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD5D8DC' },
    };

    return await workbook.xlsx.writeBuffer();
  }

  // =========================================================================
  // 9. BULK MILK PRODUCTION EXCEL IMPORT & TEMPLATE GENERATION
  // =========================================================================

  /**
   * Generate dynamic Milk Production Excel Import Template with database dropdowns
   * (Cows, Workers, Shifts, Gaushalas).
   *
   * @param {Object} params
   * @param {string} [params.gaushalaId]
   * @param {Object} [params.user]
   * @param {string} [params.date]
   * @param {string} [params.shift]
   * @returns {Promise<Buffer>}
   */
  async generateMilkImportTemplate(params = {}) {
    const { gaushalaId = null, user = null, date = null, shift = null } = params;

    let targetGaushalaId = null;
    if (user && !isSuperAdmin(user) && user.gaushalaId) {
      targetGaushalaId = (user.gaushalaId._id || user.gaushalaId).toString();
    } else if (gaushalaId) {
      targetGaushalaId = gaushalaId.toString();
    }

    const gaushalaFilter = targetGaushalaId ? { _id: targetGaushalaId } : {};
    const cowFilter = { isDelete: { $ne: true } };
    const workerFilter = { isDelete: { $ne: true }, isActive: true };

    if (targetGaushalaId) {
      cowFilter.gaushala_id = targetGaushalaId;
      workerFilter.gaushalaId = targetGaushalaId;
    }

    const [allGaushalas, allCows, allWorkers] = await Promise.all([
      Gaushala.find(gaushalaFilter).sort({ gaushalaName: 1 }).lean(),
      Cow.find(cowFilter).select('tag_id calf_name shed_id gaushala_id isFemale').sort({ tag_id: 1 }).lean(),
      Worker.find(workerFilter).select('name gaushalaId departmentId').sort({ name: 1 }).lean(),
    ]);

    // Natural sort cows by tag_id
    allCows.sort((a, b) => {
      const tagA = (a.tag_id || '').toString();
      const tagB = (b.tag_id || '').toString();
      return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ayushka Gaushala System';
    workbook.created = new Date();

    // 1. Data Entry Worksheet
    const worksheet = workbook.addWorksheet('Milk_Production_Template', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'cow_name', key: 'cow_name', width: 20 },
      { header: 'date', key: 'date', width: 16 },
      { header: 'shift', key: 'shift', width: 14 },
      { header: 'worker', key: 'worker', width: 24 },
      { header: 'quantity', key: 'quantity', width: 16 },
      { header: 'fat', key: 'fat', width: 12 },
      { header: 'snf', key: 'snf', width: 12 },
      { header: 'remarks', key: 'remarks', width: 26 },
      { header: 'gaushala', key: 'gaushala', width: 26 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E88E5' }, // Blue
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0D47A1' } },
        left: { style: 'thin', color: { argb: 'FF0D47A1' } },
        bottom: { style: 'thin', color: { argb: 'FF0D47A1' } },
        right: { style: 'thin', color: { argb: 'FF0D47A1' } },
      };
    });

    // 2. Reference Data Sheet (for Dropdowns)
    const refSheet = workbook.addWorksheet('Dropdown_Options', {
      views: [{ showGridLines: true }],
    });

    const shifts = ['morning', 'evening'];
    const cowNames = Array.from(
      new Set(allCows.map((c) => (c.calf_name && c.calf_name.trim()) || c.tag_id).filter(Boolean))
    );
    const workerNames = allWorkers.map((w) => w.name).filter(Boolean);
    const gaushalaNames = allGaushalas.map((g) => g.gaushalaName).filter(Boolean);

    refSheet.getCell('A1').value = 'Shifts';
    refSheet.getCell('B1').value = 'Cow Names';
    refSheet.getCell('C1').value = 'Milking Workers';
    refSheet.getCell('D1').value = 'Gaushalas';

    shifts.forEach((s, idx) => {
      refSheet.getCell(`A${idx + 2}`).value = s;
    });

    cowNames.forEach((name, idx) => {
      refSheet.getCell(`B${idx + 2}`).value = name;
    });

    workerNames.forEach((w, idx) => {
      refSheet.getCell(`C${idx + 2}`).value = w;
    });

    gaushalaNames.forEach((g, idx) => {
      refSheet.getCell(`D${idx + 2}`).value = g;
    });

    // Style reference sheet header
    const refHeader = refSheet.getRow(1);
    refHeader.height = 24;
    refHeader.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF455A64' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Dropdown ranges
    const shiftRange = 'Dropdown_Options!$A$2:$A$3';
    const cowRange = cowNames.length > 0 ? `Dropdown_Options!$B$2:$B$${cowNames.length + 1}` : null;
    const workerRange = workerNames.length > 0 ? `Dropdown_Options!$C$2:$C$${workerNames.length + 1}` : null;
    const gaushalaRange = gaushalaNames.length > 0 ? `Dropdown_Options!$D$2:$D$${gaushalaNames.length + 1}` : null;

    const today = date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : this.getTodayDateString();
    const defaultShift = shift && ['morning', 'evening'].includes(shift.toLowerCase().trim())
      ? shift.toLowerCase().trim()
      : 'morning';
    const defaultGaushalaName = allGaushalas.length === 1 ? allGaushalas[0].gaushalaName : '';

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFD0D7DE' } },
      left: { style: 'thin', color: { argb: 'FFD0D7DE' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
      right: { style: 'thin', color: { argb: 'FFD0D7DE' } },
    };

    let currentRow = 2;
    if (allCows.length > 0) {
      for (const cow of allCows) {
        const cowDisplayName = (cow.calf_name && cow.calf_name.trim()) || cow.tag_id || '';
        const cowG = allGaushalas.find(
          (g) => g._id.toString() === cow.gaushala_id?.toString()
        );
        const row = worksheet.addRow({
          cow_name: cowDisplayName,
          date: today,
          shift: defaultShift,
          worker: '',
          quantity: '',
          fat: '',
          snf: '',
          remarks: '',
          gaushala: cowG ? cowG.gaushalaName : defaultGaushalaName,
        });
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = thinBorder;
        });
        currentRow++;
      }
    }

    // Set Data Validations on rows 2 to 500
    const maxRowValidation = Math.max(currentRow + 50, 500);
    for (let r = 2; r <= maxRowValidation; r++) {
      // Column A: cow_name
      if (cowRange) {
        worksheet.getCell(`A${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [cowRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Cow',
          error: 'Please select a valid Cow Name from the list.',
        };
      }

      // Column C: shift
      worksheet.getCell(`C${r}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [shiftRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Shift',
        error: 'Please select either morning or evening from the list.',
      };

      // Column D: worker
      if (workerRange) {
        worksheet.getCell(`D${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [workerRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Worker',
          error: 'Please select a valid Milking Worker from the list.',
        };
      }

      // Column I: gaushala
      if (gaushalaRange) {
        worksheet.getCell(`I${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [gaushalaRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Gaushala',
          error: 'Please select a valid Gaushala from the list.',
        };
      }
    }

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Bulk import milk production records from an uploaded Excel or CSV file
   *
   * @param {Object} params
   * @param {Buffer} params.fileBuffer
   * @param {string} params.addedBy User ID
   * @param {string} [params.defaultGaushalaId]
   * @param {Object} [params.user] Authenticated user object
   * @returns {Promise<Object>}
   */
  async importMilkProductionFromExcel(params = {}) {
    const { fileBuffer, addedBy, defaultGaushalaId = null, user = null } = params;

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new AppError('A valid Excel file buffer is required', 400);
    }

    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    } catch (err) {
      throw new AppError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.', 400);
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new AppError('The Excel file does not contain any sheets', 400);
    }

    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    // Filter out completely blank rows
    const rows = rawRows.filter((row) => {
      const nonBlankValues = Object.values(row).filter((v) => {
        if (v === '' || v === null || v === undefined) return false;
        if (typeof v === 'string' && v.trim() === '') return false;
        return true;
      });
      return nonBlankValues.length > 0;
    });

    if (!rows || rows.length === 0) {
      throw new AppError('No data found in uploaded Excel file', 400);
    }

    // Preload DB collections
    const [allGaushalas, allCows, allWorkers] = await Promise.all([
      Gaushala.find().lean(),
      Cow.find({ isDelete: { $ne: true } }).select('tag_id calf_name gaushala_id').lean(),
      Worker.find({ isDelete: { $ne: true }, isActive: true }).select('name gaushalaId').lean(),
    ]);

    const imported = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const row = rows[i];

      // 1. cow_name / tag_id
      const rawCow = String(
        row.cow_name ||
        row['cow_name'] ||
        row['Cow Name'] ||
        row['cow'] ||
        row['Cow'] ||
        row.tag_id ||
        row['Tag ID'] ||
        row['tag'] ||
        row['Cattle ID'] ||
        ''
      ).trim();

      if (!rawCow) {
        errors.push({ row: rowNumber, cow_name: 'N/A', error: 'Cow Name / Tag ID is required' });
        continue;
      }

      // Skip sample placeholder if user left it in
      const cowUpper = rawCow.toUpperCase();
      if (cowUpper === 'SAMPLE' || cowUpper.startsWith('SAMPLE_')) {
        continue;
      }

      // Match Cow:
      // 1. By calf_name (case-insensitive)
      // 2. By tag_id (case-insensitive)
      // 3. By _id
      const matchedCow = allCows.find(
        (c) =>
          (c.calf_name && c.calf_name.toLowerCase().trim() === rawCow.toLowerCase()) ||
          (c.tag_id && c.tag_id.toString().trim().toUpperCase() === cowUpper) ||
          c._id.toString() === rawCow
      );

      if (!matchedCow) {
        errors.push({ row: rowNumber, cow_name: rawCow, error: `Cow '${rawCow}' not found in database` });
        continue;
      }

      // 2. Gaushala
      let targetGaushalaId = defaultGaushalaId;
      const rawGaushala = String(
        row.gaushala || row.gaushalaName || row['Gaushala'] || row['gaushala'] || ''
      ).trim();

      if (rawGaushala) {
        const matchedG = allGaushalas.find(
          (g) =>
            g._id.toString() === rawGaushala ||
            g.gaushalaName.toLowerCase() === rawGaushala.toLowerCase() ||
            g.gaushalaName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_') ===
              rawGaushala.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_')
        );
        if (matchedG) targetGaushalaId = matchedG._id.toString();
      }

      if (!targetGaushalaId && matchedCow.gaushala_id) {
        targetGaushalaId = matchedCow.gaushala_id.toString();
      }

      if (!targetGaushalaId) {
        errors.push({ row: rowNumber, cow_name: rawCow, error: 'Gaushala is required' });
        continue;
      }

      // Role check for gaushala
      if (user && !isSuperAdmin(user) && user.gaushalaId) {
        const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
        if (targetGaushalaId !== userGaushalaStr) {
          const roleLabel = isAdmin(user) ? 'Admin' : 'User';
          errors.push({
            row: rowNumber,
            cow_name: rawCow,
            error: `Access denied: ${roleLabel} can only import milk records for their assigned gaushala`,
          });
          continue;
        }
      }

      // 3. Date
      let rawDate = row.date ?? row['Date'] ?? row['Production Date'] ?? row['production_date'] ?? '';
      let dateStr = '';
      if (rawDate instanceof Date) {
        const y = rawDate.getFullYear();
        const m = String(rawDate.getMonth() + 1).padStart(2, '0');
        const d = String(rawDate.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
      } else if (typeof rawDate === 'string' && rawDate.trim()) {
        const trimmed = rawDate.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          dateStr = trimmed;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
          const [m, d, y] = trimmed.split('/');
          dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
          const [d, m, y] = trimmed.split('-');
          dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }

      if (!dateStr) {
        errors.push({
          row: rowNumber,
          cow_name: rawCow,
          error: 'Valid production date (YYYY-MM-DD) is required',
        });
        continue;
      }

      if (this.isFutureDate(dateStr)) {
        errors.push({
          row: rowNumber,
          cow_name: rawCow,
          error: 'Production date cannot be a future date',
        });
        continue;
      }

      // 4. Shift
      const shift = String(row.shift || row['Shift'] || '').toLowerCase().trim();
      if (!['morning', 'evening'].includes(shift)) {
        errors.push({
          row: rowNumber,
          cow_name: rawCow,
          error: "Shift must be either 'morning' or 'evening'",
        });
        continue;
      }

      // 5. Worker
      const rawWorker = String(
        row.worker || row.worker_name || row['Worker'] || row['Worker Name'] || ''
      ).trim();

      if (!rawWorker) {
        errors.push({ row: rowNumber, cow_name: rawCow, error: 'Worker is required' });
        continue;
      }

      const matchedWorker = allWorkers.find(
        (w) =>
          w._id.toString() === rawWorker ||
          w.name.toLowerCase().trim() === rawWorker.toLowerCase().trim()
      );

      if (!matchedWorker) {
        errors.push({
          row: rowNumber,
          cow_name: rawCow,
          error: `Worker '${rawWorker}' not found or inactive in database`,
        });
        continue;
      }

      // 6. Quantity
      const rawQty = row.quantity ?? row['Quantity'] ?? row['Quantity (L)'] ?? row['milk'] ?? '';
      const quantity = Number(rawQty);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({
          row: rowNumber,
          cow_name: rawCow,
          error: 'Milk quantity must be a valid number greater than 0',
        });
        continue;
      }

      // 7. Fat & SNF & Remarks
      const fat = row.fat !== undefined && row.fat !== '' ? Number(row.fat) || 0 : 0;
      const snf = row.snf !== undefined && row.snf !== '' ? Number(row.snf) || 0 : 0;
      const remarks = String(row.remarks || row['Remarks'] || '').trim();

      // Record production entry
      try {
        const record = await this.recordMilkProduction(
          {
            gaushalaId: targetGaushalaId,
            date: dateStr,
            shift,
            cowId: matchedCow._id,
            workerId: matchedWorker._id,
            quantity,
            fat,
            snf,
            remarks,
          },
          user || { _id: addedBy },
        );

        imported.push({
          row: rowNumber,
          cow_name: matchedCow.calf_name || matchedCow.tag_id,
          tag_id: matchedCow.tag_id,
          date: dateStr,
          shift,
          quantity,
          recordId: record._id,
        });
      } catch (err) {
        errors.push({
          row: rowNumber,
          cow_name: rawCow,
          error: err.message || 'Failed to record milk production',
        });
      }
    }

    return {
      totalRows: rows.length,
      importedCount: imported.length,
      failedCount: errors.length,
      imported,
      errors,
    };
  }
}

module.exports = new MilkService();
