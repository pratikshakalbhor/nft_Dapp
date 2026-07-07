const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details
  logger.error(`${err.message} - Route: ${req.originalUrl} - Method: ${req.method}`, err);

  // Development environment response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Production response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Non-operational fallback
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred. Please try again later.'
  });
};
