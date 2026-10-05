const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    departmentName: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    departmentCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDelete: {
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

departmentSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

// A Gaushala cannot have duplicate active department names
departmentSchema.index(
  { gaushalaId: 1, departmentName: 1 },
  {
    unique: true,
    partialFilterExpression: { isDelete: false },
    name: 'unique_non_deleted_department_name',
  },
);

module.exports = mongoose.models.Department || mongoose.model('Department', departmentSchema);
