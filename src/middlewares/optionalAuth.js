const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
  try {
    if (req.user) {
      return next();
    }

    const authHeader = req.get('authorization') || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() === 'bearer' && token && env.jwtSecret) {
      const claims = jwt.verify(token, env.jwtSecret);
      if (typeof claims.userId === 'string' && mongoose.isValidObjectId(claims.userId)) {
        const user = await User.findOne({
          _id: claims.userId,
          isDeleted: false,
          isActive: true,
        }).populate('roleId', 'roleName');
        if (user) {
          req.user = user;
        }
      }
    }
  } catch (error) {
    // Optional auth silently proceeds if no valid credentials provided
  }
  next();
};

module.exports = optionalAuth;
