const mongoose = require('mongoose');

const feedItemSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    itemCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['GREEN_FODDER', 'DRY_FODDER', 'CONCENTRATE_FEED', 'SUPPLEMENT', 'OTHER'],
      default: 'GREEN_FODDER',
    },
    unit: {
      type: String,
      enum: ['KG', 'TON', 'QUINTAL', 'BAG', 'BUNDLE', 'LITER', 'OTHER'],
      default: 'KG',
      required: [true, 'Unit of measurement is required'],
    },
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    minStockAlert: {
      type: Number,
      default: 50,
      min: [0, 'Min stock alert cannot be negative'],
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: [0, 'Unit price cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
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
    createdBy: {
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

feedItemSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

feedItemSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
});

feedItemSchema.index({ gaushalaId: 1, itemName: 1, isDeleted: 1 });

module.exports = mongoose.models.FeedItem || mongoose.model('FeedItem', feedItemSchema);
