const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { isSuperAdmin, isAdmin } = require('../utils/roles');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/**
 * Middleware validator for adding a new user.
 */
const validateAddUser = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return next(new AppError('Request body is required', 400));
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  let gaushalaId =
    typeof body.gaushalaId === 'string' && body.gaushalaId.trim()
      ? body.gaushalaId.trim()
      : typeof body.gaushala_id === 'string' && body.gaushala_id.trim()
        ? body.gaushala_id.trim()
        : '';

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
          new AppError(`Access denied: ${roleLabel} can only add users to their assigned gaushala`, 403),
        );
      }
      gaushalaId = userGaushalaStr;
    }
  }

  const roleId =
    typeof body.roleId === 'string' && body.roleId.trim()
      ? body.roleId.trim()
      : typeof body.role_id === 'string' && body.role_id.trim()
        ? body.role_id.trim()
        : '';
  const emailId =
    typeof body.emailId === 'string' && body.emailId.trim()
      ? body.emailId.trim().toLowerCase()
      : typeof body.email === 'string' && body.email.trim()
        ? body.email.trim().toLowerCase()
        : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) {
    return next(new AppError('Name is required', 400));
  }
  if (!gaushalaId) {
    return next(new AppError('Gaushala is required', 400));
  }
  if (!isValidObjectId(gaushalaId)) {
    return next(new AppError('Invalid Gaushala ID format', 400));
  }
  if (!roleId) {
    return next(new AppError('Role is required', 400));
  }
  if (!isValidObjectId(roleId)) {
    return next(new AppError('Invalid Role ID format', 400));
  }
  if (!emailId) {
    return next(new AppError('Email is required', 400));
  }
  if (!EMAIL_PATTERN.test(emailId)) {
    return next(new AppError('Enter a valid email address', 400));
  }
  if (!username) {
    return next(new AppError('Username is required', 400));
  }
  if (!password) {
    return next(new AppError('Password is required', 400));
  }
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }

  let isActive = true;
  if (body.isActive !== undefined) {
    isActive = typeof body.isActive === 'boolean' ? body.isActive : body.isActive === 'true';
  } else if (body.is_active !== undefined) {
    isActive = typeof body.is_active === 'boolean' ? body.is_active : body.is_active === 'true';
  }

  const fcmToken =
    typeof body.fcmToken === 'string'
      ? body.fcmToken.trim()
      : typeof body.fcm_token === 'string'
        ? body.fcm_token.trim()
        : null;

  req.validatedData = {
    name,
    gaushalaId,
    roleId,
    emailId,
    username,
    password,
    isActive,
    fcmToken: fcmToken || null,
    isDeleted: false,
  };

  next();
};

/**
 * Middleware validator for updating an existing user.
 */
const validateUpdateUser = (req, res, next) => {
  const userId = req.params?.id || req.body?._id || req.body?.id;
  if (!userId || !isValidObjectId(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return next(new AppError('Request body with fields to update is required', 400));
  }

  const sanitizedData = {};

  const user = req.user;
  if (user && !isSuperAdmin(user) && user.gaushalaId) {
    const updatedGaushala = body.gaushalaId || body.gaushala_id;
    if (updatedGaushala && updatedGaushala.toString().trim() !== (user.gaushalaId._id || user.gaushalaId).toString()) {
      const roleLabel = isAdmin(user) ? 'Admin' : 'User';
      return next(new AppError(`Access denied: ${roleLabel} can only update users within their assigned gaushala`, 403));
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return next(new AppError('Name cannot be empty', 400));
    }
    sanitizedData.name = body.name.trim();
  }

  const gaushalaId = body.gaushalaId !== undefined ? body.gaushalaId : body.gaushala_id;
  if (gaushalaId !== undefined) {
    if (typeof gaushalaId !== 'string' || !gaushalaId.trim() || !isValidObjectId(gaushalaId)) {
      return next(new AppError('Valid gaushalaId is required', 400));
    }
    sanitizedData.gaushalaId = gaushalaId.trim();
  }

  const roleId = body.roleId !== undefined ? body.roleId : body.role_id;
  if (roleId !== undefined) {
    if (typeof roleId !== 'string' || !roleId.trim() || !isValidObjectId(roleId)) {
      return next(new AppError('Valid roleId is required', 400));
    }
    sanitizedData.roleId = roleId.trim();
  }

  const emailId = body.emailId !== undefined ? body.emailId : body.email;
  if (emailId !== undefined) {
    if (typeof emailId !== 'string' || !emailId.trim() || !EMAIL_PATTERN.test(emailId.trim())) {
      return next(new AppError('Enter a valid email address', 400));
    }
    sanitizedData.emailId = emailId.trim().toLowerCase();
  }

  if (body.username !== undefined) {
    if (typeof body.username !== 'string' || !body.username.trim()) {
      return next(new AppError('Username cannot be empty', 400));
    }
    sanitizedData.username = body.username.trim();
  }

  if (body.password !== undefined) {
    if (typeof body.password !== 'string' || body.password.length < 8) {
      return next(new AppError('Password must be at least 8 characters long', 400));
    }
    sanitizedData.password = body.password;
  }

  const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
  if (isActive !== undefined) {
    sanitizedData.isActive = typeof isActive === 'boolean' ? isActive : isActive === 'true';
  }

  const fcmToken = body.fcmToken !== undefined ? body.fcmToken : body.fcm_token;
  if (fcmToken !== undefined) {
    sanitizedData.fcmToken = typeof fcmToken === 'string' ? fcmToken.trim() : null;
  }

  req.userId = userId.toString().trim();
  req.validatedData = sanitizedData;
  next();
};

module.exports = {
  validateAddUser,
  validateUpdateUser,
  isValidObjectId,
};
