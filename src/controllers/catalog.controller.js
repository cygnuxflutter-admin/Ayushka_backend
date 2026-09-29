const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const createCatalogController = (Model, field, userReference, label) => {
  const fields = Array.isArray(field) ? field : [field];
  const readValues = (body) => {
    const values = {};
    for (const fieldName of fields) {
      const value = body?.[fieldName];
      if (typeof value !== 'string' || !value.trim()) {
        throw new AppError(`${fieldName} is required`, 400);
      }
      values[fieldName] = value.trim();
    }
    return values;
  };

  return {
    list: asyncHandler(async (req, res) => {
      const records = await Model.find().sort({ [fields[0]]: 1 });
      res.status(200).json({ success: true, data: records });
    }),

    create: asyncHandler(async (req, res) => {
      const record = await Model.create(readValues(req.body));
      res.status(201).json({ success: true, data: record });
    }),

    get: asyncHandler(async (req, res) => {
      const record = await Model.findById(req.params.id);
      if (!record) {
        throw new AppError(`${label} not found`, 404);
      }
      res.status(200).json({ success: true, data: record });
    }),

    update: asyncHandler(async (req, res) => {
      const record = await Model.findByIdAndUpdate(
        req.params.id,
        readValues(req.body),
        { new: true, runValidators: true },
      );
      if (!record) {
        throw new AppError(`${label} not found`, 404);
      }
      res.status(200).json({ success: true, data: record });
    }),

    remove: asyncHandler(async (req, res) => {
      const record = await Model.findById(req.params.id);
      if (!record) {
        throw new AppError(`${label} not found`, 404);
      }

      const referencedUser = userReference
        ? await User.exists({ [userReference]: record._id })
        : null;
      if (referencedUser) {
        throw new AppError(`${label} is in use by one or more users`, 409);
      }

      await record.deleteOne();
      res.status(200).json({ success: true, data: record });
    }),
  };
};

module.exports = createCatalogController;