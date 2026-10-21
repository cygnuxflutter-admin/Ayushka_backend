const mongoose = require('mongoose');
const CowHeat = require('../models/CowHeat');
const CowMating = require('../models/CowMating');
const Cow = require('../models/cow.model');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

class HeatService {
  /**
   * Helper to add days to a YYYY-MM-DD date string
   */
  addDays(dateStr, days) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /**
   * Helper to format current date as YYYY-MM-DD
   */
  getTodayDateString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Record a new cow heat observation
   */
  async createHeatRecord(data, user) {
    const {
      gaushalaId,
      cowId,
      heatDate,
      heatTime = '',
      heatStage = 'STANDING',
      heatSigns = [],
      intensity = 'MODERATE',
      status = 'READY_FOR_MATING',
      observedByWorkerId = null,
      remarks = '',
    } = data;

    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid gaushalaId is required', 400);
    }
    if (!cowId || !mongoose.isValidObjectId(cowId)) {
      throw new AppError('Valid cowId is required', 400);
    }
    if (!heatDate || !/^\d{4}-\d{2}-\d{2}$/.test(heatDate.trim())) {
      throw new AppError('Valid heat observation date (YYYY-MM-DD) is required', 400);
    }

    // 1. Verify Cow
    const cow = await Cow.findOne({
      _id: cowId,
      gaushala_id: gaushalaId,
      isDelete: false,
    });

    if (!cow) {
      throw new AppError('Cow not found in this gaushala or has been deleted', 404);
    }
    if (cow.isDied) {
      throw new AppError('Cannot record heat: Cow is recorded as deceased', 400);
    }
    if (cow.isFemale === false) {
      throw new AppError('Heat can only be recorded for female cows', 400);
    }

    // 2. Calculate consecutive heat count since last pregnancy/calving
    const lastSuccessfulMating = await CowMating.findOne({
      gaushalaId,
      cowId,
      status: { $in: ['PREGNANT', 'CALVED'] },
      isDeleted: false,
    }).sort({ matingDate: -1 });

    const heatFilter = {
      gaushalaId,
      cowId,
      isDeleted: false,
    };
    if (lastSuccessfulMating && lastSuccessfulMating.matingDate) {
      heatFilter.heatDate = { $gt: lastSuccessfulMating.matingDate };
    }

    const previousHeatsCount = await CowHeat.countDocuments(heatFilter);
    const consecutiveHeatCount = previousHeatsCount + 1;
    const isRepeatHeatAlert = consecutiveHeatCount >= 3;

    // 3. Calculate next expected heat (~21 days later)
    const nextExpectedHeatDate = this.addDays(heatDate, 21);

    // 4. Create Heat Record
    const heatRecord = await CowHeat.create({
      gaushalaId,
      cowId,
      heatDate: heatDate.trim(),
      heatTime: (heatTime || '').trim(),
      heatStage,
      heatSigns: Array.isArray(heatSigns) ? heatSigns : [],
      intensity,
      status,
      consecutiveHeatCount,
      nextExpectedHeatDate,
      isRepeatHeatAlert,
      observedByWorkerId: observedByWorkerId || null,
      remarks: (remarks || '').trim(),
      addedBy: user?._id || null,
    });

    // 5. Update Cow breedingStatus to IN_HEAT
    cow.breedingStatus = 'IN_HEAT';
    await cow.save();

    // 6. Trigger Admin Alert if 3 or more consecutive heats without conception
    if (isRepeatHeatAlert) {
      const cowTag = cow.tag_id || 'N/A';
      await Notification.create({
        gaushalaId,
        cowId: cow._id,
        heatId: heatRecord._id,
        title: `Frequent Heat Alert: Cow #${cowTag}`,
        message: `Cow #${cowTag} has been recorded in heat ${consecutiveHeatCount} consecutive times without conception. Veterinary examination recommended.`,
        type: 'HEAT_ALERT',
        isRead: false,
      }).catch((err) => {
        console.error('Failed to create frequent heat notification:', err);
      });
    }

