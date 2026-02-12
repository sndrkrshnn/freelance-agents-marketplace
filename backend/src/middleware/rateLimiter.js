const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('../config/logger');

// Try to initialize Redis store if Redis is available
let redisClient;
try {
  const redis = require('redis');
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  redisClient.connect().catch(() => {
    logger.warn('Redis connection failed, falling back to memory rate limiting');
    redisClient = null;
  });
} catch (error) {
  logger.warn('Redis not available, falling back to memory rate limiting');
}

// Create store options
const getStoreOptions = (prefix) => {
  if (redisClient) {
    return {
      store: new RedisStore({
        client: redisClient,
        prefix: `rate_limit:${prefix}:`,
      }),
    };
  }
  return {};
};

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use both IP and user ID for rate limiting if authenticated
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`General rate limit exceeded for ${req.ip}${req.user?.id ? ` (user: ${req.user.id})` : ''}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
  ...getStoreOptions('general'),
});

// Stricter rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.',
    });
  },
  ...getStoreOptions('auth'),
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again later.',
    });
  },
  ...getStoreOptions('password_reset'),
});

// Task creation rate limiter
const taskCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 tasks per hour
  message: {
    success: false,
    message: 'Task creation limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn(`Task creation rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      success: false,
      message: 'Task creation limit exceeded. Please try again later.',
    });
  },
  ...getStoreOptions('task_creation'),
});

// Proposal submission rate limiter
const proposalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 proposals per hour
  message: {
    success: false,
    message: 'Proposal submission limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn(`Proposal rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      success: false,
      message: 'Proposal submission limit exceeded. Please try again later.',
    });
  },
  ...getStoreOptions('proposal'),
});

// Payment processing rate limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 payment attempts per hour
  message: {
    success: false,
    message: 'Payment processing limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn(`Payment rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      success: false,
      message: 'Payment processing limit exceeded. Please try again later.',
    });
  },
  ...getStoreOptions('payment'),
});

// Message sending rate limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    success: false,
    message: 'Message sending limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn(`Message rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      success: false,
      message: 'Message sending limit exceeded. Please slow down.',
    });
  },
  ...getStoreOptions('message'),
});

// File upload rate limiter
const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    message: 'File upload limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn(`File upload rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      success: false,
      message: 'File upload limit exceeded. Please try again later.',
    });
  },
  ...getStoreOptions('file_upload'),
});

// WebSocket message rate limiter
const wsMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: {
    success: false,
    message: 'Too many messages, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  handler: (req, res) => {
    logger.warn(`WebSocket message rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
    });
  },
  ...getStoreOptions('ws_message'),
});

// API search rate limiter
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    message: 'Search rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn(`Search rate limit exceeded for ${req.user?.id || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Search rate limit exceeded. Please slow down.',
    });
  },
  ...getStoreOptions('search'),
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  taskCreationLimiter,
  proposalLimiter,
  paymentLimiter,
  messageLimiter,
  fileUploadLimiter,
  wsMessageLimiter,
  searchLimiter,
};
