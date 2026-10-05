const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Populates req.user with the authenticated user document.
 */
const auth = asyncHandler(async (req, res, next) => {
  if (req.user) {
    return next();
  }

  if (!env.jwtSecret || Buffer.byteLength(env.jwtSecret) < 32) {
    throw new AppError('Authorization is not configured', 503);
  }

  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new AppError('A bearer token is required', 401);
  }

  let claims;
  try {
    claims = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }

  if (typeof claims.userId !== 'string' || !mongoose.isValidObjectId(claims.userId)) {
    throw new AppError('Invalid or expired access token', 401);
  }

  const user = await User.findOne({
    _id: claims.userId,
    isDeleted: false,
    isActive: true,
  }).populate('roleId', 'roleName');

  if (!user) {
    throw new AppError('User is not active', 401);
  }

  req.user = user;
  next();
});

module.exports = auth;
