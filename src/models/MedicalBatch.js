const mongoose = require('mongoose');

const medicalBatchSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalItem',
      required: [true, 'Medical item is required'],
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      uppercase: true,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    mfgDate: {
      type: Date,
      default: null,
    },
    initialQuantity: {
      type: Number,
      required: [true, 'Initial quantity is required'],
      min: [0.001, 'Quantity must be greater than zero'],
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Available quantity cannot be negative'],
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: [0, 'Unit price cannot be negative'],
    },
    mrp: {
      type: Number,
      default: 0,
      min: [0, 'MRP cannot be negative'],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXHAUSTED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    supplierName: {
      type: String,
      trim: true,
      default: '',
    },
    billOrInvoiceNo: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    recordedBy: {
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

medicalBatchSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

medicalBatchSchema.virtual('item', {
  ref: 'MedicalItem',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true,
});

medicalBatchSchema.virtual('recorder', {
  ref: 'User',
  localField: 'recordedBy',
  foreignField: '_id',
  justOne: true,
});

medicalBatchSchema.index({ gaushalaId: 1, itemId: 1, status: 1, expiryDate: 1 });
medicalBatchSchema.index({ itemId: 1, availableQuantity: 1, expiryDate: 1 });
medicalBatchSchema.index({ gaushalaId: 1, expiryDate: 1 });

module.exports =
  mongoose.models.MedicalBatch || mongoose.model('MedicalBatch', medicalBatchSchema);
