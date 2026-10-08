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


const CATEGORIES = [
  'TABLET',
  'INJECTION',
  'SYRUP',
  'VACCINE',
  'OINTMENT',
  'POWDER',
  'DROPS',
  'BOLUS',
  'ANTIBIOTIC',
  'OTHER',
];

const UNITS = [
  'VIAL',
  'AMPOULE',
  'BOTTLE',
  'STRIP',
  'TABLET',
  'BOLUS',
  'TUBE',
  'SACHET',
  'ML',
  'LITER',
  'KG',
  'GM',
  'BOX',
  'PCS',
  'OTHER',
];

const INWARD_REASONS = ['PURCHASE', 'DONATION', 'STOCK_AUDIT', 'OTHER'];
const OUTWARD_REASONS = [
  'TREATMENT',
  'EMERGENCY',
  'DAILY_CARE',
  'EXPIRED_DISPOSAL',
  'DAMAGED',
  'STOCK_AUDIT',
  'OTHER',
];

/**
 * Validate Medical Item Creation
 */
const validateCreateMedicalItem = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    return next(new AppError('gaushalaId is required', 400));
  }
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Invalid gaushalaId format', 400));
  }

  if (!body.itemName || typeof body.itemName !== 'string' || !body.itemName.trim()) {
    return next(new AppError('itemName is required', 400));
  }

  let category = 'OTHER';
  if (body.category) {
    const upperCategory = String(body.category).trim().toUpperCase();
    if (!CATEGORIES.includes(upperCategory)) {
      return next(
        new AppError(`Invalid category. Allowed values: ${CATEGORIES.join(', ')}`, 400),
      );
    }
    category = upperCategory;
  }

  let unit = 'PCS';
  if (body.unit) {
    const upperUnit = String(body.unit).trim().toUpperCase();
    if (!UNITS.includes(upperUnit)) {
      return next(new AppError(`Invalid unit. Allowed values: ${UNITS.join(', ')}`, 400));
    }
    unit = upperUnit;
  }

  let minStockAlert = 10;
  if (body.minStockAlert !== undefined && body.minStockAlert !== null) {
    const parsedMinStock = Number(body.minStockAlert);
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      return next(new AppError('minStockAlert must be a non-negative number', 400));
    }
    minStockAlert = parsedMinStock;
  }

  req.validatedData = {
    ...body,
    gaushalaId,
    itemName: body.itemName.trim(),
    itemCode: body.itemCode ? String(body.itemCode).trim().toUpperCase() : '',
    category,
    unit,
    minStockAlert,
    manufacturer: body.manufacturer ? String(body.manufacturer).trim() : '',
    description: body.description ? String(body.description).trim() : '',
  };

  next();
};

/**
 * Validate Medical Item Update
 */
const validateUpdateMedicalItem = (req, res, next) => {
  const body = req.body;
  const itemId = req.params.id || body.itemId;

  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid item id is required', 400));
  }

  const updates = {};

  if (body.itemName !== undefined) {
    if (typeof body.itemName !== 'string' || !body.itemName.trim()) {
      return next(new AppError('itemName cannot be empty', 400));
    }
    updates.itemName = body.itemName.trim();
  }

  if (body.itemCode !== undefined) {
    updates.itemCode = String(body.itemCode).trim().toUpperCase();
  }

  if (body.category !== undefined) {
    const upperCategory = String(body.category).trim().toUpperCase();
    if (!CATEGORIES.includes(upperCategory)) {
      return next(
        new AppError(`Invalid category. Allowed values: ${CATEGORIES.join(', ')}`, 400),
      );
    }
    updates.category = upperCategory;
  }

  if (body.unit !== undefined) {
    const upperUnit = String(body.unit).trim().toUpperCase();
    if (!UNITS.includes(upperUnit)) {
      return next(new AppError(`Invalid unit. Allowed values: ${UNITS.join(', ')}`, 400));
    }
    updates.unit = upperUnit;
  }

  if (body.minStockAlert !== undefined && body.minStockAlert !== null) {
    const parsedMinStock = Number(body.minStockAlert);
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      return next(new AppError('minStockAlert must be a non-negative number', 400));
    }
    updates.minStockAlert = parsedMinStock;
  }

  if (body.manufacturer !== undefined) {
    updates.manufacturer = String(body.manufacturer).trim();
  }

  if (body.description !== undefined) {
    updates.description = String(body.description).trim();
  }

  if (body.isActive !== undefined) {
    updates.isActive = Boolean(body.isActive);
  }

  req.itemId = itemId;
  req.validatedData = updates;
  next();
};

/**
 * Validate Stock Inward (Batch / Expiry based)
 */
