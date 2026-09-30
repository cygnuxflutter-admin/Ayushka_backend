const mongoose = require('mongoose');
const { Schema } = mongoose;

const shedTransferHistorySchema = new Schema(
  {
    cow_id: {
      type: Schema.Types.ObjectId,
      ref: 'Cow',
      required: [true, 'Cow ID is required'],
      index: true,
    },
    from_shed_id: {
      type: Schema.Types.ObjectId,
      ref: 'Shed',
      default: null,
      index: true,
    },
    to_shed_id: {
      type: Schema.Types.ObjectId,
      ref: 'Shed',
      required: [true, 'Destination shed ID (to_shed_id) is required'],
      index: true,
    },
    gaushala_id: {
      type: Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala ID is required'],
      index: true,
    },
    transferredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transferred by user ID is required'],
    },
    transferDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

shedTransferHistorySchema.virtual('cow', {
  ref: 'Cow',
  localField: 'cow_id',
  foreignField: '_id',
  justOne: true,
});

shedTransferHistorySchema.virtual('fromShed', {
  ref: 'Shed',
  localField: 'from_shed_id',
  foreignField: '_id',
  justOne: true,
});

shedTransferHistorySchema.virtual('toShed', {
  ref: 'Shed',
  localField: 'to_shed_id',
  foreignField: '_id',
  justOne: true,
});

shedTransferHistorySchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushala_id',
  foreignField: '_id',
  justOne: true,
});

shedTransferHistorySchema.virtual('transferredByUser', {
  ref: 'User',
  localField: 'transferredBy',
  foreignField: '_id',
  justOne: true,
});

module.exports = mongoose.models.ShedTransferHistory || mongoose.model('ShedTransferHistory', shedTransferHistorySchema);
