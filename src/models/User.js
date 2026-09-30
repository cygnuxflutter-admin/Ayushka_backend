const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const SALT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    gaushalaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaushala',
      required: [true, 'Gaushala is required'],
      index: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role is required'],
      index: true,
    },
    emailId: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [EMAIL_PATTERN, 'Enter a valid email address'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    fcmToken: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
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
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.virtual('gaushala', {
  ref: 'Gaushala',
  localField: 'gaushalaId',
  foreignField: '_id',
  justOne: true,
});
userSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true,
});

userSchema.index(
  { emailId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'unique_non_deleted_email',
  },
);
userSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'unique_non_deleted_username',
  },
);

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
});

userSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate'],
  async function hashPasswordInUpdate() {
    const update = this.getUpdate();
    if (!update) {
      return;
    }
    if (Array.isArray(update)) {
      throw new Error('Pipeline updates are not supported for user documents');
    }

    const passwordPaths = [
      [update, 'password'],
      [update.$set, 'password'],
      [update.$setOnInsert, 'password'],
    ];

    for (const [target, key] of passwordPaths) {
      if (typeof target?.[key] === 'string') {
        target[key] = await bcrypt.hash(target[key], SALT_ROUNDS);
      }
    }

    this.setUpdate(update);
  },
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
