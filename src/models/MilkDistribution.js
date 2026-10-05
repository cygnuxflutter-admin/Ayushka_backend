const mongoose = require('mongoose');

const milkDistributionSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    milkDate: {
      type: String,
      required: [true, 'Milk production date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    entryDate: {
      type: String,
      required: [true, 'Distribution entry date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    shift: {
      type: String,
      enum: {
        values: ['morning', 'evening', 'all'],
        message: 'Shift must be morning, evening, or all',
      },
      required: [true, 'Shift is required'],
      index: true,
    },
    recipientType: {
      type: String,
      enum: {
        values: ['customer', 'dairy_plant', 'calf_feeding', 'staff', 'other'],
        message: 'Invalid recipient type',
      },
      default: 'customer',
    },
    recipientName: {
      type: String,
      default: '',
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    quantity: {
      type: Number,
      required: [true, 'Distributed quantity is required'],
      min: [0.01, 'Quantity must be at least 0.01 Liters'],
    },
    ratePerLiter: {
      type: Number,
      default: 0,
      min: [0, 'Rate cannot be negative'],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    isDelayedEntry: {
      type: Boolean,
      default: false,
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

milkDistributionSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

milkDistributionSchema.virtual('customer', {
  ref: 'User',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true,
});

milkDistributionSchema.index({ gaushalaId: 1, milkDate: 1, isDeleted: 1 });
milkDistributionSchema.index({ gaushalaId: 1, entryDate: 1, isDeleted: 1 });

module.exports =
  mongoose.models.MilkDistribution || mongoose.model('MilkDistribution', milkDistributionSchema);
