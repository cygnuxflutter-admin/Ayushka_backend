const mongoose = require('mongoose');

const gaushalaSchema = new mongoose.Schema(
  {
    gaushalaName: {
      type: String,
      required: [true, 'Gaushala name is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

module.exports = mongoose.model('Gaushala', gaushalaSchema);
