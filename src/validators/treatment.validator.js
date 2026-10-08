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

const { resolveGaushalaId } = require('../utils/roles');


const SEVERITIES = ['MILD', 'MODERATE', 'CRITICAL'];
const STATUSES = [
  'UNDER_TREATMENT',
  'RECOVERED',
  'CRITICAL',
  'REFERRED',
  'DECEASED',
  'CLOSED',
];
const DOCTOR_TYPES = ['IN_HOUSE', 'VISITING_VET', 'GOVERNMENT', 'OTHER'];
const ROUTES = ['IM', 'IV', 'SC', 'ORAL', 'TOPICAL', 'INTRAMAMMARY', 'OTHER'];

const validateCreateTreatment = (req, res, next) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    return next(new AppError('gaushalaId is required', 400));
  }
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Invalid gaushalaId format', 400));
  }

  const cowId = body.cowId || body.cow_id;
  if (!cowId) {
    return next(new AppError('cowId is required', 400));
  }
  if (!isValidObjectId(cowId)) {
    return next(new AppError('Invalid cowId format', 400));
  }

  if (!body.diseaseName || typeof body.diseaseName !== 'string' || !body.diseaseName.trim()) {
    return next(new AppError('diseaseName is required', 400));
  }

  let severity = 'MODERATE';
  if (body.severity) {
    const sev = String(body.severity).trim().toUpperCase();
    if (!SEVERITIES.includes(sev)) {
      return next(
        new AppError(`Invalid severity. Allowed: ${SEVERITIES.join(', ')}`, 400),
      );
    }
    severity = sev;
  }

  let doctorType = 'VISITING_VET';
  if (body.doctorType) {
    const dt = String(body.doctorType).trim().toUpperCase();
    if (!DOCTOR_TYPES.includes(dt)) {
      return next(
        new AppError(`Invalid doctorType. Allowed: ${DOCTOR_TYPES.join(', ')}`, 400),
      );
    }
    doctorType = dt;
  }

  let totalDoses = 1;
  if (body.totalDoses !== undefined && body.totalDoses !== null) {
    const parsed = Number(body.totalDoses);
    if (isNaN(parsed) || parsed < 1) {
      return next(new AppError('totalDoses must be a number greater than or equal to 1', 400));
    }
    totalDoses = parsed;
  }

  let doseIntervalDays = 1;
  if (body.doseIntervalDays !== undefined && body.doseIntervalDays !== null) {
    const parsedInterval = Number(body.doseIntervalDays);
    if (isNaN(parsedInterval) || parsedInterval < 1) {
      return next(new AppError('doseIntervalDays must be at least 1 day', 400));
    }
    doseIntervalDays = parsedInterval;
  }

  req.validatedData = {
    ...body,
    gaushalaId,
    cowId,
    diseaseName: body.diseaseName.trim(),
    severity,
    doctorType,
    totalDoses,
    doseIntervalDays,
    doctorName: body.doctorName ? String(body.doctorName).trim() : '',
    doctorContact: body.doctorContact ? String(body.doctorContact).trim() : '',
    diagnosisNotes: body.diagnosisNotes ? String(body.diagnosisNotes).trim() : '',
  };

  next();
};

const validateUpdateTreatment = (req, res, next) => {
  const { id } = req.params;
  if (!id || !isValidObjectId(id)) {
    return next(new AppError('Valid treatment ID is required', 400));
  }

  const body = req.body || {};

  if (body.severity) {
    const sev = String(body.severity).trim().toUpperCase();
    if (!SEVERITIES.includes(sev)) {
      return next(
        new AppError(`Invalid severity. Allowed: ${SEVERITIES.join(', ')}`, 400),
      );
    }
  }

  if (body.doctorType) {
    const dt = String(body.doctorType).trim().toUpperCase();
    if (!DOCTOR_TYPES.includes(dt)) {
      return next(
        new AppError(`Invalid doctorType. Allowed: ${DOCTOR_TYPES.join(', ')}`, 400),
      );
    }
  }

  req.validatedData = body;
  next();
};

const validateAdministerDose = (req, res, next) => {
  const { id, doseNumber } = req.params;
  if (!id || !isValidObjectId(id)) {
    return next(new AppError('Valid treatment ID is required', 400));
  }

  const parsedDoseNum = Number(doseNumber);
  if (isNaN(parsedDoseNum) || parsedDoseNum < 1) {
    return next(new AppError('Valid doseNumber parameter is required', 400));
  }

  req.validatedDoseNumber = parsedDoseNum;
  req.validatedData = req.body || {};
  next();
};

const validateUpdateStatus = (req, res, next) => {
  const { id } = req.params;
  if (!id || !isValidObjectId(id)) {
    return next(new AppError('Valid treatment ID is required', 400));
  }

  const { status } = req.body || {};
  if (!status || typeof status !== 'string') {
    return next(new AppError('Status is required', 400));
  }

  const upperStatus = status.trim().toUpperCase();
  if (!STATUSES.includes(upperStatus)) {
    return next(
      new AppError(`Invalid status. Allowed values: ${STATUSES.join(', ')}`, 400),
    );
  }

  req.validatedData = {
    ...req.body,
    status: upperStatus,
  };

  next();
};

module.exports = {
  validateCreateTreatment,
  validateUpdateTreatment,
  validateAdministerDose,
  validateUpdateStatus,
};
