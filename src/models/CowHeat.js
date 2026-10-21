const mongoose = require('mongoose');

const cowHeatSchema = new mongoose.Schema(
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
    heatDate: {
      type: String,
      required: [true, 'Heat observation date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    heatTime: {
      type: String,
      default: '',
      trim: true,
    },
    heatStage: {
      type: String,
      enum: {
        values: ['EARLY', 'STANDING', 'LATE'],
        message: 'Stage must be EARLY, STANDING, or LATE',
      },
      default: 'STANDING',
    },
    heatSigns: {
      type: [String],
      default: [],
    },
    intensity: {
      type: String,
      enum: {
        values: ['MILD', 'MODERATE', 'STRONG'],
        message: 'Intensity must be MILD, MODERATE, or STRONG',
      },
      default: 'MODERATE',
    },
    status: {
      type: String,
      enum: {
        values: ['OBSERVED', 'READY_FOR_MATING', 'MATED', 'MISSED', 'EXPIRED'],
        message: 'Status must be OBSERVED, READY_FOR_MATING, MATED, MISSED, or EXPIRED',
      },
      default: 'READY_FOR_MATING',
      index: true,
    },
    consecutiveHeatCount: {
      type: Number,
      default: 1,
      min: [1, 'Consecutive heat count must be at least 1'],
    },
    nextExpectedHeatDate: {
      type: String,
      default: '',
      trim: true,
    },
    isRepeatHeatAlert: {
      type: Boolean,
      default: false,
      index: true,
    },
    observedByWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
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

cowHeatSchema.virtual('cow', {
  ref: 'Cow',
  localField: 'cowId',
  foreignField: '_id',
  justOne: true,
});

cowHeatSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

cowHeatSchema.virtual('observedByWorker', {
  ref: 'Worker',
  localField: 'observedByWorkerId',
  foreignField: '_id',
  justOne: true,
});

cowHeatSchema.virtual('addedByUser', {
  ref: 'User',
  localField: 'addedBy',
  foreignField: '_id',
  justOne: true,
});

// Indexes for query performance
cowHeatSchema.index({ gaushalaId: 1, heatDate: -1, isDeleted: 1 });
cowHeatSchema.index({ gaushalaId: 1, cowId: 1, heatDate: -1, isDeleted: 1 });
cowHeatSchema.index({ gaushalaId: 1, status: 1, isDeleted: 1 });
cowHeatSchema.index({ gaushalaId: 1, isRepeatHeatAlert: 1, isDeleted: 1 });

module.exports = mongoose.models.CowHeat || mongoose.model('CowHeat', cowHeatSchema);
