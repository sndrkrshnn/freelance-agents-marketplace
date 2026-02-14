# Redis Setup on Render.com

Complete guide for setting up and configuring Redis for the Freelance AI Agents Marketplace.

## Table of Contents

1. [Overview](#overview)
2. [Create Redis Instance](#create-redis-instance)
3. [Connection Configuration](#connection-configuration)
4. [Use Cases](#use-cases)
5. [Testing Connectivity](#testing-connectivity)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Redis on Render provides:

- **Free Tier**: 25MB in-memory storage
- **10 max connections**
- **Automatic SSL**
- **Persistent connection URL**
- **LRU eviction policy**

### Why Use Redis?

- ✅ **Fast**: In-memory storage (sub-millisecond latency)
- ✅ **Caching**: Reduce database load
- ✅ **Rate Limiting**: Distributed rate limiting
- ✅ **Sessions**: Fast session storage
- ✅ **Pub/Sub**: Real-time messaging
- ✅ **Free**: No cost on free tier

---

## Create Redis Instance

### Steps

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"**
3. Select **"Redis"**
4. Configure:

   **Basic Settings:**
   - **Name**: `freelance-agents-marketplace-redis`
   - **Region**: Oregon
   - **Plan**: Free

   **Advanced Settings:**
   - **Maxmemory Policy**: `allkeys-lru`
     - `volatile-lru`: Evict least recently used with TTL set
     - `allkeys-lru`: Evict any least recently used (recommended)
     - `volatile-ttl`: Evict keys with shortest TTL

5. Click **"Create Redis"**

### Get Connection Details

After creation, you'll see:

```
Internal URL: redis://red-xxxxx.renderhost:6379
External URL: redis://default:password@red-xxxxx.renderhost:6379
```

**Important**: Use the **Internal URL** in your application for better performance and security.

---

## Connection Configuration

### Backend Configuration

Add to `backend/src/config/redis.js`:

```javascript
const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              return new Error('Max reconnection retries reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  async healthCheck() {
    if (!this.isConnected) {
      return { status: 'disconnected' };
    }
    try {
      const pong = await this.client.ping();
      return { status: ping === 'PONG' ? 'connected' : 'error' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

// Auto-connect on start
if (process.env.REDIS_URL) {
  redisClient.connect().catch(console.error);
}

module.exports = redisClient;
```

### Environment Variables

Add to Render web service environment:

```env
# Redis connection URL (auto-populated by Render)
REDIS_URL=redis://red-xxxxx.renderhost:6379
```

---

## Use Cases

### 1. Caching API Responses

```javascript
const redisClient = require('../config/redis');
const { promisify } = require('util');

// Cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const client = redisClient.getClient();
      const cached = await client.get(key);
      
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache response
      res.json = (data) => {
        client.setEx(key, duration, JSON.stringify(data));
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      // If Redis fails, continue without caching
      console.error('Cache error:', error);
      next();
    }
  };
};

// Usage
app.get('/api/v1/projects', cache(300), getProjects);
```

### 2. Rate Limiting

```javascript
const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');

const createRateLimiter = (windowMs, max) => {
  return RateLimit({
    store: new RedisStore({
      client: redisClient.getClient(),
      prefix: 'rate-limit:',
    }),
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests, please try again later.',
    },
  });
};

// Apply to routes
app.use('/api/v1/auth', createRateLimiter(15 * 60 * 1000, 5)); // 5 per 15min
app.use('/api/v1/projects', createRateLimiter(15 * 60 * 1000, 100)); // 100 per 15min
```

### 3. Session Storage

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redisClient = require('../config/redis');

app.use(
  session({
    store: new RedisStore({ client: redisClient.getClient() }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
```

### 4. Caching User Sessions/JWT

```javascript
// Cache user data after JWT verification
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try to get from cache
    const cacheKey = `user:${decoded.userId}`;
    const client = redisClient.getClient();
    const cachedUser = await client.get(cacheKey);
    
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }
    
    // Get from database
    const user = await getUserById(decoded.userId);
    
    // Cache for 5 minutes
    await client.setEx(cacheKey, 300, JSON.stringify(user));
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### 5. Real-time Stats

```javascript
// Track active users
app.get('/api/v1/users/login', async (req, res) => {
  const userId = req.user.id;
  const client = redisClient.getClient();
  
  // Set active user with TTL
  await client.setEx(`active:user:${userId}`, 900, Date.now()); // 15min
  
  res.json({ success: true });
});

// Get active user count
app.get('/api/v1/stats/online', async (req, res) => {
  const client = redisClient.getClient();
  const keys = await client.keys('active:user:*');
  
  res.json({ onlineUsers: keys.length });
});
```

---

## Testing Connectivity

### 1. Test Redis Connection

After deployment, test Redis:

```bash
# SSH into your Render container (optional)
# Or test via API endpoint

curl https://your-api.onrender.com/api/v1/health/redis
```

Add endpoint to `backend/src/routes/health.js`:

```javascript
const redisClient = require('../config/redis');

router.get('/redis', async (req, res) => {
  try {
    const client = redisClient.getClient();
    await client.ping();
    res.json({
      success: true,
      status: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
```

### 2. Test Caching

```bash
# First call (cache miss)
curl -w "\nTime: %{time_total}s\n" https://your-api.onrender.com/api/v1/projects

# Second call (cache hit - should be faster)
curl -w "\nTime: %{time_total}s\n" https://your-api.onrender.com/api/v1/projects
```

### 3. Test Rate Limiting

```bash
# Make 6 requests (exceeds limit of 5)
for i in {1..6}; do
  curl -X POST https://your-api.onrender.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}'
  echo ""
done
```

Expected: First 5 succeed, 6th returns 429 error.

---

## Best Practices

### 1. Use Appropriate TTL

```javascript
// Short TTL for frequently changing data
await client.setEx('user:profile:123', 60, userData); // 1 minute

// Medium TTL for relatively stable data
await client.setEx('projects:featured', 300, featuredProjects); // 5 minutes

// Long TTL for rarely changing data
await client.setEx('settings:app', 3600, appSettings); // 1 hour
```

### 2. Use Meaningful Keys

```javascript
// Good keys
const userKey = `user:${userId}`;
const sessionKey = `session:${sessionId}`;
const cacheKey = `cache:${req.originalUrl}`;
const rateLimitKey = `rate-limit:${ip}:${endpoint}`;

// Avoid generic keys
await client.set('data', value); // Bad
await client.set('user:123', value); // Good
```

### 3. Handle Redis Gracefully

```javascript
// Always handle Redis failures
try {
  const client = redisClient.getClient();
  await client.get(key);
} catch (error) {
  // Fallback to database
  const data = await db.query('SELECT ...');
  return data;
}
```

### 4. Clean Up Old Data

```javascript
// Set TTL on all keys to prevent memory bloat
await client.setEx(key, TTL, value);

// Or periodically clean up
const cleanUp = async () => {
  const client = redisClient.getClient();
  const keys = await client.keys('temp:*');
  if (keys.length > 0) {
    await client.del(keys);
  }
};

// Run cleanup every hour
setInterval(cleanUp, 60 * 60 * 1000);
```

### 5. Monitor Memory Usage

```javascript
// Check memory usage
const checkMemory = async () => {
  const client = redisClient.getClient();
  const info = await client.info('memory');
  console.log('Redis Memory:', info);
};
```

### 6. Use Connection Pooling (if needed)

For the free tier, single connection is sufficient. For higher usage:

```javascript
// Use Redis cluster or multiple connections
// (Not needed for free tier)
```

---

## Troubleshooting

### Issue: Connection Refused

**Symptoms:**
- `ECONNREFUSED` error
- Redis appears offline

**Solutions:**
1. Verify REDIS_URL is correct
2. Check Redis service status in Render Dashboard
3. Ensure Redis is in the same region as web service
4. Check if free tier Redis is still active

### Issue: Connection Dropped

**Symptoms:**
- Redis disconnects randomly
- Performance degrades

**Solutions:**
1. Implement reconnection logic (done in `redis/config.js`)
2. Keep connection usage minimal
3. Check if hitting connection limit (10 max)
4. Ensure proper error handling

### Issue: Out of Memory

**Symptoms:**
- Keys being evicted frequently
- High memory usage warnings

**Solutions:**
1. Reduce cache TTL
2. Implement key expiration
3. Clean up unused keys
4. Use `allkeys-lru` eviction policy
5. Monitor memory usage regularly

### Issue: Slow Performance

**Symptoms:**
- Cache responses are not faster than DB
- High latency

**Solutions:**
1. Check Render region alignment
2. Use Internal URL (not External URL)
3. Minimize payload size
4. Use Redis data structures efficiently
5. Monitor connection pool

### Issue: Data Loss on Restart

**Symptoms:**
- Cache cleared after Redis restart
- Expected behavior on free tier

**Solution:**
This is normal on free tier. Redis on Render free tier is memory-only. For persistent data:
- Use PostgreSQL for important data
- Use Redis only for caching (can be reconstructed)

### Issue: Connection Limit Exceeded

**Symptoms:**
- `ERR max number of clients reached`
- Some requests fail

**Solutions:**
1. Use connection pooling
2. Reduce number of concurrent Redis clients
3. Implement fallback to database
4. Consider upgrading to paid Redis plan

---

## Free Tier Limitations

### What's Available

- ✅ 25MB memory
- ✅ 10 connections
- ✅ LRU eviction
- ✅ SSL support
- ✅ Internal network access

### What's Not Available

- ❌ Persistence (data lost on restart)
- ❌ Clustering
- ❌ More than 10 connections
- ❌ Larger memory (25MB limit)
- ❌ Multiple databases

### Workarounds

1. **No persistence**: Use Redis for caching only, not for storage
2. **Limited connections**: Use connection pooling and efficient reuse
3. **Small memory**: Short TTL, aggressive cleanup, cache optimization

---

## Monitoring

### Check Redis Stats

Add monitoring endpoint:

```javascript
router.get('/redis-stats', async (req, res) => {
  try {
    const client = redisClient.getClient();
    const info = await client.info();
    const memory = await client.info('memory');
    
    res.json({
      info: info,
      memory: memory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Key Metrics to Monitor

- **Memory Usage**: Stay below 25MB
- **Connection Count**: Stay below 10
- **Key Count**: monitor cache size
- **Commands/sec**: Performance indicator
- **Hit Ratio**: Percentage of cache hits

### Alert Thresholds

```javascript
// Set up alerts for:
if (
  memoryUsage > 20000000 || // > 20MB
  connectionCount > 8 ||    // > 8 connections
  keyCount > 1000           // Too many keys
) {
  // Send alert
  console.error('Redis threshold exceeded');
}
```

---

## Example: Complete Cache Implementation

```javascript
// backend/src/utils/cache.js
const redisClient = require('../config/redis');

class CacheService {
  async get(key) {
    try {
      const client = redisClient.getClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    try {
      const client = redisClient.getClient();
      await client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      const client = redisClient.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern) {
    try {
      const client = redisClient.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  async invalidateUser(userId) {
    return this.deletePattern(`user:${userId}*`);
  }

  async invalidateProject(projectId) {
    return this.deletePattern(`project:${projectId}*`);
  }

  async clearAll() {
    try {
      const client = redisClient.getClient();
      await client.flushDb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();
```

---

**Last Updated**: 2026-02-09
