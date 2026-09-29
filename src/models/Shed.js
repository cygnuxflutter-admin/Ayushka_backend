const mongoose = require('mongoose');

const shedSchema = new mongoose.Schema(
  {
    shedName: {
      type: String,
      required: [true, 'Shed name is required'],
      trim: true,
      unique: true,
    },
    shedNumber: {
      type: String,
      required: [true, 'Shed number is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

module.exports = mongoose.model('Shed', shedSchema);
