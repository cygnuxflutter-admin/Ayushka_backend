const mongoose = require('mongoose');

const feedStockTransactionSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedItem',
      required: [true, 'Feed item is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['INWARD', 'OUTWARD', 'WASTAGE', 'ADJUSTMENT'],
      required: [true, 'Transaction type is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: ['PURCHASE', 'DONATION', 'DAILY_FEEDING', 'DAMAGED_EXPIRED', 'STOCK_AUDIT', 'OTHER'],
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
    ratePerUnit: {
      type: Number,
      default: 0,
      min: [0, 'Rate per unit cannot be negative'],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    shedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shed',
      default: null,
      index: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
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
    vehicleNumber: {
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

feedStockTransactionSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

feedStockTransactionSchema.virtual('item', {
  ref: 'FeedItem',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true,
});

feedStockTransactionSchema.virtual('shed', {
  ref: 'Shed',
  localField: 'shedId',
  foreignField: '_id',
  justOne: true,
});

feedStockTransactionSchema.virtual('recordedByUser', {
  ref: 'User',
  localField: 'recordedBy',
  foreignField: '_id',
  justOne: true,
});

feedStockTransactionSchema.index({ gaushalaId: 1, transactionDate: -1 });
feedStockTransactionSchema.index({ gaushalaId: 1, itemId: 1, transactionDate: -1 });

module.exports =
  mongoose.models.FeedStockTransaction ||
  mongoose.model('FeedStockTransaction', feedStockTransactionSchema);
