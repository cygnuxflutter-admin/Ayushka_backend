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

const getTodayDateString = () => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const isFutureDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const today = getTodayDateString();
  return dateStr.trim() > today;
};

const { resolveGaushalaId } = require('../utils/roles');


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

  if (isFutureDate(body.date)) {
    return next(new AppError('Production date cannot be a future date', 400));
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

  if (isFutureDate(body.date)) {
    return next(new AppError('Production date cannot be a future date', 400));
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

// ==========================================
// MILK PRODUCTION MATRIX (DATE RANGE) VALIDATOR
// ==========================================

const normalizeAndValidateDate = (dateStr, paramName) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return { error: `${paramName} is mandatory` };
  }
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return { error: `${paramName} is mandatory` };
  }

  let y, m, d;

  // Case 1: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    [y, m, d] = trimmed.split('-').map(Number);
  }
  // Case 2: MM/DD/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/').map(Number);
    m = parts[0];
    d = parts[1];
    y = parts[2];
  }
  // Case 3: DD-MM-YYYY
  else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-').map(Number);
    d = parts[0];
    m = parts[1];
    y = parts[2];
  } else {
    return { error: `${paramName} must be in YYYY-MM-DD format (e.g. 2026-10-18)` };
  }

  const utcDate = new Date(Date.UTC(y, m - 1, d));
  if (
    utcDate.getUTCFullYear() !== y ||
    utcDate.getUTCMonth() !== m - 1 ||
    utcDate.getUTCDate() !== d
  ) {
    return { error: `Invalid calendar date for ${paramName}` };
  }

  const normalized = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { date: normalized, utcDate, y, m, d };
};

const validateMilkMatrixQuery = (req, res, next) => {
  const query = req.query || {};

  const gaushalaId = resolveGaushalaId(req);
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  const rawStart = query.startDate || query.start_date;
  const rawEnd = query.endDate || query.end_date;

  // Condition 3: Both dates are mandatory
  if (!rawStart && !rawEnd) {
    return next(new AppError('Both startDate and endDate are mandatory', 400));
  }
  if (!rawStart) {
    return next(new AppError('startDate is mandatory', 400));
  }
  if (!rawEnd) {
    return next(new AppError('endDate is mandatory', 400));
  }

  const startRes = normalizeAndValidateDate(rawStart, 'startDate');
  if (startRes.error) {
    return next(new AppError(startRes.error, 400));
  }

  const endRes = normalizeAndValidateDate(rawEnd, 'endDate');
  if (endRes.error) {
    return next(new AppError(endRes.error, 400));
  }

  const startMs = startRes.utcDate.getTime();
  const endMs = endRes.utcDate.getTime();

  // Condition 2: Start date should be lower than or equal to end date
  if (startMs > endMs) {
    return next(
      new AppError(
        'Start date must be lower than or equal to end date (startDate cannot be greater than endDate)',
        400,
      ),
    );
  }

  // Condition 1: Date range should be 30 days
  const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    return next(new AppError('Date range cannot exceed 30 days', 400));
  }

  const cowId = query.cowId || query.cow_id;
  if (cowId && !isValidObjectId(cowId)) {
    return next(new AppError('Invalid cowId format', 400));
  }

  const shedId = query.shedId || query.shed_id;
  if (shedId && !isValidObjectId(shedId)) {
    return next(new AppError('Invalid shedId format', 400));
  }

  req.validatedQuery = {
    gaushalaId,
    startDate: startRes.date,
    endDate: endRes.date,
    diffDays,
    cowId: cowId || null,
    shedId: shedId || null,
    includeAllCows: query.includeAllCows === 'true' || query.allCows === 'true',
    format: (query.format || '').toLowerCase().trim(),
  };

  next();
};

module.exports = {
  isValidObjectId,
  isValidDateFormat,
  isFutureDate,
  resolveGaushalaId,
  validateSingleProduction,
  validateBulkProduction,
  validateCreateDistribution,
  validateCreateDisposal,
  validateMilkMatrixQuery,
};
