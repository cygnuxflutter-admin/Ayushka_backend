const mongoose = require('mongoose');
const CowMating = require('../models/CowMating');
const CowHeat = require('../models/CowHeat');
const Cow = require('../models/cow.model');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

class MatingService {
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
   * Record a new mating (Natural Service or Artificial Insemination)
   */
  async recordMating(data, user) {
    const {
      gaushalaId,
      cowId,
      heatId = null,
      matingDate,
      matingTime = '',
      matingType,
      bullId = null,
      bullNameOrTag = '',
      semenStrawCode = '',
      semenBreedId = null,
      semenSource = '',
      inseminatorName = '',
      inseminatorWorkerId = null,
      remarks = '',
    } = data;

    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid gaushalaId is required', 400);
    }
    if (!cowId || !mongoose.isValidObjectId(cowId)) {
      throw new AppError('Valid cowId is required', 400);
    }
    if (!matingDate || !/^\d{4}-\d{2}-\d{2}$/.test(matingDate.trim())) {
      throw new AppError('Valid mating date (YYYY-MM-DD) is required', 400);
    }
    if (!['NATURAL', 'ARTIFICIAL'].includes((matingType || '').trim().toUpperCase())) {
      throw new AppError('matingType must be either NATURAL or ARTIFICIAL', 400);
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
      throw new AppError('Cannot record mating: Cow is recorded as deceased', 400);
    }
    if (cow.isFemale === false) {
      throw new AppError('Mating can only be recorded for female cows', 400);
    }

    // 2. If heatId provided, link and mark heat as MATED
    if (heatId && mongoose.isValidObjectId(heatId)) {
      const heat = await CowHeat.findOne({
        _id: heatId,
        cowId,
        gaushalaId,
        isDeleted: false,
      });
      if (heat) {
        heat.status = 'MATED';
        await heat.save();
      }
    }

    // 3. Calculate attemptNumber since last successful pregnancy or calving
    const lastSuccessful = await CowMating.findOne({
      gaushalaId,
      cowId,
      status: { $in: ['PREGNANT', 'CALVED'] },
      isDeleted: false,
    }).sort({ matingDate: -1 });

    const attemptFilter = {
      gaushalaId,
      cowId,
      isDeleted: false,
    };
    if (lastSuccessful && lastSuccessful.matingDate) {
      attemptFilter.matingDate = { $gt: lastSuccessful.matingDate };
    }

    const previousAttempts = await CowMating.countDocuments(attemptFilter);
    const attemptNumber = previousAttempts + 1;
    const isRepeatBreederAlert = attemptNumber >= 3;

    // 4. Calculate expected PD date (~60 days after mating)
    const expectedPDDate = this.addDays(matingDate.trim(), 60);

    // 5. Create CowMating record
    const matingRecord = await CowMating.create({
      gaushalaId,
      cowId,
      heatId: heatId && mongoose.isValidObjectId(heatId) ? heatId : null,
      matingDate: matingDate.trim(),
      matingTime: (matingTime || '').trim(),
      matingType: matingType.trim().toUpperCase(),
      bullId: bullId && mongoose.isValidObjectId(bullId) ? bullId : null,
      bullNameOrTag: (bullNameOrTag || '').trim(),
      semenStrawCode: (semenStrawCode || '').trim(),
      semenBreedId: semenBreedId && mongoose.isValidObjectId(semenBreedId) ? semenBreedId : null,
      semenSource: (semenSource || '').trim(),
      inseminatorName: (inseminatorName || '').trim(),
      inseminatorWorkerId:
        inseminatorWorkerId && mongoose.isValidObjectId(inseminatorWorkerId)
          ? inseminatorWorkerId
          : null,
      attemptNumber,
      status: 'PENDING_PD',
      isRepeatBreederAlert,
      expectedPDDate,
      remarks: (remarks || '').trim(),
      addedBy: user?._id || null,
    });

    // 6. Update Cow breedingStatus to MATED
    cow.breedingStatus = 'MATED';
    await cow.save();

    // 7. Trigger Admin Alert if 3 or more failed/repeat matings (Repeat Breeder syndrome)
    if (isRepeatBreederAlert) {
      const cowTag = cow.tag_id || 'N/A';
      await Notification.create({
        gaushalaId,
        cowId: cow._id,
        matingId: matingRecord._id,
        title: `Repeat Breeder Alert: Cow #${cowTag}`,
        message: `Cow #${cowTag} has reached ${attemptNumber} mating attempts without successful conception. Infertility / veterinary examination recommended.`,
        type: 'MATING_ALERT',
        isRead: false,
      }).catch((err) => {
        console.error('Failed to create repeat breeder notification:', err);
      });
    }

