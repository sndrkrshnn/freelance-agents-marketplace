const redis = require('redis');
const logger = require('./logger');

let client = null;
let isConnected = false;
let connectionAttempts = 0;
const maxRetries = parseInt(process.env.CACHE_MAX_RETRIES) || 3;

/**
 * Initialize Redis connection with retry logic
 */
async function initializeRedis() {
  if (client) {
    return client;
  }

  const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

  client = redis.createClient({
    url: redisUrl,
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB) || 0,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > maxRetries) {
          logger.error('Redis reconnection failed after max retries');
          return new Error('Redis reconnection failed');
        }
        const delay = Math.min(retries * 100, 3000);
        logger.info(`Redis reconnecting... attempt ${retries + 1}/${maxRetries}`);
        return delay;
      },
    },
    retry_strategy: function(options) {
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error('Retry time exhausted');
      }
      if (options.attempt > maxRetries) {
        return new Error('Max retries reached');
      }
      return Math.min(options.attempt * 100, 3000);
    },
  });

  client.on('connect', () => {
    isConnected = true;
    connectionAttempts = 0;
    logger.info('Redis connected successfully');
  });

  client.on('ready', () => {
    logger.info('Redis ready to accept commands');
  });

  client.on('error', (err) => {
    isConnected = false;
    logger.error('Redis error:', err.message);
  });

  client.on('end', () => {
    isConnected = false;
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', () => {
    connectionAttempts++;
    logger.info(`Redis reconnecting... attempt ${connectionAttempts}`);
  });

  try {
    await client.connect();
    logger.info('Redis initialization complete');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    isConnected = false;
  }

  return client;
}

/**
 * Get Redis client (initialize if not exists)
 */
async function getClient() {
  if (!client) {
    await initializeRedis();
  }
  return client;
}

/**
 * Check if Redis is connected and available
 */
function isRedisAvailable() {
  return isConnected && client && client.isOpen;
}

/**
 * Execute Redis command with graceful fallback
 */
async function executeCommand(command, ...args) {
  if (!isRedisAvailable()) {
    throw new Error('Redis not available');
  }

  try {
    return await client[command](...args);
  } catch (error) {
    logger.error(`Redis command ${command} failed:`, error);
    throw error;
  }
}

/**
 * Execute Redis command with fallback to null
 */
async function executeCommandWithFallback(command, ...args) {
  try {
    return await executeCommand(command, ...args);
  } catch (error) {
    logger.warn(`Redis command ${command} failed, returning fallback:`, error);
    return null;
  }
}

/**
 * Close Redis connection gracefully
 */
async function closeRedis() {
  if (client) {
    try {
      await client.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    if (!isRedisAvailable()) {
      return {
        connected: false,
        message: 'Redis not available',
      };
    }

    const info = await client.info('stats');
    const keyspace = await client.info('keyspace');

    return {
      connected: true,
      info: parseRedisInfo(info),
      keyspace: parseRedisInfo(keyspace),
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Parse Redis INFO command output
 */
function parseRedisInfo(info) {
  const lines = info.split('\n');
  const result = {};

  for (const line of lines) {
    if (line.includes(':')) {
      const [key, value] = line.split(':');
      result[key] = value;
    }
  }

  return result;
}

/**
 * Cache statistics tracking
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  sets: 0,
  deletes: 0,

  incrementHit() {
    this.hits++;
  },

  incrementMiss() {
    this.misses++;
  },

  incrementError() {
    this.errors++;
  },

  incrementSet() {
    this.sets++;
  },

  incrementDelete() {
    this.deletes++;
  },

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      sets: this.sets,
      deletes: this.deletes,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      missRate: total > 0 ? ((this.misses / total) * 100).toFixed(2) + '%' : '0%',
    };
  },

  resetStats() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.sets = 0;
    this.deletes = 0;
  },
};

module.exports = {
  initializeRedis,
  getClient,
  isRedisAvailable,
  executeCommand,
  executeCommandWithFallback,
  closeRedis,
  getCacheStats,
  cacheStats,
};
