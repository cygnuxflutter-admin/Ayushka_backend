const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema(
  {
    breed: {
      type: Schema.Types.ObjectId,
      ref: 'BreedType',
    },

    gaushala_id: {
      type: Schema.Types.ObjectId,
      ref: 'Gaushala',
    },

    type: {
      type: Schema.Types.ObjectId,
      ref: 'Type',
    },

    shed_id: {
      type: Schema.Types.ObjectId,
      ref: 'Shed',
      default: null,
    },

    tag_id: {
      type: String,
      unique: true,
    },

    dob: {
      type: String,
    },

    calf_name: {
      type: String,
    },

    isFemale: {
      type: Boolean,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDelete: {
      type: Boolean,
      default: false,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    createdAt: {
      type: Date,
    },

    updatedAt: {
      type: Date,
    },

    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    calf_weight: {
      type: Number,
      default: 0,
    },

    avatarUrl: {
      type: String,
      default: '',
    },

    dam_id: {
      type: Schema.Types.ObjectId,
      ref: 'Cow',
      default: null,
    },

    sair_id: {
      type: Schema.Types.ObjectId,
      ref: 'Cow',
      default: null,
    },

    delivery_time: {
      type: String,
      default: '',
    },

    isDied: {
      type: Boolean,
      default: false,
    },

    send_died_date: {
      type: String,
      default: '',
    },

    purchase_date: {
      type: String,
      default: '',
    },

    remark: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  }
);

module.exports = mongoose.model('Cow', schema);
