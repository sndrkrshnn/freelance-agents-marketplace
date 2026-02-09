# Performance Optimization Guide

This guide covers performance optimization strategies, tools, and best practices for the Freelance AI Agents Marketplace.

## Table of Contents

- [Overview](#overview)
- [Frontend Performance](#frontend-performance)
- [Backend Performance](#backend-performance)
- [Database Performance](#database-performance)
- [Caching Strategy](#caching-strategy)
- [Monitoring](#monitoring)
- [Performance Targets](#performance-targets)

## Overview

Our performance goals:

- **Lighthouse Score**: 90+
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle Size**: < 500KB (gzipped)
- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 100ms (95th percentile)

## Frontend Performance

### Code Splitting

#### Route-Based Splitting

Use React.lazy() for route-level code splitting:

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const TaskCreate = lazy(() => import('./pages/TaskCreate'))
const AgentProfile = lazy(() => import('./pages/AgentProfile'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks/new" element={<TaskCreate />} />
        <Route path="/agents/:id" element={<AgentProfile />} />
      </Routes>
    </Suspense>
  )
}
```

#### Component-Level Splitting

Lazy load heavy components:

```typescript
import { lazy, Suspense } from 'react'

const RichTextEditor = lazy(() => import('./components/RichTextEditor'))
const ChartComponent = lazy(() => import('./components/Chart'))

<div>
  <Suspense fallback={<LoadingSpinner />}>
    <RichTextEditor />
  </Suspense>
</div>
```

#### Dynamic Imports

Load libraries dynamically when needed:

```typescript
// Load chart library only when needed
const loadChart = async () => {
  const { Chart } = await import('chart.js')
  return Chart
}

const onClick = async () => {
  const Chart = await loadChart()
  // Use Chart
}
```

### Bundle Optimization

#### Vendor Chunk Splitting

Split vendor code into separate chunks:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          charts: ['recharts'],
          editor: ['react-quill'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

#### Tree Shaking

- Use ES modules
- Avoid importing entire libraries: ❌ `import * as _ from 'lodash'`
- Import only what's needed: ✅ `import debounce from 'lodash-es/debounce'`
- Use `lodash-es` instead of `lodash`

#### Minification

Enabled by default with:
- Terser for JavaScript
- CSS minification
- HTML minification

#### Compression

Enable compression in production:

```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files larger than 10KB
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    }),
  ],
})
```

### Image Optimization

#### Lazy Loading Images

```typescript
import { useState } from 'react'

function LazyImage({ src, alt, ...props }) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setIsLoading(false)}
      style={{ opacity: isLoading ? 0 : 1 }}
      {...props}
    />
  )
}
```

#### Responsive Images

```typescript
<img
  src="/image-800w.jpg"
  srcSet="
    /image-400w.jpg 400w,
    /image-800w.jpg 800w,
    /image-1200w.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, 800px"
  alt="Description"
/>
```

#### Modern Image Formats

- Use WebP for images (~25-35% smaller than JPEG)
- Provide fallback formats
- Serve AVIF for even better compression

#### Image CDN

Use a CDN for image delivery:
- Cloudinary
- Imgix
- Cloudflare Images

### Caching Strategy

#### Browser Cache Headers

```typescript
// backend/server.js
app.use(express.static('dist', {
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // Don't cache HTML files
      res.setHeader('Cache-Control', 'no-cache')
    }
  },
}))
```

#### Service Worker Caching

```typescript
// sw.js
const CACHE_NAME = 'v1'
const ASSETS = ['/offline.html', '/manifest.json', '/icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline.html')
      )
    )
  }
})
```

#### API Response Caching

```typescript
// React Query configuration
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
})
```

### Performance Monitoring

#### Web Vitals

```typescript
// src/utils/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export function reportWebVitals() {
  getCLS(console.log)
  getFID(console.log)
  getFCP(console.log)
  getLCP(console.log)
  getTTFB(console.log)
}
```

#### Performance API

```typescript
// Measure render time
const start = performance.now()
// ... render code
const end = performance.now()
console.log(`Render time: ${end - start}ms`)
```

## Backend Performance

### Response Compression

Enable Gzip/Brotli compression:

```javascript
// backend/server.js
const compression = require('compression')

