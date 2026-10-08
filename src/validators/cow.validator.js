const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { isSuperAdmin, isAdmin, resolveUserGaushalaId } = require('../utils/roles');

const isValidObjectId = (value) => {
  if (!value) return false;
  if (typeof value === 'object' && mongoose.isValidObjectId(value)) {
    return true;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return mongoose.isValidObjectId(trimmed) && /^[0-9a-fA-F]{24}$/.test(trimmed);
  }
  return false;
};

const validateAddCow = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  // 1. Determine addedBy and gaushala_id (strictly from body / authenticated user)
  const user = req.user;
  const addedBy = user?._id?.toString() || body.addedBy;
  let gaushala_id =
    (body.gaushala_id && typeof body.gaushala_id === 'string' && body.gaushala_id.trim())
      ? body.gaushala_id.trim()
      : ((body.gaushalaId && typeof body.gaushalaId === 'string' && body.gaushalaId.trim())
        ? body.gaushalaId.trim()
        : null);

  // Role-based Gaushala check:
  // - SUPERADMIN: Can add cow to ANY gaushala.
  // - ADMIN & USER: Can ONLY add cow to their own assigned gaushala.
  if (user) {
    if (isSuperAdmin(user)) {
      if (!gaushala_id && user.gaushalaId) {
        gaushala_id = (user.gaushalaId._id || user.gaushalaId).toString();
      }
    } else if (user.gaushalaId) {
      const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
      if (gaushala_id && gaushala_id !== userGaushalaStr) {
        const roleLabel = isAdmin(user) ? 'Admin' : 'User';
        return next(
          new AppError(`Access denied: ${roleLabel} can only add cows to their assigned gaushala`, 403),
        );
      }
      gaushala_id = userGaushalaStr;
    }
  }

  // 2. Validate required fields
  if (!body.breed || (typeof body.breed === 'string' && !body.breed.trim())) {
    return next(new AppError('breed is required', 400));
  }
  if (!gaushala_id || (typeof gaushala_id === 'string' && !gaushala_id.trim())) {
    return next(new AppError('gaushala_id is required', 400));
  }
  if (!body.type || (typeof body.type === 'string' && !body.type.trim())) {
    return next(new AppError('type is required', 400));
  }
  if (
    body.tag_id === undefined ||
    body.tag_id === null ||
    typeof body.tag_id !== 'string' ||
    !body.tag_id.trim()
  ) {
    return next(new AppError('tag_id is required', 400));
  }
  if (
    body.isFemale === undefined ||
    body.isFemale === null ||
    (typeof body.isFemale !== 'boolean' && body.isFemale !== 'true' && body.isFemale !== 'false')
  ) {
    return next(new AppError('isFemale is required and must be a boolean', 400));
  }
  if (!addedBy || (typeof addedBy === 'string' && !addedBy.trim())) {
    return next(new AppError('addedBy is required', 400));
  }

  // 3. Validate ObjectId formats
  const requiredObjectIdFields = [
    { name: 'breed', value: body.breed },
    { name: 'gaushala_id', value: gaushala_id },
    { name: 'type', value: body.type },
    { name: 'addedBy', value: addedBy },
  ];

  for (const field of requiredObjectIdFields) {
    if (!isValidObjectId(field.value)) {
      return next(new AppError('Invalid ObjectId', 400));
    }
  }

  // Optional ObjectId fields (validate format only if provided)
  const optionalObjectIdFields = [
    { name: 'shed_id', value: body.shed_id },
    { name: 'dam_id', value: body.dam_id },
    { name: 'sair_id', value: body.sair_id },
  ];

  for (const field of optionalObjectIdFields) {
    if (
      field.value !== undefined &&
      field.value !== null &&
      field.value !== '' &&
      (typeof field.value !== 'string' || field.value.trim() !== '')
    ) {
      if (!isValidObjectId(field.value)) {
        return next(new AppError('Invalid ObjectId', 400));
      }
    }
  }

  // 4. Sanitize and construct validated data
  // Strictly enforce isDeleted: false, omit createdAt/updatedAt
  const sanitizedData = {
    breed: body.breed,
    gaushala_id,
    type: body.type,
    shed_id:
      body.shed_id && body.shed_id.toString().trim() !== ''
        ? body.shed_id
        : null,
    tag_id: body.tag_id.trim(),
    dob: typeof body.dob === 'string' ? body.dob.trim() : (body.dob || ''),
    calf_name:
      typeof body.calf_name === 'string'
        ? body.calf_name.trim()
        : (body.calf_name || ''),
    isFemale:
      typeof body.isFemale === 'boolean'
        ? body.isFemale
        : body.isFemale === 'true',
    addedBy,
    calf_weight:
      body.calf_weight !== undefined &&
      body.calf_weight !== null &&
      !isNaN(Number(body.calf_weight))
        ? Number(body.calf_weight)
        : 0,
    avatarUrl:
      typeof body.avatarUrl === 'string'
        ? body.avatarUrl.trim()
        : (body.avatarUrl || ''),
    dam_id:
      body.dam_id && body.dam_id.toString().trim() !== ''
        ? body.dam_id
        : null,
    sair_id:
      body.sair_id && body.sair_id.toString().trim() !== ''
        ? body.sair_id
        : null,
    delivery_time:
      typeof body.delivery_time === 'string'
        ? body.delivery_time.trim()
        : (body.delivery_time || ''),
    send_died_date:
      typeof body.send_died_date === 'string'
        ? body.send_died_date.trim()
        : (body.send_died_date || ''),
    purchase_date:
      typeof body.purchase_date === 'string'
        ? body.purchase_date.trim()
        : (body.purchase_date || ''),
    remark:
      typeof body.remark === 'string'
        ? body.remark.trim()
        : (body.remark || ''),
    isDeleted: false,
  };

  req.validatedData = sanitizedData;
  next();
};

