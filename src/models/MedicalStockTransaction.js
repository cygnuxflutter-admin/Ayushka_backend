const mongoose = require('mongoose');

const batchAllocationSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalBatch',
      required: true,
    },
    batchNumber: {
      type: String,
      default: '',
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.001, 'Batch quantity must be greater than zero'],
    },
  },
  { _id: false },
);

const medicalStockTransactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['INWARD', 'OUTWARD', 'EXPIRED_DISPOSAL', 'ADJUSTMENT'],
      required: [true, 'Transaction type is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'PURCHASE',
        'DONATION',
        'TREATMENT',
        'EMERGENCY',
        'EXPIRED_DISPOSAL',
        'STOCK_AUDIT',
        'DAMAGED',
        'OTHER',
      ],
      required: [true, 'Transaction reason is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.001, 'Quantity must be greater than zero'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    batches: {
      type: [batchAllocationSchema],
      default: [],
    },
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cow',
      default: null,
      index: true,
    },
    shedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shed',
      default: null,
      index: true,
    },
    doctorName: {
      type: String,
      trim: true,
      default: '',
    },
    prescribedFor: {
      type: String,
      trim: true,
      default: '',
    },
    supplierOrDonorName: {
      type: String,
      trim: true,
      default: '',
    },
    billOrReceiptNo: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    stockBefore: {
      type: Number,
      default: 0,
    },
    stockAfter: {
      type: Number,
      default: 0,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by user is required'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
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

medicalStockTransactionSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

medicalStockTransactionSchema.virtual('item', {
  ref: 'MedicalItem',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true,
});

medicalStockTransactionSchema.virtual('cow', {
  ref: 'Cow',
  localField: 'cowId',
  foreignField: '_id',
  justOne: true,
});

medicalStockTransactionSchema.virtual('shed', {
  ref: 'Shed',
  localField: 'shedId',
  foreignField: '_id',
  justOne: true,
});

medicalStockTransactionSchema.virtual('recordedByUser', {
  ref: 'User',
  localField: 'recordedBy',
  foreignField: '_id',
  justOne: true,
});

medicalStockTransactionSchema.index({ gaushalaId: 1, transactionDate: -1 });
medicalStockTransactionSchema.index({ gaushalaId: 1, itemId: 1, transactionDate: -1 });

module.exports =
  mongoose.models.MedicalStockTransaction ||
  mongoose.model('MedicalStockTransaction', medicalStockTransactionSchema);
