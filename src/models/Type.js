const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema(
  {
    typeName: {
      type: String,
      required: [true, 'Type name is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

module.exports = mongoose.model('Type', typeSchema);