    return CowHeat.findById(heatRecord._id)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('observedByWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');
  }

  /**
   * Update an existing heat record
   */
  async updateHeatRecord(id, data, user) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid heat record ID is required', 400);
    }

    const heat = await CowHeat.findOne({ _id: id, isDeleted: false });
    if (!heat) {
      throw new AppError('Heat record not found', 404);
    }

    const {
      heatDate,
      heatTime,
      heatStage,
      heatSigns,
      intensity,
      status,
      observedByWorkerId,
      remarks,
    } = data;

    if (heatDate && /^\d{4}-\d{2}-\d{2}$/.test(heatDate.trim())) {
      heat.heatDate = heatDate.trim();
      heat.nextExpectedHeatDate = this.addDays(heat.heatDate, 21);
    }
    if (heatTime !== undefined) heat.heatTime = (heatTime || '').trim();
    if (heatStage) heat.heatStage = heatStage;
    if (Array.isArray(heatSigns)) heat.heatSigns = heatSigns;
    if (intensity) heat.intensity = intensity;
    if (observedByWorkerId !== undefined) heat.observedByWorkerId = observedByWorkerId || null;
    if (remarks !== undefined) heat.remarks = (remarks || '').trim();

    if (status && status !== heat.status) {
      heat.status = status;
      // If status changed to EXPIRED or MISSED, reset cow breedingStatus to OPEN if currently IN_HEAT
      if (['EXPIRED', 'MISSED'].includes(status)) {
        const cow = await Cow.findById(heat.cowId);
        if (cow && cow.breedingStatus === 'IN_HEAT') {
          cow.breedingStatus = 'OPEN';
          await cow.save();
        }
      }
    }

    await heat.save();

    return CowHeat.findById(heat._id)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('observedByWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');
  }

  /**
   * Get list of heat records with filtering and pagination
   */
  async getHeatList(params = {}) {
    const {
      gaushalaId,
      cowId,
      status,
      heatStage,
      intensity,
      isRepeatHeatAlert,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = params;

    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid gaushalaId is required', 400);
    }

    const filter = {
      gaushalaId: new mongoose.Types.ObjectId(gaushalaId),
      isDeleted: false,
    };

    if (cowId && mongoose.isValidObjectId(cowId)) {
      filter.cowId = new mongoose.Types.ObjectId(cowId);
    }

    if (status) {
      filter.status = status.trim().toUpperCase();
    }

    if (heatStage) {
      filter.heatStage = heatStage.trim().toUpperCase();
    }

    if (intensity) {
      filter.intensity = intensity.trim().toUpperCase();
    }

    if (isRepeatHeatAlert !== undefined && isRepeatHeatAlert !== '') {
      filter.isRepeatHeatAlert = isRepeatHeatAlert === 'true' || isRepeatHeatAlert === true;
    }

    if (startDate || endDate) {
      filter.heatDate = {};
      if (startDate) filter.heatDate.$gte = startDate.trim();
      if (endDate) filter.heatDate.$lte = endDate.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      CowHeat.find(filter)
        .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
        .populate('observedByWorker', 'name employeeId mobileNumber')
        .populate('addedByUser', 'name username')
        .sort({ heatDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CowHeat.countDocuments(filter),
    ]);

    return {
      records,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get single heat record by ID
   */
  async getHeatById(id, gaushalaId = null) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid heat record ID is required', 400);
    }

    const filter = { _id: id, isDeleted: false };
    if (gaushalaId && mongoose.isValidObjectId(gaushalaId)) {
      filter.gaushalaId = gaushalaId;
    }

    const record = await CowHeat.findOne(filter)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('observedByWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');

    if (!record) {
      throw new AppError('Heat record not found', 404);
    }

    return record;
  }

  /**
   * Soft delete a heat record
   */
  async deleteHeatRecord(id, user) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid heat record ID is required', 400);
    }

    const record = await CowHeat.findOne({ _id: id, isDeleted: false });
    if (!record) {
      throw new AppError('Heat record not found', 404);
    }

    record.isDeleted = true;
    record.deletedBy = user?._id || null;
    await record.save();

    // Reset cow breedingStatus if it was IN_HEAT
    const cow = await Cow.findById(record.cowId);
    if (cow && cow.breedingStatus === 'IN_HEAT') {
      cow.breedingStatus = 'OPEN';
      await cow.save();
    }

    return { message: 'Heat record deleted successfully' };
  }

  /**
   * Get cows currently active in heat (ready for mating)
   */
  async getActiveHeats(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      return [];
    }

    return CowHeat.find({
      gaushalaId,
      status: { $in: ['READY_FOR_MATING', 'OBSERVED'] },
      isDeleted: false,
    })
      .populate('cow', 'tag_id calf_name shed_id avatarUrl breedingStatus')
      .populate('observedByWorker', 'name mobileNumber')
      .sort({ heatDate: -1, createdAt: -1 });
  }

  /**
   * Get cows with 3 or more consecutive heat cycles without conception
   */
  async getRepeatHeatAlerts(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      return [];
    }

    return CowHeat.find({
      gaushalaId,
      isRepeatHeatAlert: true,
      status: { $ne: 'MATED' },
      isDeleted: false,
    })
      .populate('cow', 'tag_id calf_name shed_id avatarUrl breedingStatus')
      .sort({ heatDate: -1, createdAt: -1 });
  }
}

module.exports = new HeatService();