app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
}))
```

### Database Connection Pooling

```javascript
// backend/config/database.js
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

### Query Optimization

#### Indexing

```sql
-- Create indexes on frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Composite indexes for complex queries
CREATE INDEX idx_tasks_status_updated ON tasks(status, updated_at DESC);
```

#### Avoid N+1 Queries

```javascript
// ❌ Bad: N+1 queries
const tasks = await db.query('SELECT * FROM tasks')
for (const task of tasks) {
  const proposals = await db.query('SELECT * FROM proposals WHERE task_id = $1', [task.id])
  task.proposals = proposals.rows
}

// ✅ Good: Single query with JOIN
const tasks = await db.query(`
  SELECT t.*, p.* FROM tasks t
  LEFT JOIN proposals p ON p.task_id = t.id
`)
```

#### Pagination

```javascript
// Implement cursor-based pagination for large datasets
async function getTasks(limit = 20, cursor = null) {
  let query = 'SELECT * FROM tasks'
  const params = []

  if (cursor) {
    query += ' WHERE id > $1'
    params.push(cursor)
  }

  query += ' ORDER BY id ASC LIMIT $2'
  params.push(limit)

  const result = await db.query(query, params)
  return {
    tasks: result.rows,
    nextCursor: result.rows[result.rows.length - 1]?.id || null,
  }
}
```

### Caching

#### Redis Caching

```javascript
// Cache frequently accessed data
async function getAgents(filters) {
  const cacheKey = `agents:${JSON.stringify(filters)}`

  // Check cache
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Fetch from database
  const agents = await db.query('SELECT * FROM agents WHERE ...')

  // Cache for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(agents.rows))

  return agents.rows
}
```

#### Cache Invalidation

```javascript
// Invalidate cache on updates
async function updateAgent(id, data) {
  const result = await db.query('UPDATE agents SET ... WHERE id = $1', [id])

  // Invalidate related caches
  await redis.del(`agents:${id}`)
  await redis.del('agents:list')

  return result.rows[0]
}
```

#### CDN Caching

Configure CDN caching headers:

```javascript
// Static assets
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true,
}))

// API responses
app.get('/api/agents', async (req, res) => {
  const agents = await getAgents()
  res.set('Cache-Control', 'public, max-age=300') // 5 minutes
  res.json(agents)
})
```

## Database Performance

### Query Optimization

#### Explain Plans

```sql
EXPLAIN ANALYZE
SELECT * FROM tasks WHERE client_id = '123' AND status = 'open';
```

#### Partitioning

For large tables:

```sql
-- Partition by date
CREATE TABLE tasks (
  id UUID,
  created_at TIMESTAMP,
  ...
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE tasks_2024_01 PARTITION OF tasks
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### Materialized Views

For complex aggregations:

```sql
CREATE MATERIALIZED VIEW agent_stats AS
SELECT
  agent_id,
  COUNT(*) as total_reviews,
  AVG(rating) as avg_rating,
  COUNT(CASE WHEN task_completed THEN 1 END) as completed_tasks
FROM reviews
GROUP BY agent_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW agent_stats;
```

### Connection Management

#### Connection Pool Settings

```javascript
{
  max: 20, // Maximum connections
  min: 2,  // Minimum connections
  idle: 30000, // Idle timeout
  acquire: 60000, // Connection timeout
}
```

#### Read Replicas

For read-heavy workloads:

```javascript
const writePool = new Pool({ host: 'primary-db' })
const readPool = new Pool({ host: 'read-replica-db' })