const validateUpdateCow = (req, res, next) => {
  const cowId = req.params?.id || req.body?._id || req.body?.id;
  if (!cowId || !isValidObjectId(cowId)) {
    return next(new AppError('Valid cow ID is required', 400));
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body with fields to update is required', 400));
  }

  const user = req.user;
  if (user && !isSuperAdmin(user) && user.gaushalaId) {
    const updatedGaushala = body.gaushala_id || body.gaushalaId;
    if (updatedGaushala && updatedGaushala.toString().trim() !== (user.gaushalaId._id || user.gaushalaId).toString()) {
      const roleLabel = isAdmin(user) ? 'Admin' : 'User';
      return next(new AppError(`Access denied: ${roleLabel} can only update cows within their assigned gaushala`, 403));
    }
  }

  const sanitizedData = {};

  // 1. Validate ObjectId fields if provided
  const objectIdFields = [
    { name: 'breed', value: body.breed },
    { name: 'gaushala_id', value: body.gaushala_id || body.gaushalaId },
    { name: 'type', value: body.type },
  ];

  for (const field of objectIdFields) {
    if (field.value !== undefined && field.value !== null && field.value !== '') {
      if (!isValidObjectId(field.value)) {
        return next(new AppError(`Invalid ${field.name} ObjectId format`, 400));
      }
      sanitizedData[field.name] = field.value.toString().trim();
    }
  }

  // Optional reference fields (nullable)
  const nullableObjectIdFields = [
    { name: 'shed_id', value: body.shed_id },
    { name: 'dam_id', value: body.dam_id },
    { name: 'sair_id', value: body.sair_id },
  ];

  for (const field of nullableObjectIdFields) {
    if (field.value !== undefined) {
      if (field.value === null || field.value === '') {
        sanitizedData[field.name] = null;
      } else {
        if (!isValidObjectId(field.value)) {
          return next(new AppError(`Invalid ${field.name} ObjectId format`, 400));
        }
        sanitizedData[field.name] = field.value.toString().trim();
      }
    }
  }

  // 2. Validate tag_id if provided
  if (body.tag_id !== undefined) {
    if (typeof body.tag_id !== 'string' || !body.tag_id.trim()) {
      return next(new AppError('tag_id cannot be empty', 400));
    }
    sanitizedData.tag_id = body.tag_id.trim();
  }

  // 3. Validate isFemale if provided
  if (body.isFemale !== undefined && body.isFemale !== null) {
    if (typeof body.isFemale === 'boolean') {
      sanitizedData.isFemale = body.isFemale;
    } else if (body.isFemale === 'true' || body.isFemale === 'false') {
      sanitizedData.isFemale = body.isFemale === 'true';
    } else {
      return next(new AppError('isFemale must be a boolean (true or false)', 400));
    }
  }

  // 4. Validate calf_weight if provided
  if (body.calf_weight !== undefined && body.calf_weight !== null) {
    if (isNaN(Number(body.calf_weight))) {
      return next(new AppError('calf_weight must be a valid number', 400));
    }
    sanitizedData.calf_weight = Number(body.calf_weight);
  }

  // 5. String fields
  const stringFields = [
    'calf_name',
    'dob',
    'purchase_date',
    'delivery_time',
    'send_died_date',
    'avatarUrl',
    'remark',
  ];

  for (const key of stringFields) {
    if (body[key] !== undefined) {
      sanitizedData[key] = typeof body[key] === 'string' ? body[key].trim() : String(body[key] || '');
    }
  }

  req.cowId = cowId.toString().trim();
  req.validatedData = sanitizedData;
  next();
};

