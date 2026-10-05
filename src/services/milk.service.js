const mongoose = require('mongoose');
const MilkProduction = require('../models/MilkProduction');
const MilkDistribution = require('../models/MilkDistribution');
const MilkDisposal = require('../models/MilkDisposal');
const Cow = require('../models/cow.model');
const Worker = require('../models/Worker');
const Gaushala = require('../models/Gaushala');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

class MilkService {
  /**
   * Helper: Get today's date formatted as YYYY-MM-DD
   */
  getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
}

module.exports = new MilkService();
