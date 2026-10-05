const mongoose = require('mongoose');
const CowTreatment = require('../models/CowTreatment');
const Notification = require('../models/Notification');
const Cow = require('../models/cow.model');
const Shed = require('../models/Shed');
const Gaushala = require('../models/Gaushala');
const MedicalItem = require('../models/MedicalItem');
const notificationService = require('./notification.service');
const AppError = require('../utils/AppError');

class TreatmentService {
  /**
   * Generate sequential treatment number: TRT-YYYYMMDD-XXXX
   */
  async generateTreatmentNumber(gaushalaId) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TRT-${dateStr}-`;

    const countToday = await CowTreatment.countDocuments({
      treatmentNumber: new RegExp(`^${prefix}`),
    });

    const sequence = String(countToday + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Helper to format medicine list (validates MedicalItem if isStockItem is true)
   */
  async sanitizeMedicines(medicines = []) {
    if (!Array.isArray(medicines)) return [];

    const formatted = [];
    for (const med of medicines) {
      if (!med || !med.medicineName || !med.medicineName.trim()) {
        continue;
      }

      let itemId = null;
      let medicineName = med.medicineName.trim();
      const isStockItem = Boolean(med.isStockItem);

      if (isStockItem && med.itemId && mongoose.isValidObjectId(med.itemId)) {
        const itemDoc = await MedicalItem.findById(med.itemId);
        if (itemDoc) {
          itemId = itemDoc._id;
          medicineName = itemDoc.itemName;
        }
      }

      formatted.push({
        isStockItem: Boolean(itemId),
        itemId: itemId,
        medicineName,
        dosage: med.dosage?.trim() || '',
        unit: med.unit?.trim().toUpperCase() || 'ML',
        route: med.route?.trim().toUpperCase() || 'IM',
        notes: med.notes?.trim() || '',
      });
    }

    return formatted;
  }

  /**
   * Create a new treatment record with multi-dose scheduling
   */
  async createTreatment(data, user) {
    const {
      gaushalaId,
      cowId,
      diseaseName,
      symptoms = [],
      diagnosisNotes = '',
      severity = 'MODERATE',
      doctorName = '',
      doctorContact = '',
      doctorType = 'VISITING_VET',
      treatmentStartDate = new Date(),
      totalDoses = 1,
      doseIntervalDays = 1,
      scheduledDoseDates = [],
      medicines = [],
      prescriptionImages = [],
    } = data;

    // Validate Gaushala
    const gaushala = await Gaushala.findById(gaushalaId);
    if (!gaushala) {
      throw new AppError('Gaushala not found', 404);
    }

    // Validate Cow
    const cow = await Cow.findOne({ _id: cowId, isDelete: false });
    if (!cow) {
      throw new AppError('Cow not found or has been deleted', 404);
    }

    if (cow.isDied) {
      throw new AppError('Cannot start treatment for a cow marked as deceased', 400);
    }

    const sanitizedMedicines = await this.sanitizeMedicines(medicines);
    const totalDosesCount = Math.max(1, Number(totalDoses) || 1);
    const startDate = new Date(treatmentStartDate);

    // Build doses array
    const dosesArray = [];

    // Dose 1 is given immediately at treatment initiation
    dosesArray.push({
      doseNumber: 1,
      scheduledDate: startDate,
      status: 'GIVEN',
      administeredDate: startDate,
      administeredBy: doctorName || user?.name || 'Veterinary Staff',
      notes: 'Initial dose administered upon case registration',
      medicines: sanitizedMedicines,
    });

    // Schedule subsequent doses if totalDoses > 1
    const intervalDays = Math.max(1, Number(doseIntervalDays) || 1);
    for (let i = 2; i <= totalDosesCount; i++) {
      let nextDate;
      if (
        Array.isArray(scheduledDoseDates) &&
        scheduledDoseDates[i - 2] &&
        !isNaN(new Date(scheduledDoseDates[i - 2]).getTime())
      ) {
        nextDate = new Date(scheduledDoseDates[i - 2]);
      } else {
        nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + (i - 1) * intervalDays);
      }

      dosesArray.push({
        doseNumber: i,
        scheduledDate: nextDate,
        status: 'PENDING',
        administeredDate: null,
        administeredBy: '',
        notes: '',
        medicines: sanitizedMedicines, // inherit prescribed medicines by default
      });
    }

    const nextDose = dosesArray.find((d) => d.status === 'PENDING');
    const treatmentNumber = await this.generateTreatmentNumber(gaushalaId);

    const treatment = await CowTreatment.create({
      gaushalaId,
      cowId,
      shedId: cow.shed_id || null,
      treatmentNumber,
      diseaseName: diseaseName.trim(),
      symptoms: Array.isArray(symptoms) ? symptoms.map((s) => s.trim()).filter(Boolean) : [],
      diagnosisNotes: diagnosisNotes?.trim() || '',
      severity,
      doctorName: doctorName?.trim() || '',
      doctorContact: doctorContact?.trim() || '',
      doctorType,
      treatmentStartDate: startDate,
      treatmentEndDate: null,
      status: 'UNDER_TREATMENT',
      totalDoses: totalDosesCount,
      completedDoses: 1, // Dose 1 given
      nextDoseDate: nextDose ? nextDose.scheduledDate : null,
      nextDoseNumber: nextDose ? nextDose.doseNumber : null,
      doses: dosesArray,
      prescriptionImages: Array.isArray(prescriptionImages) ? prescriptionImages : [],
      recordedBy: user?._id || data.recordedBy,
    });

    // If next dose is scheduled for today, trigger notification check
    if (nextDose && notificationService.getEndOfDay(nextDose.scheduledDate) <= notificationService.getEndOfDay()) {
      await notificationService.checkAndGenerateDoseAlerts(gaushalaId);
    }

    return this.getTreatmentById(treatment._id);
  }

  /**
   * Administer a scheduled dose (e.g. Dose 2, 3...)
   */
  async administerDose(treatmentId, doseNumber, doseData = {}, user) {
    const treatment = await CowTreatment.findOne({
      _id: treatmentId,
      isDeleted: false,
    });

    if (!treatment) {
      throw new AppError('Treatment record not found', 404);
    }

    const targetDoseNum = Number(doseNumber);
    const doseIndex = treatment.doses.findIndex((d) => d.doseNumber === targetDoseNum);
    if (doseIndex === -1) {
      throw new AppError(`Dose ${targetDoseNum} does not exist in this treatment plan`, 404);
    }

    const dose = treatment.doses[doseIndex];
    if (dose.status === 'GIVEN') {
      throw new AppError(`Dose ${targetDoseNum} has already been marked as given`, 400);
    }

    let doseMedicines = dose.medicines;
    if (Array.isArray(doseData.medicines) && doseData.medicines.length > 0) {
      doseMedicines = await this.sanitizeMedicines(doseData.medicines);
    }

    dose.status = 'GIVEN';
    dose.administeredDate = doseData.administeredDate ? new Date(doseData.administeredDate) : new Date();
    dose.administeredBy = doseData.administeredBy?.trim() || user?.name || treatment.doctorName || 'Veterinary Staff';
    dose.notes = doseData.notes?.trim() || dose.notes || 'Dose successfully administered';
    dose.medicines = doseMedicines;

    // Recalculate completed doses
    treatment.completedDoses = treatment.doses.filter((d) => d.status === 'GIVEN').length;

    // Find next pending dose
    const nextPendingDose = treatment.doses.find((d) => d.status === 'PENDING');
    if (nextPendingDose) {
      treatment.nextDoseDate = nextPendingDose.scheduledDate;
      treatment.nextDoseNumber = nextPendingDose.doseNumber;
    } else {
      // All doses completed
      treatment.nextDoseDate = null;
      treatment.nextDoseNumber = null;

      if (doseData.markCompleted !== false) {
        treatment.status = 'RECOVERED';
        treatment.treatmentEndDate = new Date();
        treatment.recoveryNotes =
          doseData.recoveryNotes?.trim() ||
          `All ${treatment.totalDoses} doses completed. Cow recovered successfully.`;
      }
    }

    await treatment.save();

    // Mark any existing in-app notification for this dose as read
    await Notification.updateMany(
      {
        treatmentId: treatment._id,
        doseNumber: targetDoseNum,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    return this.getTreatmentById(treatment._id);
  }

  /**
   * Get single treatment details
   */
  async getTreatmentById(id) {
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new AppError('Valid treatment ID is required', 400);
    }

    const treatment = await CowTreatment.findOne({ _id: id, isDeleted: false })
      .populate('cowId', 'tag_id calf_name shed_id dob avatarUrl isFemale calf_weight')
      .populate('shedId', 'shedName shedNumber')
      .populate('gaushalaId', 'gaushalaName')
      .populate('recordedBy', 'name emailId username')
      .populate('doses.medicines.itemId', 'itemName itemCode category unit totalStock');

    if (!treatment) {
      throw new AppError('Treatment record not found', 404);
    }

    return treatment;
  }

  /**
   * Get list of treatments with filtering & pagination
   */
  async getTreatments(query = {}) {
    const {
      gaushalaId,
      cowId,
      status,
      severity,
      diseaseName,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = query;

    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    const filter = {
      gaushalaId,
      isDeleted: false,
    };

    if (cowId && mongoose.isValidObjectId(cowId)) {
      filter.cowId = cowId;
    }

    if (status && typeof status === 'string' && status.trim()) {
      filter.status = status.trim().toUpperCase();
    }

    if (severity && typeof severity === 'string' && severity.trim()) {
      filter.severity = severity.trim().toUpperCase();
    }

    if (diseaseName && typeof diseaseName === 'string' && diseaseName.trim()) {
      filter.diseaseName = new RegExp(diseaseName.trim(), 'i');
    }

    if (startDate || endDate) {
      filter.treatmentStartDate = {};
      if (startDate) {
        filter.treatmentStartDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.treatmentStartDate.$lte = end;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { treatmentNumber: searchRegex },
        { diseaseName: searchRegex },
        { doctorName: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    let mongoQuery = CowTreatment.find(filter)
      .populate('cowId', 'tag_id calf_name shed_id avatarUrl')
      .populate('shedId', 'shedName shedNumber')
      .populate('recordedBy', 'name emailId')
      .sort({ createdAt: -1 });

    if (Number(limit) > 0) {
      mongoQuery = mongoQuery.skip(skip).limit(Number(limit));
    }

    const [treatments, total] = await Promise.all([
      mongoQuery.exec(),
      CowTreatment.countDocuments(filter),
    ]);

    return {
      treatments,
      pagination:
        Number(limit) > 0
          ? {
              total,
              page: Number(page),
              limit: Number(limit),
              totalPages: Math.ceil(total / Number(limit)),
            }
          : null,
      count: treatments.length,
    };
  }

  /**
   * Update treatment record details
   */
  async updateTreatment(id, updateData = {}, user) {
    const treatment = await CowTreatment.findOne({ _id: id, isDeleted: false });
    if (!treatment) {
      throw new AppError('Treatment record not found', 404);
    }

    if (updateData.diseaseName !== undefined) {
      treatment.diseaseName = updateData.diseaseName.trim();
    }
    if (updateData.symptoms !== undefined && Array.isArray(updateData.symptoms)) {
      treatment.symptoms = updateData.symptoms.map((s) => s.trim()).filter(Boolean);
    }
    if (updateData.diagnosisNotes !== undefined) {
      treatment.diagnosisNotes = updateData.diagnosisNotes.trim();
    }
    if (updateData.severity !== undefined) {
      treatment.severity = updateData.severity.trim().toUpperCase();
    }
    if (updateData.doctorName !== undefined) {
      treatment.doctorName = updateData.doctorName.trim();
    }
    if (updateData.doctorContact !== undefined) {
      treatment.doctorContact = updateData.doctorContact.trim();
    }
    if (updateData.doctorType !== undefined) {
      treatment.doctorType = updateData.doctorType.trim().toUpperCase();
    }
    if (updateData.recoveryNotes !== undefined) {
      treatment.recoveryNotes = updateData.recoveryNotes.trim();
    }
    if (updateData.prescriptionImages !== undefined && Array.isArray(updateData.prescriptionImages)) {
      treatment.prescriptionImages = updateData.prescriptionImages;
    }

    await treatment.save();
    return this.getTreatmentById(treatment._id);
  }

  /**
   * Change treatment status (e.g. RECOVERED, CRITICAL, DECEASED, CLOSED)
   */
  async updateStatus(id, { status, recoveryNotes = '', markCowDied = false }, user) {
    const treatment = await CowTreatment.findOne({ _id: id, isDeleted: false });
    if (!treatment) {
      throw new AppError('Treatment record not found', 404);
    }

    const newStatus = status.trim().toUpperCase();
    treatment.status = newStatus;

    if (newStatus === 'RECOVERED' || newStatus === 'CLOSED') {
      treatment.treatmentEndDate = new Date();
      if (recoveryNotes) {
        treatment.recoveryNotes = recoveryNotes.trim();
      }
      treatment.nextDoseDate = null;
      treatment.nextDoseNumber = null;
    }

    if (newStatus === 'DECEASED' || markCowDied) {
      treatment.treatmentEndDate = new Date();
      treatment.status = 'DECEASED';
      treatment.nextDoseDate = null;
      treatment.nextDoseNumber = null;

      // Update Cow record to marked as died
      await Cow.findByIdAndUpdate(treatment.cowId, {
        $set: {
          isDied: true,
          send_died_date: new Date().toISOString(),
          remark: `Deceased during treatment (${treatment.diseaseName})`,
        },
      });
    }

    await treatment.save();
    return this.getTreatmentById(treatment._id);
  }

  /**
   * Get all treatments that have doses due today
   */
  async getTodayDueDoses(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    const endOfToday = notificationService.getEndOfDay();

    return CowTreatment.find({
      gaushalaId,
      status: 'UNDER_TREATMENT',
      isDeleted: false,
      nextDoseDate: { $ne: null, $lte: endOfToday },
    })
      .populate('cowId', 'tag_id calf_name shed_id avatarUrl')
      .populate('shedId', 'shedName shedNumber')
      .sort({ nextDoseDate: 1 });
  }

  /**
   * Dashboard summary of treatment module
   */
  async getDashboardSummary(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    const endOfToday = notificationService.getEndOfDay();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      activeCases,
      criticalCases,
      todayDueDoses,
      recoveredThisMonth,
      totalTreatments,
    ] = await Promise.all([
      CowTreatment.countDocuments({
        gaushalaId,
        status: 'UNDER_TREATMENT',
        isDeleted: false,
      }),
      CowTreatment.countDocuments({
        gaushalaId,
        status: 'UNDER_TREATMENT',
        severity: 'CRITICAL',
        isDeleted: false,
      }),
      CowTreatment.countDocuments({
        gaushalaId,
        status: 'UNDER_TREATMENT',
        isDeleted: false,
        nextDoseDate: { $ne: null, $lte: endOfToday },
      }),
      CowTreatment.countDocuments({
        gaushalaId,
        status: 'RECOVERED',
        treatmentEndDate: { $gte: startOfMonth },
        isDeleted: false,
      }),
      CowTreatment.countDocuments({
        gaushalaId,
        isDeleted: false,
      }),
    ]);

    return {
      activeCases,
      criticalCases,
      todayDueDoses,
      recoveredThisMonth,
      totalTreatments,
    };
  }

  /**
   * Soft delete treatment record
   */
  async deleteTreatment(id, user) {
    const treatment = await CowTreatment.findOne({ _id: id, isDeleted: false });
    if (!treatment) {
      throw new AppError('Treatment record not found', 404);
    }

    treatment.isDeleted = true;
    treatment.deletedBy = user?._id || null;
    await treatment.save();

    return treatment;
  }
}

module.exports = new TreatmentService();
