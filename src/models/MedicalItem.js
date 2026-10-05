const mongoose = require('mongoose');

const medicalItemSchema = new mongoose.Schema(
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
      enum: [
        'TABLET',
        'INJECTION',
        'SYRUP',
        'VACCINE',
        'OINTMENT',
        'POWDER',
        'DROPS',
        'BOLUS',
        'ANTIBIOTIC',
        'OTHER',
      ],
      default: 'OTHER',
    },
    unit: {
      type: String,
      enum: [
        'VIAL',
        'AMPOULE',
        'BOTTLE',
        'STRIP',
        'TABLET',
        'BOLUS',
        'TUBE',
        'SACHET',
        'ML',
        'LITER',
        'KG',
        'GM',
        'BOX',
        'PCS',
        'OTHER',
      ],
      default: 'PCS',
      required: [true, 'Unit of measurement is required'],
    },
    totalStock: {
      type: Number,
      default: 0,
      min: [0, 'Total stock cannot be negative'],
    },
    minStockAlert: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock alert cannot be negative'],
    },
    manufacturer: {
      type: String,
      trim: true,
      default: '',
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

medicalItemSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

medicalItemSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
});

medicalItemSchema.index({ gaushalaId: 1, itemName: 1, isDeleted: 1 });

module.exports =
  mongoose.models.MedicalItem || mongoose.model('MedicalItem', medicalItemSchema);
