const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  } else if (err.code === 11000) {
    statusCode = 409;
    if (err.keyPattern?.tag_id || (typeof err.message === 'string' && err.message.includes('tag_id'))) {
      message = 'Cow with this tag ID already exists';
    } else {
      message = 'A record with this value already exists';
    }
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  if (statusCode >= 500) {
    console.error(err);
    message = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
};

module.exports = errorHandler;
