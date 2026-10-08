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


const CATEGORIES = ['GREEN_FODDER', 'DRY_FODDER', 'CONCENTRATE_FEED', 'SUPPLEMENT', 'OTHER'];
const UNITS = ['KG', 'TON', 'QUINTAL', 'BAG', 'BUNDLE', 'LITER', 'OTHER'];

const validateCreateFeedItem = (req, res, next) => {
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

  let category = 'GREEN_FODDER';
  if (body.category) {
    const upperCategory = String(body.category).trim().toUpperCase();
    if (!CATEGORIES.includes(upperCategory)) {
      return next(
        new AppError(`Invalid category. Allowed values: ${CATEGORIES.join(', ')}`, 400),
      );
    }
    category = upperCategory;
  }

  let unit = 'KG';
  if (body.unit) {
    const upperUnit = String(body.unit).trim().toUpperCase();
    if (!UNITS.includes(upperUnit)) {
      return next(new AppError(`Invalid unit. Allowed values: ${UNITS.join(', ')}`, 400));
    }
    unit = upperUnit;
  }

  const initialStock = body.initialStock !== undefined && !isNaN(Number(body.initialStock))
    ? Math.max(0, Number(body.initialStock))
    : 0;

  const minStockAlert = body.minStockAlert !== undefined && !isNaN(Number(body.minStockAlert))
    ? Math.max(0, Number(body.minStockAlert))
    : 50;

  const unitPrice = body.unitPrice !== undefined && !isNaN(Number(body.unitPrice))
    ? Math.max(0, Number(body.unitPrice))
    : 0;

  req.validatedData = {
    gaushalaId,
    itemName: body.itemName.trim(),
    itemCode: typeof body.itemCode === 'string' ? body.itemCode.trim().toUpperCase() : '',
    category,
    unit,
    currentStock: initialStock,
    initialStock,
    minStockAlert,
    unitPrice,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    createdBy: req.user?._id || null,
  };

  next();
};

const validateUpdateFeedItem = (req, res, next) => {
  const itemId = req.params?.id || req.body?._id || req.body?.id;
  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid Feed Item ID is required', 400));
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body with fields to update is required', 400));
  }

  const sanitized = {};

  if (body.itemName !== undefined) {
    if (typeof body.itemName !== 'string' || !body.itemName.trim()) {
      return next(new AppError('itemName cannot be empty', 400));
    }
    sanitized.itemName = body.itemName.trim();
  }

  if (body.itemCode !== undefined) {
    sanitized.itemCode = typeof body.itemCode === 'string' ? body.itemCode.trim().toUpperCase() : '';
  }

  if (body.category !== undefined) {
    const upperCategory = String(body.category).trim().toUpperCase();
    if (!CATEGORIES.includes(upperCategory)) {
      return next(
        new AppError(`Invalid category. Allowed values: ${CATEGORIES.join(', ')}`, 400),
      );
    }
    sanitized.category = upperCategory;
  }

  if (body.unit !== undefined) {
    const upperUnit = String(body.unit).trim().toUpperCase();
    if (!UNITS.includes(upperUnit)) {
      return next(new AppError(`Invalid unit. Allowed values: ${UNITS.join(', ')}`, 400));
    }
    sanitized.unit = upperUnit;
  }

  if (body.minStockAlert !== undefined) {
    if (isNaN(Number(body.minStockAlert)) || Number(body.minStockAlert) < 0) {
      return next(new AppError('minStockAlert must be a non-negative number', 400));
    }
    sanitized.minStockAlert = Number(body.minStockAlert);
  }

  if (body.unitPrice !== undefined) {
    if (isNaN(Number(body.unitPrice)) || Number(body.unitPrice) < 0) {
      return next(new AppError('unitPrice must be a non-negative number', 400));
    }
    sanitized.unitPrice = Number(body.unitPrice);
  }

  if (body.description !== undefined) {
    sanitized.description = typeof body.description === 'string' ? body.description.trim() : '';
  }

  if (body.isActive !== undefined) {
    sanitized.isActive = Boolean(body.isActive);
  }

  req.itemId = itemId.toString().trim();
  req.validatedData = sanitized;
  next();
};

