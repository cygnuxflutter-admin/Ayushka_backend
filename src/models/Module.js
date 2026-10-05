const mongoose = require('mongoose');

const subModuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sub-module name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Sub-module code is required'],
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
});

const moduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Module name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Module code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    subModules: [subModuleSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

module.exports = mongoose.model('Module', moduleSchema);