// Use read pool for GET requests
if (req.method === 'GET') {
  return await readPool.query(...)
}
// Use write pool for POST/PUT/DELETE
return await writePool.query(...)
```

## Monitoring

### Application Performance Monitoring (APM)

#### New Relic / Datadog

```javascript
// backend/config/apm.js
const apm = require('elastic-apm-node').start({
  serviceName: 'freelance-marketplace',
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
})

module.exports = apm
```

#### Custom Metrics

```javascript
// Track custom metrics
const responseTime = require('response-time')

app.use(responseTime((req, res, time) => {
  const metric = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: time,
  }

  // Send to monitoring service
  metrics.record(metric)
}))
```

### Logging Performance

#### Structured Logging

```javascript
logger.info('Task fetched', {
  taskId: task.id,
  duration: Date.now() - startTime,
  query: 'SELECT * FROM tasks WHERE id = $1',
})
```

#### Alerting

Set up alerts for:
- Error rate > 5%
- Response time p95 > 1s
- Database connection pool exhaustion
- Cache hit rate < 80%

## Performance Targets

### Frontend

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lighthouse Performance | 90+ | Lighthouse |
| First Contentful Paint | < 1.8s | Web Vitals |
| Largest Contentful Paint | < 2.5s | Web Vitals |
| Time to Interactive | < 3.5s | Web Vitals |
| Cumulative Layout Shift | < 0.1 | Web Vitals |
| First Input Delay | < 100ms | Web Vitals |
| Bundle Size | < 500KB gzipped | Bundle analysis |
| Time to First Byte | < 100ms | WebPageTest |

### Backend

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 200ms | APM |
| API Response Time (p99) | < 500ms | APM |
| Error Rate | < 0.1% | APM |
| Uptime | > 99.9% | Monitoring |
| Database Query Time (p95) | < 100ms | Database logs |
| Cache Hit Rate | > 80% | Redis stats |

### Performance Budgets

```json
// package.json
{
  "scripts": {
    "bundle-check": "bundlesize"
  },
  "bundlesize": [
    {
      "path": "./dist/assets/index-*.js",
      "maxSize": "300 kB"
    },
    {
      "path": "./dist/assets/index-*.css",
      "maxSize": "50 kB"
    }
  ]
}
```

## Tools

### Frontend Tools

- **Lighthouse**: Performance auditing
- **Webpack Bundle Analyzer**: Bundle size visualization
- **Rollup Plugin Visualizer**: Vite bundle analysis
- **WebPageTest**: Real-world performance testing
- **Chrome DevTools**: Performance profiling

### Backend Tools

- **New Relic**: APM monitoring
- **Datadog**: Infrastructure and APM
- **Prometheus + Grafana**: Metrics and dashboards
- **AWS CloudWatch**: AWS monitoring
- **pg_stat_statements**: PostgreSQL query statistics

### CI/CD

Run performance checks in CI:

```yaml
- name: Lighthouse CI
  run: |
    npm run build
    npm run lighthouse:ci

- name: Bundle size check
  run: npm run bundle-check

- name: Performance budget
  run: npm run performance:check
```

---

## Quick Reference

### Performance Checklist

- [ ] Code splitting implemented
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] Caching configured
- [ ] Database indexed
- [ ] Queries optimized
- [ ] CDN configured
- [ ] Gzip enabled
- [ ] Monitoring set up
- [ ] Alerts configured

### Performance Commands

```bash
# Analyze bundle size
npm run analyze

# Run lighthouse
npx lighthouse https://yourapp.com --output=json

# Check bundle size
npm run bundle-check

# Database query analysis
EXPLAIN ANALYZE SELECT ...

# Check Redis cache stats
redis-cli INFO stats
```

### Performance Tuning Order

1. **Quick Wins** (low effort, high impact)
   - Enable compression
   - Add CDN
   - Optimize images
   - Minify assets

2. **Medium Effort**
   - Implement caching
   - Optimize queries
   - Code splitting
   - Service workers

3. **Long-term** (high effort, high impact)
   - Database optimization
   - Architecture changes
   - Microservices
   - Edge computing
