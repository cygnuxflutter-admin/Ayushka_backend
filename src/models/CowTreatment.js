const mongoose = require('mongoose');

const doseMedicineSchema = new mongoose.Schema(
  {
    isStockItem: {
      type: Boolean,
      default: false,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalItem',
      default: null,
    },
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      default: '',
      trim: true,
    },
    unit: {
      type: String,
      default: 'ML',
      trim: true,
    },
    route: {
      type: String,
      enum: ['IM', 'IV', 'SC', 'ORAL', 'TOPICAL', 'INTRAMAMMARY', 'OTHER'],
      default: 'IM',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true },
);

const treatmentDoseSchema = new mongoose.Schema(
  {
    doseNumber: {
      type: Number,
      required: [true, 'Dose number is required'],
      min: 1,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'GIVEN', 'SKIPPED'],
      default: 'PENDING',
    },
    administeredDate: {
      type: Date,
      default: null,
    },
    administeredBy: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    medicines: {
      type: [doseMedicineSchema],
      default: [],
    },
  },
  { _id: true, timestamps: true },
);

const cowTreatmentSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cow',
      required: [true, 'Cow is required'],
      index: true,
    },
    shedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shed',
      default: null,
      index: true,
    },
    treatmentNumber: {
      type: String,
      required: [true, 'Treatment number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    diseaseName: {
      type: String,
      required: [true, 'Disease name is required'],
      trim: true,
      index: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    diagnosisNotes: {
      type: String,
      default: '',
      trim: true,
    },
    severity: {
      type: String,
      enum: ['MILD', 'MODERATE', 'CRITICAL'],
      default: 'MODERATE',
    },
    doctorName: {
      type: String,
      default: '',
      trim: true,
    },
    doctorContact: {
      type: String,
      default: '',
      trim: true,
    },
    doctorType: {
      type: String,
      enum: ['IN_HOUSE', 'VISITING_VET', 'GOVERNMENT', 'OTHER'],
      default: 'VISITING_VET',
    },
    treatmentStartDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    treatmentEndDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: [
        'UNDER_TREATMENT',
        'RECOVERED',
        'CRITICAL',
        'REFERRED',
        'DECEASED',
        'CLOSED',
      ],
      default: 'UNDER_TREATMENT',
      index: true,
    },
    totalDoses: {
      type: Number,
      required: [true, 'Total doses count is required'],
      min: 1,
      default: 1,
    },
    completedDoses: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextDoseDate: {
      type: Date,
      default: null,
      index: true,
    },
    nextDoseNumber: {
      type: Number,
      default: null,
    },
    doses: {
      type: [treatmentDoseSchema],
      default: [],
    },
    prescriptionImages: {
      type: [String],
      default: [],
    },
    recoveryNotes: {
      type: String,
      default: '',
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by user is required'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

cowTreatmentSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

cowTreatmentSchema.virtual('cow', {
  ref: 'Cow',
  localField: 'cowId',
  foreignField: '_id',
  justOne: true,
});

cowTreatmentSchema.virtual('shed', {
  ref: 'Shed',
  localField: 'shedId',
  foreignField: '_id',
  justOne: true,
});

cowTreatmentSchema.virtual('recordedByUser', {
  ref: 'User',
  localField: 'recordedBy',
  foreignField: '_id',
  justOne: true,
});

cowTreatmentSchema.index({ gaushalaId: 1, status: 1, treatmentStartDate: -1 });
cowTreatmentSchema.index({ gaushalaId: 1, nextDoseDate: 1, status: 1 });
cowTreatmentSchema.index({ cowId: 1, treatmentStartDate: -1 });

module.exports =
  mongoose.models.CowTreatment ||
  mongoose.model('CowTreatment', cowTreatmentSchema);