/**
 * Validator for shed transfer endpoint.
 */
const validateShedTransfer = (req, res, next) => {
  const body = req.body || {};
  const toShedId =
    (body.to_shed_id && typeof body.to_shed_id === 'string' && body.to_shed_id.trim())
      ? body.to_shed_id.trim()
      : ((body.toShedId && typeof body.toShedId === 'string' && body.toShedId.trim())
        ? body.toShedId.trim()
        : ((body.shed_id && typeof body.shed_id === 'string' && body.shed_id.trim())
          ? body.shed_id.trim()
          : ((body.shedId && typeof body.shedId === 'string' && body.shedId.trim())
            ? body.shedId.trim()
            : null)));

  if (!toShedId) {
    return next(new AppError('Destination shed ID (to_shed_id) is required', 400));
  }
  if (!isValidObjectId(toShedId)) {
    return next(new AppError('Invalid destination shed ID format', 400));
  }

  // Gaushala ID
  let gaushalaId =
    (body.gaushalaId && typeof body.gaushalaId === 'string' && body.gaushalaId.trim())
      ? body.gaushalaId.trim()
      : ((body.gaushala_id && typeof body.gaushala_id === 'string' && body.gaushala_id.trim())
        ? body.gaushala_id.trim()
        : null);

  const user = req.user;
  if (user) {
    if (isSuperAdmin(user)) {
      if (!gaushalaId && user.gaushalaId) {
        gaushalaId = (user.gaushalaId._id || user.gaushalaId).toString();
      }
    } else if (user.gaushalaId) {
      const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
      if (gaushalaId && gaushalaId !== userGaushalaStr) {
        const roleLabel = isAdmin(user) ? 'Admin' : 'User';
        return next(
          new AppError(`Access denied: ${roleLabel} can only transfer cows in their assigned gaushala`, 403),
        );
      }
      gaushalaId = userGaushalaStr;
    }
  }

  if (!gaushalaId) {
    return next(new AppError('gaushalaId is required', 400));
  }
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Invalid gaushalaId format', 400));
  }

  // Determine cow IDs: from req.params.id or body
  let cowIds = [];
  if (req.params?.id && isValidObjectId(req.params.id)) {
    cowIds = [req.params.id.trim()];
  } else if (Array.isArray(body.cow_ids) && body.cow_ids.length > 0) {
    cowIds = body.cow_ids;
  } else if (Array.isArray(body.cowIds) && body.cowIds.length > 0) {
    cowIds = body.cowIds;
  } else if (body.cow_id && typeof body.cow_id === 'string' && body.cow_id.trim()) {
    cowIds = [body.cow_id.trim()];
  } else if (body.cowId && typeof body.cowId === 'string' && body.cowId.trim()) {
    cowIds = [body.cowId.trim()];
  }

  if (cowIds.length === 0) {
    return next(new AppError('At least one cow ID (cow_id or cow_ids) is required for transfer', 400));
  }

  for (const id of cowIds) {
    if (!isValidObjectId(id)) {
      return next(new AppError(`Invalid Cow ID format: ${id}`, 400));
    }
  }

  const fromShedId =
    (body.from_shed_id && typeof body.from_shed_id === 'string' && body.from_shed_id.trim())
      ? body.from_shed_id.trim()
      : ((body.fromShedId && typeof body.fromShedId === 'string' && body.fromShedId.trim())
        ? body.fromShedId.trim()
        : null);

  if (fromShedId && !isValidObjectId(fromShedId)) {
    return next(new AppError('Invalid from_shed_id format', 400));
  }

  const transferredBy =
    req.user?._id?.toString() ||
    ((body.transferredBy && typeof body.transferredBy === 'string' && body.transferredBy.trim())
      ? body.transferredBy.trim()
      : ((body.transferred_by && typeof body.transferred_by === 'string' && body.transferred_by.trim())
        ? body.transferred_by.trim()
        : null));

  if (!transferredBy) {
    return next(new AppError('transferredBy user ID is required', 400));
  }
  if (!isValidObjectId(transferredBy)) {
    return next(new AppError('Invalid transferredBy user ID format', 400));
  }

  req.validatedTransferData = {
    cowIds,
    toShedId,
    fromShedId,
    gaushalaId,
    transferredBy,
    transferDate: body.transferDate || body.transfer_date || body.date || new Date(),
    reason: typeof body.reason === 'string' ? body.reason.trim() : (typeof body.remark === 'string' ? body.remark.trim() : ''),
  };

  next();
};

module.exports = {
  validateAddCow,
  validateUpdateCow,
  validateShedTransfer,
  isValidObjectId,
};

