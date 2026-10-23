const { isProduction } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

function notFound(_req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
}

function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Email is already registered';
    details = [{ field: 'email', message: 'Email is already registered' }];
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
  }

  const payload = {
    success: false,
    message: statusCode === 500 && isProduction() ? 'Internal server error' : message,
  };

  if (details) {
    payload.errors = details;
  }

  if (!isProduction() && statusCode === 500) {
    payload.debug = err.message;
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  notFound,
  errorHandler,
  ApiError,
};
