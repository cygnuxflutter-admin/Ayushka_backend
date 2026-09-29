const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

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

  // 1. Determine addedBy (prioritize authenticated user, fallback to request body)
  const addedBy = req.user?._id?.toString() || body.addedBy;

  // 2. Validate required fields
  if (!body.breed || (typeof body.breed === 'string' && !body.breed.trim())) {
    return next(new AppError('breed is required', 400));
  }
  if (!body.gaushala_id || (typeof body.gaushala_id === 'string' && !body.gaushala_id.trim())) {
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
    { name: 'gaushala_id', value: body.gaushala_id },
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
    gaushala_id: body.gaushala_id,
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

module.exports = {
  validateAddCow,
  isValidObjectId,
};
