const mongoose = require('mongoose');

const permissionItemSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
    },
    moduleCode: {
      type: String,
      required: [true, 'Module code is required'],
      trim: true,
      uppercase: true,
    },
    subModuleCode: {
      type: String,
      required: [true, 'Sub-module code is required'],
      trim: true,
      uppercase: true,
    },
    canView: {
      type: Boolean,
      default: false,
    },
    canAdd: {
      type: Boolean,
      default: false,
    },
    canEdit: {
      type: Boolean,
      default: false,
    },
    canDelete: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const userPermissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    permissions: [permissionItemSchema],
  },
  {
    timestamps: true,
    id: false,
  },
);

module.exports = mongoose.model('UserPermission', userPermissionSchema);
