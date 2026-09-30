const mongoose = require('mongoose');

const shedSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    shedName: {
      type: String,
      required: [true, 'Shed name is required'],
      trim: true,
      unique: false,
    },
    shedNumber: {
      type: String,
      required: [true, 'Shed number is required'],
      trim: true,
      unique: false,
    },
  },
  {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

shedSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

// A Gaushala cannot have duplicate shed names or numbers within the same gaushala
shedSchema.index({ gaushalaId: 1, shedName: 1 }, { unique: true });
shedSchema.index({ gaushalaId: 1, shedNumber: 1 }, { unique: true });

module.exports = mongoose.models.Shed || mongoose.model('Shed', shedSchema);
