const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Gaushala = require('../models/Gaushala');
const Cow = require('../models/cow.model');
const { isSuperAdmin, isAdmin } = require('../utils/roles');

const createCatalogController = (Model, field, userReference, label, options = {}) => {
  const fields = Array.isArray(field) ? field : [field];

  const readValues = (body, req) => {
    const values = {};
    for (const fieldName of fields) {
      let value = body?.[fieldName];
      if ((fieldName === 'gaushalaId' || fieldName === 'gaushala_id') && (!value || typeof value !== 'string' || !value.trim())) {
        value = body?.gaushalaId || body?.gaushala_id || (req ? resolveGaushalaId(req, body) : null);
      }
      if (typeof value !== 'string' || !value.trim()) {
        throw new AppError(`${fieldName} is required`, 400);
      }
      values[fieldName] = value.trim();
    }
    return values;
  };

  const resolveGaushalaId = (req, body) => {
    // Explicitly provided in body (or query/param)
    if (body?.gaushalaId && typeof body.gaushalaId === 'string' && body.gaushalaId.trim()) {
      return body.gaushalaId.trim();
    }
    if (body?.gaushala_id && typeof body.gaushala_id === 'string' && body.gaushala_id.trim()) {
      return body.gaushala_id.trim();
    }
    if (req?.params?.gaushalaId) return req.params.gaushalaId;
    if (req?.params?.gaushala_id) return req.params.gaushala_id;
    if (req?.query?.gaushalaId) return req.query.gaushalaId;
    if (req?.query?.gaushala_id) return req.query.gaushala_id;
    return null;
  };

  const getFilterGaushalaId = (req) => {
    // 1. Route param
    if (req?.params?.gaushalaId && typeof req.params.gaushalaId === 'string' && req.params.gaushalaId.trim()) {
      return req.params.gaushalaId.trim();
    }
    if (req?.params?.gaushala_id && typeof req.params.gaushala_id === 'string' && req.params.gaushala_id.trim()) {
      return req.params.gaushala_id.trim();
    }
    // 2. Query param
    if (req?.query?.gaushalaId && typeof req.query.gaushalaId === 'string' && req.query.gaushalaId.trim()) {
      return req.query.gaushalaId.trim();
    }
    if (req?.query?.gaushala_id && typeof req.query.gaushala_id === 'string' && req.query.gaushala_id.trim()) {
      return req.query.gaushala_id.trim();
    }
    return null;
  };

  return {
    list: asyncHandler(async (req, res) => {
      const query = {};
      let gaushala = getFilterGaushalaId(req);

      const user = req.user;
      if (user && !isSuperAdmin(user) && user.gaushalaId && (Model.schema.paths.gaushalaId || Model.schema.paths.gaushala_id)) {
        const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
        if (gaushala && gaushala !== userGaushalaStr) {
          const roleLabel = isAdmin(user) ? 'Admin' : 'User';
          throw new AppError(`Access denied: ${roleLabel} can only access their assigned gaushala`, 403);
        }
        gaushala = userGaushalaStr;
      }

      if (options?.requireGaushala && !gaushala) {
        throw new AppError('Gaushala Id is required', 400);
      }

      if (gaushala) {
        if (!mongoose.Types.ObjectId.isValid(gaushala)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Gaushala Id format',
            data: [],
          });
        }
        const exists = await Gaushala.findById(gaushala);
        if (!exists) {
          throw new AppError('Gaushala not found', 404);
        }
        if (Model.schema.paths.gaushalaId) query.gaushalaId = gaushala;
        if (Model.schema.paths.gaushala_id) query.gaushala_id = gaushala;
      }

      const sortField = fields.find((f) => f !== 'gaushalaId' && f !== 'gaushala_id') || fields[0];
      let findQuery = Model.find(query).sort({ [sortField]: 1 });
      if (Model.schema.paths.gaushalaId) {
        findQuery = findQuery.populate('gaushalaId', 'gaushalaName');
      }
      if (Model.schema.paths.gaushala_id) {
        findQuery = findQuery.populate('gaushala_id', 'gaushalaName');
      }

      const records = await findQuery;
      res.status(200).json({ success: true, data: records });
    }),

    create: asyncHandler(async (req, res) => {
      const values = readValues(req.body, req);

      const user = req.user;
      if (user && !isSuperAdmin(user) && user.gaushalaId && (Model.schema.paths.gaushalaId || Model.schema.paths.gaushala_id)) {
        const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
        const providedGaushala = values.gaushalaId || values.gaushala_id;
        if (providedGaushala && providedGaushala !== userGaushalaStr) {
          const roleLabel = isAdmin(user) ? 'Admin' : 'User';
          throw new AppError(`Access denied: ${roleLabel} can only create ${label} in their assigned gaushala`, 403);
        }
        if (Model.schema.paths.gaushalaId) values.gaushalaId = userGaushalaStr;
        if (Model.schema.paths.gaushala_id) values.gaushala_id = userGaushalaStr;
      }
      
      if (Model.schema.paths.gaushalaId) {
        const gaushala = values.gaushalaId || values.gaushala_id || resolveGaushalaId(req, req.body);
        if (!gaushala) throw new AppError('gaushalaId is required', 400);
        if (!mongoose.Types.ObjectId.isValid(gaushala)) {
          throw new AppError('Invalid gaushalaId format', 400);
        }
        const exists = await Gaushala.findById(gaushala);
        if (!exists) {
          throw new AppError('Gaushala not found', 404);
        }
        values.gaushalaId = gaushala;
      }
      if (Model.schema.paths.gaushala_id) {
        const gaushala = values.gaushala_id || values.gaushalaId || resolveGaushalaId(req, req.body);
        if (!gaushala) throw new AppError('gaushala_id is required', 400);
        if (!mongoose.Types.ObjectId.isValid(gaushala)) {
          throw new AppError('Invalid gaushala_id format', 400);
        }
        const exists = await Gaushala.findById(gaushala);
        if (!exists) {
          throw new AppError('Gaushala not found', 404);
        }
        values.gaushala_id = gaushala;
      }

      // Check duplicate within the same gaushala if gaushalaId is used
      if (Model.schema.paths.gaushalaId && values.gaushalaId) {
        const nameField = fields.find((f) => f !== 'gaushalaId' && f !== 'gaushala_id');
        if (nameField && values[nameField]) {
          const duplicate = await Model.findOne({
            gaushalaId: values.gaushalaId,
            [nameField]: new RegExp(`^${values[nameField].trim()}$`, 'i'),
          });
          if (duplicate) {
            throw new AppError(`${label} with name '${values[nameField]}' already exists in this Gaushala`, 409);
          }
        }
      }

      let record = await Model.create(values);
      if (Model.schema.paths.gaushalaId) {
        record = await record.populate('gaushalaId', 'gaushalaName');
      }
      if (Model.schema.paths.gaushala_id) {
        record = await record.populate('gaushala_id', 'gaushalaName');
      }
      res.status(201).json({ success: true, data: record });
    }),

    get: asyncHandler(async (req, res) => {
      let findQuery = Model.findById(req.params.id);
      if (Model.schema.paths.gaushalaId) {
        findQuery = findQuery.populate('gaushalaId', 'gaushalaName');
      }
      if (Model.schema.paths.gaushala_id) {
        findQuery = findQuery.populate('gaushala_id', 'gaushalaName');
      }
      const record = await findQuery;
      if (!record) {
        throw new AppError(`${label} not found`, 404);
      }

      const user = req.user;
      if (user && !isSuperAdmin(user) && user.gaushalaId && (Model.schema.paths.gaushalaId || Model.schema.paths.gaushala_id)) {
        const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
        const recordGaushala = (record.gaushalaId?._id || record.gaushalaId || record.gaushala_id?._id || record.gaushala_id)?.toString();
        if (recordGaushala && recordGaushala !== userGaushalaStr) {
          const roleLabel = isAdmin(user) ? 'Admin' : 'User';
          throw new AppError(`Access denied: ${roleLabel} can only view ${label} within their assigned gaushala`, 403);
        }
      }

      res.status(200).json({ success: true, data: record });
    }),

    update: asyncHandler(async (req, res) => {
      const values = readValues(req.body, req);

      const user = req.user;
      if (user && !isSuperAdmin(user) && user.gaushalaId && (Model.schema.paths.gaushalaId || Model.schema.paths.gaushala_id)) {
        const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
        const existingRecord = await Model.findById(req.params.id);
        if (!existingRecord) {
          throw new AppError(`${label} not found`, 404);
        }
        const recordGaushala = (existingRecord.gaushalaId?._id || existingRecord.gaushalaId || existingRecord.gaushala_id?._id || existingRecord.gaushala_id)?.toString();
        if (recordGaushala && recordGaushala !== userGaushalaStr) {
          const roleLabel = isAdmin(user) ? 'Admin' : 'User';
          throw new AppError(`Access denied: ${roleLabel} can only update ${label} within their assigned gaushala`, 403);
        }
        const providedGaushala = values.gaushalaId || values.gaushala_id;
        if (providedGaushala && providedGaushala !== userGaushalaStr) {
          const roleLabel = isAdmin(user) ? 'Admin' : 'User';
          throw new AppError(`Access denied: ${roleLabel} cannot change gaushala`, 403);
        }
        if (Model.schema.paths.gaushalaId) values.gaushalaId = userGaushalaStr;
        if (Model.schema.paths.gaushala_id) values.gaushala_id = userGaushalaStr;
      }
      
      if (Model.schema.paths.gaushalaId) {
        const gaushala = values.gaushalaId || values.gaushala_id || resolveGaushalaId(req, req.body);
        if (gaushala) {
          if (!mongoose.Types.ObjectId.isValid(gaushala)) {
            throw new AppError('Invalid gaushalaId format', 400);
          }
          const exists = await Gaushala.findById(gaushala);
          if (!exists) {
            throw new AppError('Gaushala not found', 404);
          }
          values.gaushalaId = gaushala;
        }
      }
      if (Model.schema.paths.gaushala_id) {
        const gaushala = values.gaushala_id || values.gaushalaId || resolveGaushalaId(req, req.body);
        if (gaushala) {
          if (!mongoose.Types.ObjectId.isValid(gaushala)) {
            throw new AppError('Invalid gaushala_id format', 400);
          }
          const exists = await Gaushala.findById(gaushala);
          if (!exists) {
            throw new AppError('Gaushala not found', 404);
          }
          values.gaushala_id = gaushala;
        }
      }

      // Check duplicate within the same gaushala if gaushalaId is used
      if (Model.schema.paths.gaushalaId && values.gaushalaId) {
        const nameField = fields.find((f) => f !== 'gaushalaId' && f !== 'gaushala_id');
        if (nameField && values[nameField]) {
          const duplicate = await Model.findOne({
            gaushalaId: values.gaushalaId,
            [nameField]: new RegExp(`^${values[nameField].trim()}$`, 'i'),
            _id: { $ne: req.params.id },
          });
          if (duplicate) {
            throw new AppError(`${label} with name '${values[nameField]}' already exists in this Gaushala`, 409);
          }
        }
      }

      let findQuery = Model.findByIdAndUpdate(
        req.params.id,
        values,
        { new: true, runValidators: true },
      );
      if (Model.schema.paths.gaushalaId) {
        findQuery = findQuery.populate('gaushalaId', 'gaushalaName');
      }
      if (Model.schema.paths.gaushala_id) {
        findQuery = findQuery.populate('gaushala_id', 'gaushalaName');
      }
      const record = await findQuery;
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

      const user = req.user;
      if (user && !isSuperAdmin(user) && user.gaushalaId && (Model.schema.paths.gaushalaId || Model.schema.paths.gaushala_id)) {
        const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
        const recordGaushala = (record.gaushalaId?._id || record.gaushalaId || record.gaushala_id?._id || record.gaushala_id)?.toString();
        if (recordGaushala && recordGaushala !== userGaushalaStr) {
          const roleLabel = isAdmin(user) ? 'Admin' : 'User';
          throw new AppError(`Access denied: ${roleLabel} can only delete ${label} within their assigned gaushala`, 403);
        }
      }

      const referencedUser = userReference
        ? await User.exists({ [userReference]: record._id })
        : null;
      if (referencedUser) {
        throw new AppError(`${label} is in use by one or more users`, 409);
      }

      // If deleting a Shed, check if any cow is currently assigned to it
      if (label === 'Shed') {
        const cowInShed = await Cow.exists({ shed_id: record._id, isDeleted: false });
        if (cowInShed) {
          throw new AppError('Shed is in use by one or more cows', 409);
        }
      }

      await record.deleteOne();
      res.status(200).json({ success: true, data: record });
    }),
  };
};

module.exports = createCatalogController;