    return CowMating.findById(matingRecord._id)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('heat', 'heatDate heatStage status')
      .populate('bull', 'tag_id calf_name')
      .populate('semenBreed', 'breedName')
      .populate('inseminatorWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');
  }

  /**
   * Update Pregnancy Diagnosis (PD) status
   */
  async updatePDStatus(id, pdData, user) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid mating record ID is required', 400);
    }

    const mating = await CowMating.findOne({ _id: id, isDeleted: false });
    if (!mating) {
      throw new AppError('Mating record not found', 404);
    }

    const { pdResult, pdDate, pdPerformedBy = '', remarks = '' } = pdData;

    const normalizedResult = (pdResult || '').trim().toUpperCase();
    if (!['POSITIVE', 'NEGATIVE'].includes(normalizedResult)) {
      throw new AppError('pdResult must be either POSITIVE (Pregnant) or NEGATIVE (Failed)', 400);
    }

    const examDate = (pdDate && /^\d{4}-\d{2}-\d{2}$/.test(pdDate.trim()))
      ? pdDate.trim()
      : this.getTodayDateString();

    mating.pdDate = examDate;
    mating.pdResult = normalizedResult;
    mating.pdPerformedBy = (pdPerformedBy || '').trim();
    if (remarks) mating.remarks = `${mating.remarks ? mating.remarks + '; ' : ''}${remarks.trim()}`;

    const cow = await Cow.findById(mating.cowId);

    if (normalizedResult === 'POSITIVE') {
      mating.status = 'PREGNANT';
      // Expected calving date is ~282 days after mating date
      mating.expectedCalvingDate = this.addDays(mating.matingDate, 282);

      if (cow) {
        cow.breedingStatus = 'PREGNANT';
        await cow.save();
      }

      // Create Admin Notification for confirmed pregnancy
      if (cow) {
        const cowTag = cow.tag_id || 'N/A';
        await Notification.create({
          gaushalaId: mating.gaushalaId,
          cowId: cow._id,
          matingId: mating._id,
          title: `Pregnancy Confirmed: Cow #${cowTag}`,
          message: `Cow #${cowTag} has been confirmed pregnant! Expected calving date: ${mating.expectedCalvingDate}.`,
          type: 'MATING_ALERT',
          isRead: false,
        }).catch((err) => {
          console.error('Failed to create pregnancy confirmed notification:', err);
        });
      }
    } else {
      mating.status = 'FAILED';
      mating.expectedCalvingDate = null;

      if (cow) {
        cow.breedingStatus = 'OPEN';
        await cow.save();
      }

      // Check if cow now has 3+ failed matings
      const failedCount = await CowMating.countDocuments({
        gaushalaId: mating.gaushalaId,
        cowId: mating.cowId,
        status: 'FAILED',
        isDeleted: false,
      });

      if (failedCount >= 3) {
        mating.isRepeatBreederAlert = true;
        const cowTag = cow?.tag_id || 'N/A';
        await Notification.create({
          gaushalaId: mating.gaushalaId,
          cowId: mating.cowId,
          matingId: mating._id,
          title: `Repeat Breeder Alert: Cow #${cowTag}`,
          message: `Cow #${cowTag} has failed ${failedCount} mating attempts. Clinical inspection required.`,
          type: 'MATING_ALERT',
          isRead: false,
        }).catch((err) => {
          console.error('Failed to create repeat breeder alert notification:', err);
        });
      }
    }

    await mating.save();

    return CowMating.findById(mating._id)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('heat', 'heatDate heatStage status')
      .populate('bull', 'tag_id calf_name')
      .populate('semenBreed', 'breedName')
      .populate('inseminatorWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');
  }

  /**
   * Record calving / delivery of calf
   */
  async recordCalving(id, calvingData, user) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid mating record ID is required', 400);
    }

    const mating = await CowMating.findOne({ _id: id, isDeleted: false });
    if (!mating) {
      throw new AppError('Mating record not found', 404);
    }

    const { actualCalvingDate, remarks = '' } = calvingData;
    const deliveryDate = (actualCalvingDate && /^\d{4}-\d{2}-\d{2}$/.test(actualCalvingDate.trim()))
      ? actualCalvingDate.trim()
      : this.getTodayDateString();

    mating.actualCalvingDate = deliveryDate;
    mating.status = 'CALVED';
    if (remarks) mating.remarks = `${mating.remarks ? mating.remarks + '; ' : ''}${remarks.trim()}`;
    await mating.save();

    const cow = await Cow.findById(mating.cowId);
    if (cow) {
      cow.breedingStatus = 'CALVED';
      await cow.save();
    }

    return CowMating.findById(mating._id)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('heat', 'heatDate heatStage status')
      .populate('bull', 'tag_id calf_name')
      .populate('semenBreed', 'breedName')
      .populate('inseminatorWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');
  }

  /**
   * Update mating details
   */
  async updateMating(id, data, user) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid mating record ID is required', 400);
    }

    const mating = await CowMating.findOne({ _id: id, isDeleted: false });
    if (!mating) {
      throw new AppError('Mating record not found', 404);
    }

    const {
      matingDate,
      matingTime,
      matingType,
      bullId,
      bullNameOrTag,
      semenStrawCode,
      semenBreedId,
      semenSource,
      inseminatorName,
      inseminatorWorkerId,
      remarks,
    } = data;

    if (matingDate && /^\d{4}-\d{2}-\d{2}$/.test(matingDate.trim())) {
      mating.matingDate = matingDate.trim();
      mating.expectedPDDate = this.addDays(mating.matingDate, 60);
      if (mating.status === 'PREGNANT') {
        mating.expectedCalvingDate = this.addDays(mating.matingDate, 282);
      }
    }
    if (matingTime !== undefined) mating.matingTime = (matingTime || '').trim();
    if (matingType && ['NATURAL', 'ARTIFICIAL'].includes(matingType.trim().toUpperCase())) {
      mating.matingType = matingType.trim().toUpperCase();
    }
    if (bullId !== undefined) {
      mating.bullId = bullId && mongoose.isValidObjectId(bullId) ? bullId : null;
    }
    if (bullNameOrTag !== undefined) mating.bullNameOrTag = (bullNameOrTag || '').trim();
    if (semenStrawCode !== undefined) mating.semenStrawCode = (semenStrawCode || '').trim();
    if (semenBreedId !== undefined) {
      mating.semenBreedId =
        semenBreedId && mongoose.isValidObjectId(semenBreedId) ? semenBreedId : null;
    }
    if (semenSource !== undefined) mating.semenSource = (semenSource || '').trim();
    if (inseminatorName !== undefined) mating.inseminatorName = (inseminatorName || '').trim();
    if (inseminatorWorkerId !== undefined) {
      mating.inseminatorWorkerId =
        inseminatorWorkerId && mongoose.isValidObjectId(inseminatorWorkerId)
          ? inseminatorWorkerId
          : null;
    }
    if (remarks !== undefined) mating.remarks = (remarks || '').trim();

    await mating.save();

    return CowMating.findById(mating._id)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('heat', 'heatDate heatStage status')
      .populate('bull', 'tag_id calf_name')
      .populate('semenBreed', 'breedName')
      .populate('inseminatorWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');
  }

  /**
   * Get list of mating records with filtering and pagination
   */
  async getMatingList(params = {}) {
    const {
      gaushalaId,
      cowId,
      status,
      matingType,
      isRepeatBreederAlert,
      startDate,
      endDate,
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

    if (matingType) {
      filter.matingType = matingType.trim().toUpperCase();
    }

    if (isRepeatBreederAlert !== undefined && isRepeatBreederAlert !== '') {
      filter.isRepeatBreederAlert =
        isRepeatBreederAlert === 'true' || isRepeatBreederAlert === true;
    }

    if (startDate || endDate) {
      filter.matingDate = {};
      if (startDate) filter.matingDate.$gte = startDate.trim();
      if (endDate) filter.matingDate.$lte = endDate.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      CowMating.find(filter)
        .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
        .populate('heat', 'heatDate heatStage status')
        .populate('bull', 'tag_id calf_name')
        .populate('semenBreed', 'breedName')
        .populate('inseminatorWorker', 'name employeeId mobileNumber')
        .populate('addedByUser', 'name username')
        .sort({ matingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CowMating.countDocuments(filter),
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
   * Get single mating record by ID
   */
  async getMatingById(id, gaushalaId = null) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid mating record ID is required', 400);
    }

    const filter = { _id: id, isDeleted: false };
    if (gaushalaId && mongoose.isValidObjectId(gaushalaId)) {
      filter.gaushalaId = gaushalaId;
    }

    const record = await CowMating.findOne(filter)
      .populate('cow', 'tag_id calf_name shed_id avatarUrl isFemale breedingStatus')
      .populate('heat', 'heatDate heatStage status')
      .populate('bull', 'tag_id calf_name')
      .populate('semenBreed', 'breedName')
      .populate('inseminatorWorker', 'name employeeId mobileNumber')
      .populate('addedByUser', 'name username');

    if (!record) {
      throw new AppError('Mating record not found', 404);
    }

    return record;
  }

  /**
   * Soft delete a mating record
   */
  async deleteMatingRecord(id, user) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid mating record ID is required', 400);
    }

    const record = await CowMating.findOne({ _id: id, isDeleted: false });
    if (!record) {
      throw new AppError('Mating record not found', 404);
    }

    record.isDeleted = true;
    record.deletedBy = user?._id || null;
    await record.save();

    return { message: 'Mating record deleted successfully' };
  }

  /**
   * Get repeat breeder alerts (cows with 3 or more failed matings)
   */
  async getRepeatBreederAlerts(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      return [];
    }

    return CowMating.find({
      gaushalaId,
      isRepeatBreederAlert: true,
      status: { $nin: ['PREGNANT', 'CALVED'] },
      isDeleted: false,
    })
      .populate('cow', 'tag_id calf_name shed_id avatarUrl breedingStatus')
      .populate('inseminatorWorker', 'name mobileNumber')
      .sort({ matingDate: -1, createdAt: -1 });
  }

  /**
   * Get matings due for Pregnancy Diagnosis (PD) check
   */
  async getPendingPDAlerts(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      return [];
    }

    const today = this.getTodayDateString();

    return CowMating.find({
      gaushalaId,
      status: 'PENDING_PD',
      expectedPDDate: { $lte: today },
      isDeleted: false,
    })
      .populate('cow', 'tag_id calf_name shed_id avatarUrl breedingStatus')
      .sort({ expectedPDDate: 1 });
  }
}

module.exports = new MatingService();
