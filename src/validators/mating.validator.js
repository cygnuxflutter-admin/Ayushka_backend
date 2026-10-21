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

const MATING_TYPES = ['NATURAL', 'ARTIFICIAL'];
const MATING_STATUSES = ['PENDING_PD', 'PREGNANT', 'FAILED', 'CALVED', 'ABORTED'];
const PD_RESULTS = ['POSITIVE', 'NEGATIVE', 'PENDING'];

const validateRecordMating = (req, res, next) => {
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

  if (!body.matingDate || !isValidDateFormat(body.matingDate)) {
    return next(new AppError('Valid mating date (YYYY-MM-DD) is required', 400));
  }

  const matingType = (body.matingType || '').trim().toUpperCase();
  if (!MATING_TYPES.includes(matingType)) {
    return next(new AppError(`matingType must be one of: ${MATING_TYPES.join(', ')}`, 400));
  }

  const heatId = body.heatId || body.heat_id || null;
  if (heatId && !isValidObjectId(heatId)) {
    return next(new AppError('Invalid heatId format', 400));
  }

  const bullId = body.bullId || body.bull_id || null;
  if (bullId && !isValidObjectId(bullId)) {
    return next(new AppError('Invalid bullId format', 400));
  }

  const semenBreedId = body.semenBreedId || body.semen_breed_id || null;
  if (semenBreedId && !isValidObjectId(semenBreedId)) {
    return next(new AppError('Invalid semenBreedId format', 400));
  }

  const inseminatorWorkerId =
    body.inseminatorWorkerId || body.workerId || body.worker_id || null;
  if (inseminatorWorkerId && !isValidObjectId(inseminatorWorkerId)) {
    return next(new AppError('Invalid inseminatorWorkerId format', 400));
  }

  req.validatedData = {
    gaushalaId,
    cowId,
    heatId,
    matingDate: body.matingDate.trim(),
    matingTime: (body.matingTime || '').trim(),
    matingType,
    bullId,
    bullNameOrTag: (body.bullNameOrTag || '').trim(),
    semenStrawCode: (body.semenStrawCode || '').trim(),
    semenBreedId,
    semenSource: (body.semenSource || '').trim(),
    inseminatorName: (body.inseminatorName || '').trim(),
    inseminatorWorkerId,
    remarks: (body.remarks || '').trim(),
  };

  next();
};

const validateUpdatePDStatus = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body is required', 400));
  }

  const pdResult = (body.pdResult || '').trim().toUpperCase();
  if (!['POSITIVE', 'NEGATIVE'].includes(pdResult)) {
    return next(new AppError('pdResult must be either POSITIVE (Pregnant) or NEGATIVE (Failed)', 400));
  }

  if (body.pdDate && !isValidDateFormat(body.pdDate)) {
    return next(new AppError('Valid pdDate (YYYY-MM-DD) is required', 400));
  }

  req.validatedData = {
    pdResult,
    pdDate: body.pdDate ? body.pdDate.trim() : null,
    pdPerformedBy: (body.pdPerformedBy || '').trim(),
    remarks: (body.remarks || '').trim(),
  };

  next();
};

const validateRecordCalving = (req, res, next) => {
  const body = req.body || {};

  if (body.actualCalvingDate && !isValidDateFormat(body.actualCalvingDate)) {
    return next(new AppError('Valid actualCalvingDate (YYYY-MM-DD) is required', 400));
  }

  req.validatedData = {
    actualCalvingDate: body.actualCalvingDate ? body.actualCalvingDate.trim() : null,
    remarks: (body.remarks || '').trim(),
  };

  next();
};

const validateUpdateMating = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body is required', 400));
  }

  if (body.matingDate && !isValidDateFormat(body.matingDate)) {
    return next(new AppError('Valid matingDate (YYYY-MM-DD) is required', 400));
  }

  if (body.matingType) {
    const mt = String(body.matingType).trim().toUpperCase();
    if (!MATING_TYPES.includes(mt)) {
      return next(new AppError(`matingType must be one of: ${MATING_TYPES.join(', ')}`, 400));
    }
  }

  if (body.status) {
    const st = String(body.status).trim().toUpperCase();
    if (!MATING_STATUSES.includes(st)) {
      return next(new AppError(`status must be one of: ${MATING_STATUSES.join(', ')}`, 400));
    }
  }

  if (body.bullId && !isValidObjectId(body.bullId)) {
    return next(new AppError('Invalid bullId format', 400));
  }

  if (body.semenBreedId && !isValidObjectId(body.semenBreedId)) {
    return next(new AppError('Invalid semenBreedId format', 400));
  }

  if (body.inseminatorWorkerId && !isValidObjectId(body.inseminatorWorkerId)) {
    return next(new AppError('Invalid inseminatorWorkerId format', 400));
  }

  next();
};

module.exports = {
  isValidObjectId,
  isValidDateFormat,
  validateRecordMating,
  validateUpdatePDStatus,
  validateRecordCalving,
  validateUpdateMating,
};
