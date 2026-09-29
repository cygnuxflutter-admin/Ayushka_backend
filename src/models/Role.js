const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

module.exports = mongoose.model('Role', roleSchema);
