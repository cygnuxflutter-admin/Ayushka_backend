const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { resolveGaushalaId } = require('../utils/roles');

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

const isValidDateFormat = (str) => {
  if (typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
};

const HEAT_STAGES = ['EARLY', 'STANDING', 'LATE'];
const INTENSITIES = ['MILD', 'MODERATE', 'STRONG'];
const HEAT_STATUSES = ['OBSERVED', 'READY_FOR_MATING', 'MATED', 'MISSED', 'EXPIRED'];

const validateCreateHeat = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  const cowId = body.cowId || body.cow_id;
  if (!isValidObjectId(cowId)) {
    return next(new AppError('Valid cowId is required', 400));
  }

  if (!body.heatDate || !isValidDateFormat(body.heatDate)) {
    return next(new AppError('Valid heat observation date (YYYY-MM-DD) is required', 400));
  }

  let heatStage = 'STANDING';
  if (body.heatStage) {
    const stage = String(body.heatStage).trim().toUpperCase();
    if (!HEAT_STAGES.includes(stage)) {
      return next(new AppError(`heatStage must be one of: ${HEAT_STAGES.join(', ')}`, 400));
    }
    heatStage = stage;
  }

  let intensity = 'MODERATE';
  if (body.intensity) {
    const intVal = String(body.intensity).trim().toUpperCase();
    if (!INTENSITIES.includes(intVal)) {
      return next(new AppError(`intensity must be one of: ${INTENSITIES.join(', ')}`, 400));
    }
    intensity = intVal;
  }

  let status = 'READY_FOR_MATING';
  if (body.status) {
    const stVal = String(body.status).trim().toUpperCase();
    if (!HEAT_STATUSES.includes(stVal)) {
      return next(new AppError(`status must be one of: ${HEAT_STATUSES.join(', ')}`, 400));
    }
    status = stVal;
  }

  const observedByWorkerId = body.observedByWorkerId || body.workerId || null;
  if (observedByWorkerId && !isValidObjectId(observedByWorkerId)) {
    return next(new AppError('Invalid observedByWorkerId format', 400));
  }

  req.validatedData = {
    gaushalaId,
    cowId,
    heatDate: body.heatDate.trim(),
    heatTime: (body.heatTime || '').trim(),
    heatStage,
    intensity,
    status,
    heatSigns: Array.isArray(body.heatSigns) ? body.heatSigns : [],
    observedByWorkerId,
    remarks: (body.remarks || '').trim(),
  };

  next();
};

const validateUpdateHeat = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body is required', 400));
  }

  if (body.heatDate && !isValidDateFormat(body.heatDate)) {
    return next(new AppError('Valid heatDate (YYYY-MM-DD) is required', 400));
  }

  if (body.heatStage) {
    const stage = String(body.heatStage).trim().toUpperCase();
    if (!HEAT_STAGES.includes(stage)) {
      return next(new AppError(`heatStage must be one of: ${HEAT_STAGES.join(', ')}`, 400));
    }
  }

  if (body.intensity) {
    const intVal = String(body.intensity).trim().toUpperCase();
    if (!INTENSITIES.includes(intVal)) {
      return next(new AppError(`intensity must be one of: ${INTENSITIES.join(', ')}`, 400));
    }
  }

  if (body.status) {
    const stVal = String(body.status).trim().toUpperCase();
    if (!HEAT_STATUSES.includes(stVal)) {
      return next(new AppError(`status must be one of: ${HEAT_STATUSES.join(', ')}`, 400));
    }
  }

  const observedByWorkerId = body.observedByWorkerId || body.workerId;
  if (observedByWorkerId && !isValidObjectId(observedByWorkerId)) {
    return next(new AppError('Invalid observedByWorkerId format', 400));
  }

  next();
};

module.exports = {
  isValidObjectId,
  isValidDateFormat,
  validateCreateHeat,
  validateUpdateHeat,
};
