const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    typeName: {
      type: String,
      required: [true, 'Type name is required'],
      trim: true,
    },
    isFemale: {
      type: Boolean,
      default: true,
    },
    isMale: {
      type: Boolean,
      default: true,
    },
    tag: {
      type: String,
      enum: ['isFemale', 'isMale', 'both'],
      default: 'both',
    },
  },
  {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

typeSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

typeSchema.virtual('gender').get(function () {
  if (this.isFemale && this.isMale) return 'both';
  if (this.isFemale) return 'female';
  if (this.isMale) return 'male';
  return 'both';
});

// A Gaushala cannot have duplicate type names within the same gaushala
typeSchema.index({ gaushalaId: 1, typeName: 1 }, { unique: true });

module.exports = mongoose.models.Type || mongoose.model('Type', typeSchema);