const validateStockInward = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId || !isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  const itemId = body.itemId || body.item_id;
  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid itemId is required', 400));
  }

  let batches = [];
  if (Array.isArray(body.batches) && body.batches.length > 0) {
    for (let i = 0; i < body.batches.length; i++) {
      const b = body.batches[i];
      const qty = Number(b.quantity);
      if (!qty || qty <= 0) {
        return next(new AppError(`Batch at index ${i} has invalid quantity`, 400));
      }
      if (!b.expiryDate) {
        return next(new AppError(`Batch at index ${i} requires an expiryDate`, 400));
      }
      const expDate = new Date(b.expiryDate);
      if (isNaN(expDate.getTime())) {
        return next(new AppError(`Batch at index ${i} has invalid expiryDate format`, 400));
      }

      batches.push({
        batchNumber: b.batchNumber ? String(b.batchNumber).trim().toUpperCase() : `BAT-${Date.now()}-${i + 1}`,
        expiryDate: expDate,
        mfgDate: b.mfgDate ? new Date(b.mfgDate) : null,
        quantity: qty,
        unitPrice: Number(b.unitPrice || b.ratePerUnit || 0),
        mrp: Number(b.mrp || 0),
      });
    }
  } else {
    // Single batch payload support
    const qty = Number(body.quantity);
    if (!qty || qty <= 0) {
      return next(new AppError('quantity must be a positive number', 400));
    }
    if (!body.expiryDate) {
      return next(new AppError('expiryDate is required for stock inward', 400));
    }
    const expDate = new Date(body.expiryDate);
    if (isNaN(expDate.getTime())) {
      return next(new AppError('Invalid expiryDate format', 400));
    }

    batches.push({
      batchNumber: body.batchNumber
        ? String(body.batchNumber).trim().toUpperCase()
        : `BAT-${Date.now()}`,
      expiryDate: expDate,
      mfgDate: body.mfgDate ? new Date(body.mfgDate) : null,
      quantity: qty,
      unitPrice: Number(body.unitPrice || body.ratePerUnit || 0),
      mrp: Number(body.mrp || 0),
    });
  }

  let reason = 'PURCHASE';
  if (body.reason) {
    const upperReason = String(body.reason).trim().toUpperCase();
    if (INWARD_REASONS.includes(upperReason)) {
      reason = upperReason;
    }
  }

  req.validatedData = {
    gaushalaId,
    itemId,
    batches,
    reason,
    supplierOrDonorName: body.supplierOrDonorName ? String(body.supplierOrDonorName).trim() : '',
    billOrReceiptNo: body.billOrReceiptNo ? String(body.billOrReceiptNo).trim() : '',
    notes: body.notes ? String(body.notes).trim() : '',
    transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
  };

  next();
};

/**
 * Validate Stock Outward (FEFO)
 */
const validateStockOutward = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId || !isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  const itemId = body.itemId || body.item_id;
  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid itemId is required', 400));
  }

  const quantity = Number(body.quantity);
  if (!quantity || quantity <= 0) {
    return next(new AppError('quantity must be a positive number', 400));
  }

  let reason = 'TREATMENT';
  if (body.reason) {
    const upperReason = String(body.reason).trim().toUpperCase();
    if (OUTWARD_REASONS.includes(upperReason)) {
      reason = upperReason;
    }
  }

  if (body.cowId && !isValidObjectId(body.cowId)) {
    return next(new AppError('Invalid cowId format', 400));
  }

  if (body.shedId && !isValidObjectId(body.shedId)) {
    return next(new AppError('Invalid shedId format', 400));
  }

  req.validatedData = {
    gaushalaId,
    itemId,
    quantity,
    reason,
    cowId: body.cowId || null,
    shedId: body.shedId || null,
    doctorName: body.doctorName ? String(body.doctorName).trim() : '',
    prescribedFor: body.prescribedFor ? String(body.prescribedFor).trim() : '',
    notes: body.notes ? String(body.notes).trim() : '',
    transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
  };

  next();
};

/**
 * Validate Stock Adjustment
 */
const validateStockAdjustment = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId || !isValidObjectId(gaushalaId)) {
    return next(new AppError('Valid gaushalaId is required', 400));
  }

  const itemId = body.itemId || body.item_id;
  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid itemId is required', 400));
  }

  const quantity = Number(body.quantity);
  if (!quantity || quantity <= 0) {
    return next(new AppError('quantity must be a positive number', 400));
  }

  if (body.batchId && !isValidObjectId(body.batchId)) {
    return next(new AppError('Invalid batchId format', 400));
  }

  req.validatedData = {
    gaushalaId,
    itemId,
    quantity,
    batchId: body.batchId || null,
    type: body.type ? String(body.type).trim().toUpperCase() : 'EXPIRED_DISPOSAL',
    reason: body.reason ? String(body.reason).trim().toUpperCase() : 'EXPIRED_DISPOSAL',
    notes: body.notes ? String(body.notes).trim() : '',
    transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
  };

  next();
};

module.exports = {
  validateCreateMedicalItem,
  validateUpdateMedicalItem,
  validateStockInward,
  validateStockOutward,
  validateStockAdjustment,
};
