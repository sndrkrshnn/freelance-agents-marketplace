# Deployment Guide: Render.com (Free Tier)

Complete deployment guide for the Freelance AI Agents Marketplace on Render.com with zero cost.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Free Tier Specifications](#free-tier-specifications)
5. [Quick Start](#quick-start)
6. [Backend Deployment (Render)](#backend-deployment-render)
7. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
8. [Post-Deployment Setup](#post-deployment-setup)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [Cost Optimization](#cost-optimization)

---

## Overview

This guide describes how to deploy the Freelance AI Agents Marketplace completely free using:

- **Backend** → Render.com (Web Service + PostgreSQL + Redis)
- **Frontend** → Vercel
- **Total Cost** → $0/month

### Features Include

- ✅ Full production deployment
- ✅ Automated SSL certificates
- ✅ Git-based deployment
- ✅ Health monitoring
- ✅ Database backups (PostgreSQL)
- ✅ Redis caching
- ✅ Automatic scaling (free tier limits)
- ✅ Custom domain support
- ✅ WebSocket support

---

## Prerequisites

### Required Accounts

- [GitHub Account](https://github.com/join)
- [Render.com Account](https://render.com/register) (Free tier)
- [Vercel Account](https://vercel.com/signup) (Free tier)
- (Optional) Custom domain (e.g., Namecheap, GoDaddy)

### Required Tools

- Git
- Node.js 18+
- Command line/terminal

### Project Files

Ensure your project has:
- ✅ `render.yaml` configuration
- ✅ `backend/Dockerfile.render` optimized for Render
- ✅ `frontend/vercel.json` configuration
- ✅ Environment variables configured

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Users                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Frontend (Vercel)                                  │
│  - React + TypeScript                               │
│  - Static Site Generation                           │
│  - Global CDN                                       │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────┐
│  Backend API (Render Web Service)                   │
│  - Node.js + Express                                │
│  - REST API                                         │
│  - WebSocket Support                                │
│  - Health Checks                                    │
└────────┬──────────────────────────┬─────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐       ┌─────────────────┐
│  PostgreSQL     │       │  Redis          │
│  (Render DB)    │       │  (Render Cache) │
│  - 512MB store  │       │  - 25MB cache   │
│  - Auto backup  │       │  - Fast access  │
└─────────────────┘       └─────────────────┘
```

---

## Free Tier Specifications

### Render Web Service (Backend)

| Resource | Limit | Notes |
|----------|-------|-------|
| RAM | 512 MB | Shared CPU |
| CPU | 0.1 vCPU | ~10% of standard |
| Storage | 10 GB | Ephemeral |
| Bandwidth | 100 GB/month | |
| Sleep | 15 min inactivity | Spins down after 15min |
| Wake-up | ~10 seconds | Cold start time |

**Important**: The backend will spin down after 15 minutes of inactivity. The first request after spin-down may take 5-10 seconds.

### Render PostgreSQL

| Resource | Limit | Notes |
|----------|-------|-------|
| RAM | 512 MB | |
| Storage | 512 MB | Included |
| Connections | 90 | Max concurrent |
| Backups | Daily | 7-day retention |
| SSL | Required | Automatic |

### Render Redis

| Resource | Limit | Notes |
|----------|-------|-------|
| RAM | 25 MB | In-memory only |
| Connections | 10 | Max concurrent |
| Eviction | LRU | Least Recently Used |

### Vercel (Frontend)

| Resource | Limit | Notes |
|----------|-------|-------|
| Bandwidth | 100 GB/month | |
| Builds | 6,000/month | |
| Functions | 100 GB-hours/month | |
| Deployment | Automatic | On git push |
| CDN | Global | Included |

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone and navigate to project directory
cd freelance-agents-marketplace

# Run the setup script
./scripts/setup-render.sh
```

Follow the interactive prompts to configure and deploy.

### Option 2: Manual Setup

Follow the detailed steps in this document.

---

## Backend Deployment (Render)

### Step 1: Prepare Repository

1. Ensure `render.yaml` is in your repository root
2. Commit and push all changes to GitHub

```bash
git add render.yaml backend/Dockerfile.render
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"**
3. Select **"PostgreSQL"**
4. Configure:
   - **Name**: `freelance-agents-marketplace-db`
   - **Database**: `freelance_agents_marketplace`
   - **User/Password**: Generate automatically
   - **Region**: Oregon (recommended for free tier)
   - **Plan**: Free
5. Click **"Create Database"**

6. **Important**: Copy the **Internal Database URL** for later:
   ```
   postgres://user:password@host:5432/database
   ```

### Step 3: Create Redis Instance

1. Go to Render Dashboard
2. Click **"New +"**
3. Select **"Redis"**
4. Configure:
   - **Name**: `freelance-agents-marketplace-redis`
   - **Region**: Oregon
   - **Max Memory Policy**: `allkeys-lru`
   - **Plan**: Free
5. Click **"Create Redis"**

6. **Important**: Copy the **Internal Redis URL**:
   ```
   redis://host:port
   ```

### Step 4: Create Backend Web Service

1. Go to Render Dashboard
2. Click **"New +"**
3. Select **"Web Service"**
4. Connect your GitHub repository
5. Configure build:

   **Runtime**: Docker
   - **Docker Context**: `./backend`
   - **Dockerfile Path**: `./backend/Dockerfile.render`

   **Environment Variables**:
   ```env
   # Node Configuration
   NODE_ENV: production
   PORT: 5000

   # Database (use Internal Database URL from Step 2)
   DATABASE_URL: postgres://user:password@host:5432/database

   # Redis (use Internal Redis URL from Step 3)
   REDIS_URL: redis://host:port

   # CORS (will update after frontend deployment)
   CORS_ORIGIN: https://freelance-agents-marketplace.vercel.app
   FRONTEND_URL: https://freelance-agents-marketplace.vercel.app

   # JWT Secrets
   JWT_SECRET: [generate with: openssl rand -base64 32]
   JWT_EXPIRES_IN: 7d
   JWT_REFRESH_SECRET: [generate with: openssl rand -base64 32]
   JWT_REFRESH_EXPIRES_IN: 30d

   # Stripe (use test keys for now)
   STRIPE_SECRET_KEY: sk_test_your_key_here
   STRIPE_WEBHOOK_SECRET: [generate]

   # Performance
   NODE_OPTIONS: --max-old-space-size=384
   ```

6. **Advanced Settings**:
   - **Health Check Path**: `/health`
   - **Health Check Interval**: 30s
   - **Health Check Timeout**: 10s
   - **Health Check Initial Delay**: 40s

7. Click **"Create Web Service"**

8. Wait for deployment to complete (5-10 minutes on first deploy)

### Step 5: Verify Backend Deployment

1. Find your service URL: `https://your-api.onrender.com`
2. Test health endpoint:
   ```bash
   curl https://your-api.onrender.com/health
   ```

   Expected response:
   ```json
   {
     "success": true,
     "status": "healthy",
     "timestamp": "2026-02-09T20:00:00.000Z",
     "environment": "production"
   }
   ```

3. Check Render logs for any errors

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. Ensure `vercel.json` is in `frontend/` directory
2. Check environment variables

### Step 2: Deploy to Vercel

**Option A: Via Vercel Website (Recommended for first deployment)**

1. Go to [Vercel](https://vercel.com/new)
2. Click **"Import Project"**
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   ```env
   VITE_API_URL: https://your-api.onrender.com
   VITE_STRIPE_PUBLIC_KEY: pk_test_your_key_here
   ```
6. Click **"Deploy"**
7. Wait for build to complete (2-3 minutes)

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy frontend
cd frontend
vercel --prod
```

### Step 3: Verify Frontend Deployment

1. Copy the Vercel URL: `https://freelance-agents-marketplace.vercel.app`
2. Open in browser
3. Verify:
   - Page loads
   - No console errors
   - API calls succeed (check browser console)

### Step 4: Update Backend CORS

1. Go to Render Dashboard
2. Open your backend web service
3. Go to **Environment** section
4. Update `CORS_ORIGIN` and `FRONTEND_URL`:
   ```env
   CORS_ORIGIN: https://freelance-agents-marketplace.vercel.app
   FRONTEND_URL: https://freelance-agents-marketplace.vercel.app
   ```
5. Trigger a new deployment (changes in env_vars auto-deploy)

---

## Post-Deployment Setup

### 1. Database Verification

Run migrations to ensure database schema is set up:

```bash
# Connect to Render service via SSH (optional)
# Or ensure migrations run automatically (configured in Dockerfile)
```

Migrations should run automatically during deployment. Verify in Render logs.

### 2. Stripe Configuration

1. Create a Stripe account: https://dashboard.stripe.com/register
2. Get API keys from: https://dashboard.stripe.com/test/apikeys
3. Update environment variables:

   **Backend (Render)**:
   ```env
   STRIPE_SECRET_KEY: sk_test_your_key
   STRIPE_WEBHOOK_SECRET: whsec_your_webhook_secret
   ```

   **Frontend (Vercel)**:
   ```env
   VITE_STRIPE_PUBLIC_KEY: pk_test_your_key
   ```

### 3. Custom Domain (Optional)

See [render-domain-setup.md](render-domain-setup.md) for detailed instructions.

### 4. Email Configuration (Optional)

If you want email notifications:

```env
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: your-email@gmail.com
SMTP_PASS: your-app-password
```

---

## Monitoring & Maintenance

### Render Health Monitoring

**Enabled by default:**
- Health checks every 30 seconds
- Automatic restart on failure
- Logs collection
- Metrics dashboard

**To access:**
1. Go to your service in Render Dashboard
2. Click **"Metrics"** tab
3. View:
   - CPU usage
   - Memory usage
   - Response times
   - Error rates
   - Request counts

### Log Monitoring

**View logs in Render Dashboard:**
1. Go to **"Logs"** tab
2. Filter by:
   - `info`: General information
   - `error`: Errors only
   - `/health`: Health check logs

**Common log levels:**
- `error`: Application errors
- `warn`: Warnings (non-critical)
- `info`: General information
- `debug`: Debug information

### Email Alerts

Configure email alerts in Render:

1. Go to **"Settings"** tab
2. Scroll to **"Notifications"**
3. Add your email
4. Select events:
   - ✅ Deployment success
   - ✅ Deployment failure
   - ✅ Service down
   - ✅ High error rate

### Database Monitoring

**PostgreSQL Metrics:**
1. Go to PostgreSQL service in Render Dashboard
2. View metrics:
   - Connection count
   - Storage usage
   - CPU usage

**Backup Management:**
- Daily backups automatic
- 7-day retention
- Can initiate manual backups

### Performance Tips for Free Tier

**Minimize Spin-up Time:**
- Keep dependencies minimal
- Optimize database queries
- Use Redis for caching
- Enable compression

**Handle Inactivity:**
- Backend spins down after 15min
- First request after spin-down may be slow
- Implement frontend loading states
- Consider warm-up endpoints

---

## Troubleshooting

### Issue: Backend Not Responding

**Symptoms:**
- 502/504 errors
- Health check failures
- Slow response times

**Solutions:**
1. Check if service spun down (normal behavior)
2. Wait 10-15 seconds for wake-up
3. Check Render logs for errors
4. Verify environment variables
5. Ensure database and Redis are accessible

**Log check:**
```bash
# View logs in Render Dashboard
# Look for:
# - "Connection refused" → Database/Redis issue
# - "Out of memory" → Need to optimize
# - "Port already in use" → Port conflict
```

### Issue: Database Connection Failure

**Symptoms:**
- `Connection pool exhausted`
- `Database connection timeout`
- migrations failing

**Solutions:**
1. Verify DATABASE_URL is correct
2. Check PostgreSQL service status
3. Review connection limits (max 90 on free tier)
4. Ensure database migrations ran successfully
5. Check for connection leaks in application

**Quick fix:**
```bash
# Redeploy backend service to re-establish connections
```

### Issue: Redis Connection Failure

**Symptoms:**
- Cache misses
- Session errors
- Rate limiting issues

**Solutions:**
1. Verify REDIS_URL is correct
2. Check Redis service status
3. Review connection limits (max 10 on free tier)
4. Redis may be cleared on restart (normal)

**Note:** Free tier Redis is memory-only and may lose data.

### Issue: CORS Errors

**Symptoms:**
- Browser console: `Access-Control-Allow-Origin` error
- API calls blocked

**Solutions:**
1. Update CORS_ORIGIN in backend
2. Ensure both http:// and https:// variants if needed
3. Check that frontend URL is correct
4. Redeploy backend after changes

**Example:**
```env
CORS_ORIGIN: https://www.yourdomain.com,https://yourdomain.com
```

### Issue: High Memory Usage

**Symptoms:**
- Service crashes or restarts
- Out of memory errors

**Solutions:**
1. Reduce memory footprint
2. Use `NODE_OPTIONS: --max-old-space-size=384`
3. Optimize database queries
4. Implement connection pooling with limits
5. Clear unused caches regularly

### Issue: Slow First Request

**Symptoms:**
- First API call takes 10+ seconds
- Subsequent calls are fast

**Solution:**
This is normal behavior on free tier. Backend spins down after 15min of inactivity. First request wakes it up (~5-10s).

**Mitigation:**
- Implement frontend loading states
- Use optimistic UI updates
- Consider external ping service to keep alive (if needed)

### Issue: Deployment Failed

**Symptoms:**
- Build errors in logs
- Service stuck in "deploying" state

**Solutions:**
1. Check build logs in Render Dashboard
2. Verify Dockerfile syntax
3. Check for missing dependencies
4. Ensure all environment variables are set
5. Test locally: `docker build -f backend/Dockerfile.render ./backend`

### Issue: Migrations Failed

**Symptoms:**
- Database tables not created
- API returns database errors

**Solutions:**
1. Check migration logs
2. Verify DATABASE_URL
3. Ensure database exists
4. Redeploy backend to retry migrations
5. Manual migration via SSH if needed

---

## Best Practices

### 1. Environment Variables

```env
# Keep secrets out of code
# Use Render's generateValue feature for secrets
JWT_SECRET: [generate]

# Differentiate environments
NODE_ENV: production
```

### 2. Error Handling

- Always catch errors in async functions
- Log errors with context
- Return proper HTTP status codes
- Never expose stack traces in production

### 3. Database Optimization

- Use indexes on frequently queried columns
- Implement connection pooling
- Use prepared statements to prevent SQL injection
- Regularly analyze query performance

### 4. Caching Strategy

- Cache API responses in Redis
- Set appropriate TTL
- Cache static data (user profiles, etc.)
- Invalidate cache on updates

### 5. Rate Limiting

- Protect against abuse
- Use rate-limiter-redis for distributed limiting
- Set reasonable limits (e.g., 100 req/15min)
- Differentiate between authenticated and anonymous users

### 6. Security

- Always use HTTPS (automatic on Render/Vercel)
- Validate all inputs
- Use prepared SQL statements
- Implement CORS correctly
- Keep dependencies updated

### 7. Logging

- Log important events (errors, warnings)
- Structured logging (JSON format)
- Correlate logs with request IDs
- Don't log sensitive data

### 8. Monitoring

- Set up health checks
- Monitor error rates
- Track performance metrics
- Set up email alerts

---

## Cost Optimization

### Stay Within Free Tiers

**Render Web Service:**
- **Limit**: Spins down after 15min
- **Mitigation**: Accept spin-up delay, or upgrade for consistent performance
- **Cost**: $0

**PostgreSQL:**
- **Limit**: 512MB storage
- **Mitigation**: Regular cleanup, optimize data size
- **Cost**: $0

**Redis:**
- **Limit**: 25MB memory, cleared on restart
- **Mitigation**: Use for caching only, persistent data in DB
- **Cost**: $0

**Vercel:**
- **Limit**: 100GB bandwidth
- **Mitigation**: Optimize assets, use CDN
- **Cost**: $0

### Optimization Strategies

1. **Minimize Image Size**
   - Use Alpine Linux (already done)
   - Multi-stage builds (already done)
   - Production dependencies only (already done)

2. **Reduce Database Size**
   - Regular cleanup of old data
   - Compress large text fields
   - Archive old records

3. **Optimize Assets**
   - Compress images
   - Minify CSS/JS (Vite does this)
   - Use format WebP for images

4. **API Optimization**
   - Implement pagination
   - Use field projection (GraphQL-style)
   - Cache responses

### Potential Costs (if Exceed Free Tier)

- **Render Web Service**: $7/month (paid plan starts here)
- **PostgreSQL**: $7/month (paid plan starts here)
- **Redis**: $5/month (paid plan starts here)
- **Vercel**: Paid plans start at $20/month

**Total Minimum Paid**: ~$39/month if all services exceed free tier.

---

## Additional Resources

### Documentation

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

### Tools

- Render CLI: https://github.com/renderinc/cli
- Vercel CLI: https://vercel.com/docs/cli
- Docker: https://www.docker.com/

### Community

- Render Community: https://community.render.com/
- Vercel Discord: https://vercel.com/discord
- Stack Overflow: Tag with `render`, `vercel`

---

## Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [Render Status](https://status.render.com)
3. Review [Vercel Status](https://www.vercel-status.com)
4. Check project logs
5. Open an issue on GitHub

---

## Changelog

### v1.0.0 (2026-02-09)
- Initial deployment guide
- Free tier configuration
- Automated setup script
- Complete documentation

---

**Last Updated**: 2026-02-09
**Version**: 1.0.0
