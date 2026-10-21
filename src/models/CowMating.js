const mongoose = require('mongoose');

const cowMatingSchema = new mongoose.Schema(
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
    heatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CowHeat',
      default: null,
      index: true,
    },
    matingDate: {
      type: String,
      required: [true, 'Mating date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    matingTime: {
      type: String,
      default: '',
      trim: true,
    },
    matingType: {
      type: String,
      enum: {
        values: ['NATURAL', 'ARTIFICIAL'],
        message: 'Mating type must be NATURAL or ARTIFICIAL',
      },
      required: [true, 'Mating type is required'],
      index: true,
    },
    // If NATURAL mating:
    bullId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cow',
      default: null,
    },
    bullNameOrTag: {
      type: String,
      default: '',
      trim: true,
    },
    // If ARTIFICIAL insemination (A.I.):
    semenStrawCode: {
      type: String,
      default: '',
      trim: true,
    },
    semenBreedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BreedType',
      default: null,
    },
    semenSource: {
      type: String,
      default: '',
      trim: true,
    },
    inseminatorName: {
      type: String,
      default: '',
      trim: true,
    },
    inseminatorWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: [1, 'Attempt number must be at least 1'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING_PD', 'PREGNANT', 'FAILED', 'CALVED', 'ABORTED'],
        message: 'Status must be PENDING_PD, PREGNANT, FAILED, CALVED, or ABORTED',
      },
      default: 'PENDING_PD',
      index: true,
    },
    isRepeatBreederAlert: {
      type: Boolean,
      default: false,
      index: true,
    },
    expectedPDDate: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    pdDate: {
      type: String,
      default: null,
      trim: true,
    },
    pdResult: {
      type: String,
      enum: {
        values: ['PENDING', 'POSITIVE', 'NEGATIVE'],
        message: 'PD result must be PENDING, POSITIVE, or NEGATIVE',
      },
      default: 'PENDING',
    },
    pdPerformedBy: {
      type: String,
      default: '',
      trim: true,
    },
    expectedCalvingDate: {
      type: String,
      default: null,
      trim: true,
    },
    actualCalvingDate: {
      type: String,
      default: null,
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
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
    addedBy: {
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

cowMatingSchema.virtual('cow', {
  ref: 'Cow',
  localField: 'cowId',
  foreignField: '_id',
  justOne: true,
});

cowMatingSchema.virtual('heat', {
  ref: 'CowHeat',
  localField: 'heatId',
  foreignField: '_id',
  justOne: true,
});

cowMatingSchema.virtual('bull', {
  ref: 'Cow',
  localField: 'bullId',
  foreignField: '_id',
  justOne: true,
});

cowMatingSchema.virtual('semenBreed', {
  ref: 'BreedType',
  localField: 'semenBreedId',
  foreignField: '_id',
  justOne: true,
});

cowMatingSchema.virtual('inseminatorWorker', {
  ref: 'Worker',
  localField: 'inseminatorWorkerId',
  foreignField: '_id',
  justOne: true,
});

cowMatingSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

cowMatingSchema.virtual('addedByUser', {
  ref: 'User',
  localField: 'addedBy',
  foreignField: '_id',
  justOne: true,
});

// Indexes for query performance
cowMatingSchema.index({ gaushalaId: 1, matingDate: -1, isDeleted: 1 });
cowMatingSchema.index({ gaushalaId: 1, cowId: 1, status: 1, isDeleted: 1 });
cowMatingSchema.index({ gaushalaId: 1, isRepeatBreederAlert: 1, isDeleted: 1 });
cowMatingSchema.index({ gaushalaId: 1, expectedPDDate: 1, status: 1, isDeleted: 1 });

module.exports = mongoose.models.CowMating || mongoose.model('CowMating', cowMatingSchema);
