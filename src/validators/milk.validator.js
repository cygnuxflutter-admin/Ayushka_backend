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

const isValidDateFormat = (str) => {
  if (typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
};

const resolveGaushalaId = (req) => {
  const body = req.body || {};
  const query = req.query || {};
  const params = req.params || {};

  return (
    (body.gaushalaId && typeof body.gaushalaId === 'string' && body.gaushalaId.trim()) ||
    (body.gaushala_id && typeof body.gaushala_id === 'string' && body.gaushala_id.trim()) ||
    (params.gaushalaId && typeof params.gaushalaId === 'string' && params.gaushalaId.trim()) ||
    (params.gaushala_id && typeof params.gaushala_id === 'string' && params.gaushala_id.trim()) ||
    (query.gaushalaId && typeof query.gaushalaId === 'string' && query.gaushalaId.trim()) ||
    (query.gaushala_id && typeof query.gaushala_id === 'string' && query.gaushala_id.trim()) ||
    null
  );
};

// ==========================================
// MILK PRODUCTION VALIDATORS
// ==========================================

const validateSingleProduction = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  if (!body.date || !isValidDateFormat(body.date)) {
    return next(new AppError('Valid production date is required in YYYY-MM-DD format', 400));
  }

  const shift = (body.shift || '').toString().toLowerCase().trim();
  if (!['morning', 'evening'].includes(shift)) {
    return next(new AppError('Shift must be either morning or evening', 400));
  }

  const cowId = body.cowId || body.cow_id;
  if (!isValidObjectId(cowId)) {
    return next(new AppError('Valid cowId is required', 400));
  }

  const workerId = body.workerId || body.worker_id;
  if (!isValidObjectId(workerId)) {
    return next(new AppError('Valid workerId is required', 400));
  }

  const quantity = Number(body.quantity);
  if (isNaN(quantity) || quantity < 0) {
    return next(new AppError('Quantity must be a valid non-negative number', 400));
  }

  req.validatedData = {
    gaushalaId,
    date: body.date.trim(),
    shift,
    cowId,
    workerId,
    quantity,
    fat: body.fat !== undefined ? Number(body.fat) || 0 : 0,
    snf: body.snf !== undefined ? Number(body.snf) || 0 : 0,
    remarks: typeof body.remarks === 'string' ? body.remarks.trim() : '',
  };

  next();
};

const validateBulkProduction = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  if (!body.date || !isValidDateFormat(body.date)) {
    return next(new AppError('Valid production date is required in YYYY-MM-DD format', 400));
  }

  const shift = (body.shift || '').toString().toLowerCase().trim();
  if (!['morning', 'evening'].includes(shift)) {
    return next(new AppError('Shift must be either morning or evening', 400));
  }

  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    return next(new AppError('Entries array with at least one cow record is required', 400));
  }

  const defaultWorkerId = body.workerId || body.worker_id;

  const validatedEntries = [];
  for (let i = 0; i < body.entries.length; i++) {
    const entry = body.entries[i];
    const cowId = entry.cowId || entry.cow_id;
    const workerId = entry.workerId || entry.worker_id || defaultWorkerId;

    if (!isValidObjectId(cowId)) {
      return next(new AppError(`Entry #${i + 1}: Valid cowId is required`, 400));
    }

    if (!isValidObjectId(workerId)) {
      return next(new AppError(`Entry #${i + 1}: Valid workerId is required`, 400));
    }

    const quantity = Number(entry.quantity);
    if (isNaN(quantity) || quantity < 0) {
      return next(new AppError(`Entry #${i + 1}: Quantity must be a non-negative number`, 400));
    }

    validatedEntries.push({
      cowId,
      workerId,
      quantity,
      fat: entry.fat !== undefined ? Number(entry.fat) || 0 : 0,
      snf: entry.snf !== undefined ? Number(entry.snf) || 0 : 0,
      remarks: typeof entry.remarks === 'string' ? entry.remarks.trim() : '',
    });
  }

  req.validatedData = {
    gaushalaId,
    date: body.date.trim(),
    shift,
    entries: validatedEntries,
  };

  next();
};

// ==========================================
// MILK DISTRIBUTION VALIDATORS
// ==========================================

const validateCreateDistribution = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  const milkDate = body.milkDate || body.milk_date || body.date;
  if (!milkDate || !isValidDateFormat(milkDate)) {
    return next(new AppError('Valid milkDate is required in YYYY-MM-DD format', 400));
  }

  const quantity = Number(body.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return next(new AppError('Distribution quantity must be greater than 0', 400));
  }

  let shift = (body.shift || '').toString().toLowerCase().trim();
  if (shift && !['morning', 'evening', 'all'].includes(shift)) {
    return next(new AppError('Shift must be morning, evening, or all', 400));
  }

  const recipientType = (body.recipientType || body.recipient_type || 'customer')
    .toString()
    .toLowerCase()
    .trim();
  const validTypes = ['customer', 'dairy_plant', 'calf_feeding', 'staff', 'other'];
  if (!validTypes.includes(recipientType)) {
    return next(new AppError(`Recipient type must be one of: ${validTypes.join(', ')}`, 400));
  }

  const customerId = body.customerId || body.customer_id;
  if (customerId && !isValidObjectId(customerId)) {
    return next(new AppError('Valid customerId is required when provided', 400));
  }

  const ratePerLiter = body.ratePerLiter !== undefined ? Number(body.ratePerLiter) || 0 : 0;

  req.validatedData = {
    gaushalaId,
    milkDate: milkDate.trim(),
    shift: shift || null,
    quantity,
    recipientType,
    recipientName: typeof body.recipientName === 'string' ? body.recipientName.trim() : '',
    customerId: customerId || null,
    ratePerLiter,
    remarks: typeof body.remarks === 'string' ? body.remarks.trim() : '',
  };

  next();
};

// ==========================================
// MILK DISPOSAL VALIDATORS
// ==========================================

const validateCreateDisposal = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  const milkDate = body.milkDate || body.milk_date;
  if (!milkDate || !isValidDateFormat(milkDate)) {
    return next(new AppError('Valid milkDate (spoiled stock date) is required in YYYY-MM-DD format', 400));
  }

  const quantity = Number(body.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return next(new AppError('Disposal quantity must be greater than 0', 400));
  }

  const disposalDate = body.disposalDate || body.disposal_date;
  if (disposalDate && !isValidDateFormat(disposalDate)) {
    return next(new AppError('Invalid disposalDate format (YYYY-MM-DD required)', 400));
  }

  const reason = (body.reason || 'spoiled').toString().toLowerCase().trim();
  const validReasons = ['spoiled', 'sour', 'temperature_failure', 'contamination', 'other'];
  if (!validReasons.includes(reason)) {
    return next(new AppError(`Disposal reason must be one of: ${validReasons.join(', ')}`, 400));
  }

  const reportedBy = body.reportedBy || body.workerId || body.worker_id;
  if (reportedBy && !isValidObjectId(reportedBy)) {
    return next(new AppError('Valid reportedBy (Worker ID) is required when provided', 400));
  }

  req.validatedData = {
    gaushalaId,
    milkDate: milkDate.trim(),
    disposalDate: disposalDate ? disposalDate.trim() : null,
    quantity,
    reason,
    reportedBy: reportedBy || null,
    remarks: typeof body.remarks === 'string' ? body.remarks.trim() : '',
  };

  next();
};

module.exports = {
  isValidObjectId,
  isValidDateFormat,
  resolveGaushalaId,
  validateSingleProduction,
  validateBulkProduction,
  validateCreateDistribution,
  validateCreateDisposal,
};
