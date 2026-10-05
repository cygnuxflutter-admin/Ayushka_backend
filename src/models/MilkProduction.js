const mongoose = require('mongoose');

const milkProductionSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Production date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    shift: {
      type: String,
      enum: {
        values: ['morning', 'evening'],
        message: 'Shift must be either morning or evening',
      },
      required: [true, 'Shift is required'],
      index: true,
    },
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cow',
      required: [true, 'Cow is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: [true, 'Milking worker is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Milk quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    fat: {
      type: Number,
      default: 0,
      min: [0, 'Fat percentage cannot be negative'],
    },
    snf: {
      type: Number,
      default: 0,
      min: [0, 'SNF percentage cannot be negative'],
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

milkProductionSchema.virtual('cow', {
  ref: 'Cow',
  localField: 'cowId',
  foreignField: '_id',
  justOne: true,
});

milkProductionSchema.virtual('worker', {
  ref: 'Worker',
  localField: 'workerId',
  foreignField: '_id',
  justOne: true,
});

milkProductionSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

// Indexes for query performance
milkProductionSchema.index({ gaushalaId: 1, date: 1, shift: 1, isDeleted: 1 });
milkProductionSchema.index({ gaushalaId: 1, cowId: 1, date: 1, shift: 1 });
milkProductionSchema.index({ gaushalaId: 1, date: 1, isDeleted: 1 });

module.exports =
  mongoose.models.MilkProduction || mongoose.model('MilkProduction', milkProductionSchema);
