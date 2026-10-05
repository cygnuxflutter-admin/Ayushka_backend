const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['TREATMENT_DOSE', 'MEDICAL_STOCK_ALERT', 'GENERAL', 'MILK_PRODUCTION_ALERT'],
      default: 'TREATMENT_DOSE',
      index: true,
    },
    treatmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CowTreatment',
      default: null,
      index: true,
    },
    cowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cow',
      default: null,
      index: true,
    },
    doseNumber: {
      type: Number,
      default: null,
    },
    totalDoses: {
      type: Number,
      default: null,
    },
    scheduledDate: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

notificationSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.virtual('cow', {
  ref: 'Cow',
  localField: 'cowId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.virtual('treatment', {
  ref: 'CowTreatment',
  localField: 'treatmentId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.virtual('recipient', {
  ref: 'User',
  localField: 'recipientUserId',
  foreignField: '_id',
  justOne: true,
});

notificationSchema.index({ gaushalaId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ treatmentId: 1, doseNumber: 1, isDeleted: 1 });

module.exports =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
