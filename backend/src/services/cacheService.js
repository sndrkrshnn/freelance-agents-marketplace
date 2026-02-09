const { getClient, isRedisAvailable, executeCommandWithFallback, cacheStats } = require('../config/redis');

let clientPromise = null;

/**
 * Get Redis client with lazy initialization
 */
async function getClientSafe() {
  if (!clientPromise) {
    clientPromise = getClient().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

/**
 * Cache service for generic caching operations
 */
class CacheService {
  constructor(options = {}) {
    this.prefix = options.prefix || process.env.CACHE_PREFIX || 'freelance_cache:';
    this.enabled = options.enabled !== undefined ? options.enabled : process.env.CACHE_ENABLED !== 'false';
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour default
  }

  /**
   * Build cache key with prefix
   */
  buildKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Serialize value for storage
   */
  serialize(value) {
    try {
      if (value === null || value === undefined) {
        return '';
      }
      return JSON.stringify(value);
    } catch (error) {
      console.error('Cache serialization error:', error);
      return '';
    }
  }

  /**
   * Deserialize value from storage
   */
  deserialize(value) {
    try {
      if (!value || value === '') {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      console.error('Cache deserialization error:', error);
      return value; // Return raw value if JSON parse fails
    }
  }

  /**
   * Check if caching is enabled
   */
  isEnabled() {
    return this.enabled && isRedisAvailable();
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);
      const value = await client.get(cacheKey);

      if (value !== null) {
        const deserialized = this.deserialize(value);
        cacheStats.incrementHit();
        return deserialized;
      }

      cacheStats.incrementMiss();
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      cacheStats.incrementError();
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);
      const serialized = this.serialize(value);

      if (ttl > 0) {
        await client.setEx(cacheKey, ttl, serialized);
      } else {
        await client.set(cacheKey, serialized);
      }

      cacheStats.incrementSet();
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      cacheStats.incrementError();
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);
      await client.del(cacheKey);
      cacheStats.incrementDelete();
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      cacheStats.incrementError();
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isEnabled()) {
      return 0;
    }

    try {
      const client = await getClientSafe();
      const searchPattern = this.buildKey(pattern);
      const keys = await client.keys(searchPattern);

      if (keys.length > 0) {
        await client.del(keys);
        cacheStats.incrementDelete(keys.length);
      }

      return keys.length;
    } catch (error) {
      console.error(`Cache delPattern error for pattern ${pattern}:`, error);
      cacheStats.incrementError();
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key) {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);
      const result = await client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key) {
    if (!this.isEnabled()) {
      return -2;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);
      return await client.ttl(cacheKey);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Set key expiration
   */
  async expire(key, ttl) {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);
      const result = await client.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache keys with the configured prefix
   */
  async flush() {
    if (!this.isEnabled()) {
      return 0;
    }

    try {
      const client = await getClientSafe();
      const pattern = this.buildKey('*');
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(keys);
        cacheStats.incrementDelete(keys.length);
      }

      return keys.length;
    } catch (error) {
      console.error('Cache flush error:', error);
      cacheStats.incrementError();
      return 0;
    }
  }

  /**
   * Get or set pattern (cache aside pattern)
   * Returns cached value if exists, otherwise sets and returns provided value
   */
  async getOrSet(key, valueFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await valueFn();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment counter (for rate limiting, etc.)
   */
  async increment(key, amount = 1) {
    if (!this.isEnabled()) {
      return 0;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);
      return await client.incrBy(cacheKey, amount);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment counter with expiration
   */
  async incrementWithExpire(key, amount, ttl) {
    if (!this.isEnabled()) {
      return 0;
    }

    try {
      const client = await getClientSafe();
      const cacheKey = this.buildKey(key);

      const result = await client.incrBy(cacheKey, amount);
      if (result === amount) {
        await client.expire(cacheKey, ttl);
      }

      return result;
    } catch (error) {
      console.error(`Cache incrementWithExpire error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get multiple keys
   */
  async getMany(keys) {
    if (!this.isEnabled() || keys.length === 0) {
      return {};
    }

    try {
      const client = await getClientSafe();
      const cacheKeys = keys.map((k) => this.buildKey(k));
      const values = await client.mGet(cacheKeys);

      const result = {};
      keys.forEach((key, index) => {
        result[key] = this.deserialize(values[index]);
        if (values[index] !== null) {
          cacheStats.incrementHit();
        } else {
          cacheStats.incrementMiss();
        }
      });

      return result;
    } catch (error) {
      console.error('Cache getMany error:', error);
      cacheStats.incrementError();
      return {};
    }
  }

  /**
   * Set multiple keys
   */
  async setMany(entries, ttl = this.defaultTTL) {
    if (!this.isEnabled() || entries.length === 0) {
      return false;
    }

    try {
      const client = await getClientSafe();

      if (ttl > 0) {
        // Use multi/transaction for atomic operations with TTL
        const multi = client.multi();
        for (const [key, value] of Object.entries(entries)) {
          const cacheKey = this.buildKey(key);
          multi.setEx(cacheKey, ttl, this.serialize(value));
        }
        await multi.exec();
      } else {
        const keyValuePairs = [];
        for (const [key, value] of Object.entries(entries)) {
          keyValuePairs.push(this.buildKey(key), this.serialize(value));
        }
        await client.mSet(keyValuePairs);
      }

      cacheStats.incrementSet(entries.length);
      return true;
    } catch (error) {
      console.error('Cache setMany error:', error);
      cacheStats.incrementError();
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys) {
    if (!this.isEnabled() || keys.length === 0) {
      return 0;
    }

    try {
      const client = await getClientSafe();
      const cacheKeys = keys.map((k) => this.buildKey(k));
      const result = await client.del(cacheKeys);
      cacheStats.incrementDelete(result);
      return result;
    } catch (error) {
      console.error('Cache delMany error:', error);
      cacheStats.incrementError();
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const stats = cacheStats.getStats();
    const redisAvailable = isRedisAvailable();

    if (redisAvailable) {
      try {
        const client = await getClientSafe();
        const info = await client.info('keyspace');
        const keyCount = (info.match(/db\d+:keys=(\d+)/) || [])[1] || '0';
        stats.redisKeys = keyCount;
        stats.redisConnected = true;
      } catch (error) {
        stats.redisConnected = false;
      }
    } else {
      stats.redisConnected = false;
    }

    stats.cacheEnabled = this.enabled;

    return stats;
  }
}

// Export singleton instance
const cacheService = new CacheService();

// Also export class for creating custom instances
module.exports = {
  CacheService,
  cacheService,
};
