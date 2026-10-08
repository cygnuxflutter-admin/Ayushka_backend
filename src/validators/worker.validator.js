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


// ==========================================
// DEPARTMENT VALIDATORS
// ==========================================

const validateCreateDepartment = (req, res, next) => {
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

  const departmentName = body.departmentName || body.name;
  if (!departmentName || typeof departmentName !== 'string' || !departmentName.trim()) {
    return next(new AppError('departmentName is required', 400));
  }

  req.validatedData = {
    gaushalaId,
    departmentName: departmentName.trim(),
    departmentCode: typeof body.departmentCode === 'string' ? body.departmentCode.trim().toUpperCase() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
  };

  next();
};

const validateUpdateDepartment = (req, res, next) => {
  const departmentId = req.params?.id || req.body?._id || req.body?.id;
  if (!departmentId || !isValidObjectId(departmentId)) {
    return next(new AppError('Valid Department ID is required', 400));
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body with fields to update is required', 400));
  }

  const sanitized = {};

  const departmentName = body.departmentName !== undefined ? body.departmentName : body.name;
  if (departmentName !== undefined) {
    if (typeof departmentName !== 'string' || !departmentName.trim()) {
      return next(new AppError('departmentName cannot be empty', 400));
    }
    sanitized.departmentName = departmentName.trim();
  }

  if (body.departmentCode !== undefined) {
    sanitized.departmentCode = typeof body.departmentCode === 'string' ? body.departmentCode.trim().toUpperCase() : '';
  }

  if (body.description !== undefined) {
    sanitized.description = typeof body.description === 'string' ? body.description.trim() : '';
  }

  if (body.isActive !== undefined) {
    sanitized.isActive = Boolean(body.isActive);
  }

  req.departmentId = departmentId.toString().trim();
  req.validatedData = sanitized;
  next();
};

// ==========================================
// WORKER VALIDATORS
// ==========================================

const validateCreateWorker = (req, res, next) => {
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

  const departmentId = body.departmentId || body.department_id;
  if (!departmentId) {
    return next(new AppError('departmentId is required', 400));
  }
  if (!isValidObjectId(departmentId)) {
    return next(new AppError('Invalid departmentId format', 400));
  }

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return next(new AppError('Worker name is required', 400));
  }

  let joiningDate = new Date();
  if (body.joiningDate) {
    const parsed = new Date(body.joiningDate);
    if (isNaN(parsed.getTime())) {
      return next(new AppError('Invalid joiningDate format', 400));
    }
    joiningDate = parsed;
  }

  let leavingDate = null;
  let isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

  if (body.leavingDate) {
    const parsedLeaving = new Date(body.leavingDate);
    if (isNaN(parsedLeaving.getTime())) {
      return next(new AppError('Invalid leavingDate format', 400));
    }
    leavingDate = parsedLeaving;
    // When worker leaves gaushala, isActive flag becomes false, isDelete flag becomes false
    isActive = false;
  }

  req.validatedData = {
    gaushalaId,
    departmentId,
    name: body.name.trim(),
    joiningDate,
    leavingDate,
    isActive,
    isDelete: false,
    deletedBy: null,
  };

  next();
};

const validateUpdateWorker = (req, res, next) => {
  const workerId = req.params?.id || req.body?._id || req.body?.id;
  if (!workerId || !isValidObjectId(workerId)) {
    return next(new AppError('Valid Worker ID is required', 400));
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body with fields to update is required', 400));
  }

  const sanitized = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return next(new AppError('Worker name cannot be empty', 400));
    }
    sanitized.name = body.name.trim();
  }

  const departmentId = body.departmentId !== undefined ? body.departmentId : body.department_id;
  if (departmentId !== undefined) {
    if (!isValidObjectId(departmentId)) {
      return next(new AppError('Valid departmentId is required', 400));
    }
    sanitized.departmentId = departmentId;
  }

  if (body.joiningDate !== undefined) {
    if (body.joiningDate === null || body.joiningDate === '') {
      sanitized.joiningDate = null;
    } else {
      const parsed = new Date(body.joiningDate);
      if (isNaN(parsed.getTime())) {
        return next(new AppError('Invalid joiningDate format', 400));
      }
      sanitized.joiningDate = parsed;
    }
  }

  if (body.leavingDate !== undefined) {
    if (body.leavingDate === null || body.leavingDate === '') {
      sanitized.leavingDate = null;
    } else {
      const parsedLeaving = new Date(body.leavingDate);
      if (isNaN(parsedLeaving.getTime())) {
        return next(new AppError('Invalid leavingDate format', 400));
      }
      sanitized.leavingDate = parsedLeaving;
      // When worker leaves gaushala, isActive becomes false and isDelete remains false
      sanitized.isActive = false;
      sanitized.isDelete = false;
    }
  }

  // Admin updating status (active / deactive)
  if (body.isActive !== undefined) {
    const activeBool = Boolean(body.isActive);
    sanitized.isActive = activeBool;
    if (!activeBool) {
      // Deactivated / left gaushala
      sanitized.isDelete = false;
      if (!sanitized.leavingDate && body.leavingDate === undefined) {
        // Keep existing leavingDate or default to current date if none
      }
    }
  }

  req.workerId = workerId.toString().trim();
  req.validatedData = sanitized;
  next();
};

const validateWorkerStatus = (req, res, next) => {
  const workerId = req.params?.id || req.body?._id || req.body?.id;
  if (!workerId || !isValidObjectId(workerId)) {
    return next(new AppError('Valid Worker ID is required', 400));
  }

  const body = req.body;
  if (body.isActive === undefined) {
    return next(new AppError('isActive field (boolean) is required', 400));
  }

  req.workerId = workerId.toString().trim();
  req.isActive = typeof body.isActive === 'boolean' ? body.isActive : body.isActive === 'true';
  next();
};

const validateWorkerLeave = (req, res, next) => {
  const workerId = req.params?.id || req.body?._id || req.body?.id;
  if (!workerId || !isValidObjectId(workerId)) {
    return next(new AppError('Valid Worker ID is required', 400));
  }

  let leavingDate = new Date();
  if (req.body?.leavingDate) {
    const parsed = new Date(req.body.leavingDate);
    if (isNaN(parsed.getTime())) {
      return next(new AppError('Invalid leavingDate format', 400));
    }
    leavingDate = parsed;
  }

  req.workerId = workerId.toString().trim();
  req.leavingDate = leavingDate;
  next();
};

module.exports = {
  isValidObjectId,
  resolveGaushalaId,
  validateCreateDepartment,
  validateUpdateDepartment,
  validateCreateWorker,
  validateUpdateWorker,
  validateWorkerStatus,
  validateWorkerLeave,
};
