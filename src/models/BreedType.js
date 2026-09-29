const mongoose = require('mongoose');

const breedTypeSchema = new mongoose.Schema(
  {
    breedName: {
      type: String,
      required: [true, 'Breed name is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

module.exports = mongoose.model('BreedType', breedTypeSchema);