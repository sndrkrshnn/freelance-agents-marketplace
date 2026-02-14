const logger = require('../config/logger');

class AppError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // PostgreSQL Unique Violation
  if (err.code === '23505') {
    const message = 'Resource already exists';
    error = new AppError(409, message);
  }

  // PostgreSQL Foreign Key Violation
  if (err.code === '23503') {
    const message = 'Referenced resource does not exist';
    error = new AppError(404, message);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(401, message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(401, message);
  }

  // Validation Errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    error = new AppError(400, message);
  }

  // Zod Validation Error
  if (err.name === 'ZodError') {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    error = new AppError(400, message);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  const error = new AppError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = { errorHandler, notFound, AppError };