const validateStockInward = (req, res, next) => {
  const body = req.body || {};
  const gaushalaId = resolveGaushalaId(req);

  if (!gaushalaId) {
    return next(new AppError('gaushalaId is required', 400));
  }
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Invalid gaushalaId format', 400));
  }

  const itemId = body.itemId || body.item_id;
  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid itemId is required', 400));
  }

  const quantity = Number(body.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return next(new AppError('Quantity must be greater than zero', 400));
  }

  const allowedReasons = ['PURCHASE', 'DONATION', 'OTHER'];
  let reason = 'PURCHASE';
  if (body.reason) {
    const upperReason = String(body.reason).trim().toUpperCase();
    if (!allowedReasons.includes(upperReason)) {
      return next(new AppError(`Invalid inward reason. Allowed: ${allowedReasons.join(', ')}`, 400));
    }
    reason = upperReason;
  }

  const ratePerUnit = body.ratePerUnit !== undefined && !isNaN(Number(body.ratePerUnit))
    ? Math.max(0, Number(body.ratePerUnit))
    : 0;

  const totalAmount = body.totalAmount !== undefined && !isNaN(Number(body.totalAmount))
    ? Math.max(0, Number(body.totalAmount))
    : ratePerUnit * quantity;

  req.validatedTransaction = {
    gaushalaId,
    itemId,
    type: 'INWARD',
    reason,
    quantity,
    unit: body.unit ? String(body.unit).trim().toUpperCase() : '',
    ratePerUnit,
    totalAmount,
    supplierOrDonorName: typeof body.supplierOrDonorName === 'string' ? body.supplierOrDonorName.trim() : '',
    billOrReceiptNo: typeof body.billOrReceiptNo === 'string' ? body.billOrReceiptNo.trim() : '',
    vehicleNumber: typeof body.vehicleNumber === 'string' ? body.vehicleNumber.trim() : '',
    notes: typeof body.notes === 'string' ? body.notes.trim() : '',
    transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
    recordedBy: req.user?._id || body.recordedBy,
  };

  if (!req.validatedTransaction.recordedBy || !isValidObjectId(req.validatedTransaction.recordedBy)) {
    return next(new AppError('recordedBy user ID is required', 400));
  }

  next();
};

const validateStockOutward = (req, res, next) => {
  const body = req.body || {};
  const gaushalaId = resolveGaushalaId(req);

  if (!gaushalaId) {
    return next(new AppError('gaushalaId is required', 400));
  }
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Invalid gaushalaId format', 400));
  }

  const itemId = body.itemId || body.item_id;
  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid itemId is required', 400));
  }

  const quantity = Number(body.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return next(new AppError('Quantity must be greater than zero', 400));
  }

  const allowedReasons = ['DAILY_FEEDING', 'OTHER'];
  let reason = 'DAILY_FEEDING';
  if (body.reason) {
    const upperReason = String(body.reason).trim().toUpperCase();
    if (!allowedReasons.includes(upperReason)) {
      return next(new AppError(`Invalid outward reason. Allowed: ${allowedReasons.join(', ')}`, 400));
    }
    reason = upperReason;
  }

  const shedId = body.shedId || body.shed_id || null;
  if (shedId && !isValidObjectId(shedId)) {
    return next(new AppError('Invalid shedId format', 400));
  }

  req.validatedTransaction = {
    gaushalaId,
    itemId,
    type: 'OUTWARD',
    reason,
    quantity,
    unit: body.unit ? String(body.unit).trim().toUpperCase() : '',
    shedId: shedId || null,
    notes: typeof body.notes === 'string' ? body.notes.trim() : '',
    transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
    recordedBy: req.user?._id || body.recordedBy,
  };

  if (!req.validatedTransaction.recordedBy || !isValidObjectId(req.validatedTransaction.recordedBy)) {
    return next(new AppError('recordedBy user ID is required', 400));
  }

  next();
};

const validateStockAdjustment = (req, res, next) => {
  const body = req.body || {};
  const gaushalaId = resolveGaushalaId(req);

  if (!gaushalaId) {
    return next(new AppError('gaushalaId is required', 400));
  }
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Invalid gaushalaId format', 400));
  }

  const itemId = body.itemId || body.item_id;
  if (!itemId || !isValidObjectId(itemId)) {
    return next(new AppError('Valid itemId is required', 400));
  }

  const quantity = Number(body.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return next(new AppError('Quantity must be greater than zero', 400));
  }

  const allowedTypes = ['WASTAGE', 'ADJUSTMENT'];
  const type = body.type ? String(body.type).trim().toUpperCase() : 'WASTAGE';
  if (!allowedTypes.includes(type)) {
    return next(new AppError(`Invalid transaction type. Allowed: ${allowedTypes.join(', ')}`, 400));
  }

  const allowedReasons = ['DAMAGED_EXPIRED', 'STOCK_AUDIT', 'OTHER'];
  let reason = type === 'WASTAGE' ? 'DAMAGED_EXPIRED' : 'STOCK_AUDIT';
  if (body.reason) {
    const upperReason = String(body.reason).trim().toUpperCase();
    if (!allowedReasons.includes(upperReason)) {
      return next(new AppError(`Invalid reason. Allowed: ${allowedReasons.join(', ')}`, 400));
    }
    reason = upperReason;
  }

  req.validatedTransaction = {
    gaushalaId,
    itemId,
    type,
    reason,
    quantity,
    unit: body.unit ? String(body.unit).trim().toUpperCase() : '',
    notes: typeof body.notes === 'string' ? body.notes.trim() : '',
    transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
    recordedBy: req.user?._id || body.recordedBy,
  };

  if (!req.validatedTransaction.recordedBy || !isValidObjectId(req.validatedTransaction.recordedBy)) {
    return next(new AppError('recordedBy user ID is required', 400));
  }

  next();
};

module.exports = {
  isValidObjectId,
  resolveGaushalaId,
  validateCreateFeedItem,
  validateUpdateFeedItem,
  validateStockInward,
  validateStockOutward,
  validateStockAdjustment,
};
