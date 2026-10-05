const mongoose = require('mongoose');

const milkDisposalSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    milkDate: {
      type: String,
      required: [true, 'Milk date of spoiled stock is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    disposalDate: {
      type: String,
      required: [true, 'Disposal date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Disposed quantity is required'],
      min: [0.01, 'Quantity must be at least 0.01 Liters'],
    },
    reason: {
      type: String,
      enum: {
        values: ['spoiled', 'sour', 'temperature_failure', 'contamination', 'other'],
        message: 'Invalid disposal reason',
      },
      default: 'spoiled',
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

milkDisposalSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

milkDisposalSchema.virtual('worker', {
  ref: 'Worker',
  localField: 'reportedBy',
  foreignField: '_id',
  justOne: true,
});

milkDisposalSchema.index({ gaushalaId: 1, milkDate: 1, isDeleted: 1 });
milkDisposalSchema.index({ gaushalaId: 1, disposalDate: 1, isDeleted: 1 });

module.exports =
  mongoose.models.MilkDisposal || mongoose.model('MilkDisposal', milkDisposalSchema);
