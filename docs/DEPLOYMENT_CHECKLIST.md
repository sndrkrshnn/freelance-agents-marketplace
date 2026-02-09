# Deployment Checklist - Render Free Tier

Use this checklist to ensure your Freelance AI Marketplace deployment is complete and production-ready.

---

## Pre-Deployment Checklist

### Repository Setup
- [ ] Project code pushed to GitHub
- [ ] `render.yaml` present in repository root
- [ ] `backend/Dockerfile.render` present
- [ ] `backend/package.json` has `render` start script
- [ ] `frontend/vercel.json` present
- [ ] `frontend/package.json` has `vercel-build` script
- [ ] `.render.env.example` present (reference for env vars)
- [ ] GitHub repository is public or Render has access

### Code Review
- [ ] Database migrations are tested locally
- [ ] Health check endpoint (`/health`) is working
- [ ] API endpoints return proper error responses
- [ ] CORS configuration allows frontend origin
- [ ] JWT secrets are not hardcoded (use environment variables)
- [ ] Stripe keys are not hardcoded (use environment variables)
- [ ] No sensitive data in logs
- [ ] Database connection pooling configured
- [ ] error handling middleware is in place

---

## Services Creation Checklist

### Render: PostgreSQL
- [ ] PostgreSQL service created: `freelance-agents-marketplace-db`
- [ ] Database name: `freelance_agents_marketplace`
- [ ] Region: Oregon (or same as other services)
- [ ] Plan: Free tier selected
- [ ] **Internal Database URL** saved for configuration
- [ ] Service is active (status: "Available")

### Render: Redis
- [ ] Redis instance created: `freelance-agents-marketplace-redis`
- [ ] Region: Oregon (or same as other services)
- [ ] Plan: Free tier selected
- [ ] Maxmemory policy: `allkeys-lru`
- [ ] **Internal Redis URL** saved for configuration
- [ ] Service is active (status: "Available")

### Render: Backend API
- [ ] Web service created: `freelance-agents-marketplace-api`
- [ ] Runtime: Docker selected
- [ ] Docker context: `./backend`
- [ ] Dockerfile: `Dockerfile.render`
- [ ] Branch: `main` (or your default branch)

#### Backend Environment Variables
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `DATABASE_URL` = [PostgreSQL Internal URL]
- [ ] `REDIS_URL` = [Redis Internal URL]
- [ ] `JWT_SECRET` = [generated securely]
- [ ] `JWT_EXPIRES_IN` = `7d`
- [ ] `JWT_REFRESH_SECRET` = [generated securely]
- [ ] `JWT_REFRESH_EXPIRES_IN` = `30d`
- [ ] `CORS_ORIGIN` = `https://freelance-agents-marketplace.vercel.app` (update after frontend deploy)
- [ ] `FRONTEND_URL` = `https://freelance-agents-marketplace.vercel.app` (update after frontend deploy)
- [ ] `STRIPE_SECRET_KEY` = `sk_test_...` (or live key)
- [ ] `STRIPE_WEBHOOK_SECRET` = [generated]
- [ ] `NODE_OPTIONS` = `--max-old-space-size=384`

#### Backend Health Check
- [ ] Health check path: `/health`
- [ ] Health check interval: `30s`
- [ ] Health check timeout: `10s`
- [ ] Health check initial delay: `40s`
- [ ] Health check retries: `3`

#### Backend Deployment
- [ ] First deployment completed successfully
- [ ] No build errors in logs
- [ ] Service status: "Live"
- [ ] Backend URL accessible: `https://your-api.onrender.com`

---

### Vercel: Frontend
- [ ] Project created from GitHub repository
- [ ] Root directory: `frontend`
- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

#### Frontend Environment Variables
- [ ] `VITE_API_URL` = [Backend Render URL]
- [ ] `VITE_STRIPE_PUBLIC_KEY` = `pk_test_...` (or live key)

#### Frontend Deployment
- [ ] First deployment completed successfully
- [ ] No build errors in logs
- [ ] Project status: "Ready"
- [ ] Frontend URL accessible: `https://freelance-agents-marketplace.vercel.app`

---

## Post-Deployment Verification Checklist

### Backend Verification
- [ ] Health endpoint returns 200: `curl https://your-api.onrender.com/health`
- [ ] API endpoint accessible: `curl https://your-api.onrender.com/api/v1/health`
- [ ] Redis connected (check logs or endpoint): `/api/v1/health/redis`
- [ ] Database migrations ran successfully (check logs)
- [ ] No error messages in Render logs
- [ ] Server starts without crashes

### Frontend Verification
- [ ] Frontend loads in browser without errors
- [ ] No console errors in browser DevTools
- [ ] Assets load correctly (CSS, JS, images)
- [ ] Navigation works (routing)
- [ ] Responsive design works on different viewports

### Integration Verification
- [ ] Frontend can call backend API
- [ ] API requests succeed without CORS errors
- [ ] User registration works
- [ ] User login works (JWT token received)
- [ ] Protected routes accessible after login
- [ ] Logout works
- [ ] Data persists in database
- [ ] File uploads work (if applicable)
- [ ] WebSocket connections work (if applicable)

### Payment Integration (Optional)
- [ ] Stripe checkout page loads
- [ ] Test payment works (test mode)
- [ ] Webhook endpoint receives Stripe events
- [ ] Payment status updates correctly
- [ ] Receipt/confirmation displayed to user

---

## Security Checklist

### Backend Security
- [ ] All environment variables are set
- [ ] No secrets hardcoded in code
- [ ] CORS configured to specific origin(s)
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled (helmet)
- [ ] HTTPS enforced
- [ ] JWT tokens have expiration
- [ ] Passwords hashed with bcrypt
- [ ] Sensitive data not exposed in API responses
- [ ] Error messages don't leak sensitive info

### Frontend Security
- [ ] Environment variables are prefixed with `VITE_`
- [ ] No API keys exposed in client-side code
- [ ] HTTPS enforced
- [ ] Content Security Policy configured
- [ ] No sensitive data in localStorage
- [ ] XSS protection enabled
- [ ] Input validation on forms

---

## Performance Checklist

### Backend Performance
- [ ] Response times acceptable (< 2s for most requests)
- [ ] Database queries optimized (check logs)
- [ ] Redis caching working (verify cache hits)
- [ ] Connection pooling configured
- [ ] Memory usage stable (check Render metrics)
- [ ] No memory leaks (long-running tests)

### Frontend Performance
- [ ] Page load time < 3s
- [ ] Build size optimized (check dist folder)
- [ ] Images optimized/compressed
- [ ] Code splitting implemented (if needed)
- [ ] Lazy loading for images/components (if needed)
- [ ] Lighthouse score > 90

---

## Monitoring Checklist

### Render Monitoring
- [ ] Metrics tab shows CPU, Memory, Response times
- [ ] Log streaming works
- [ ] Error logs filter working
- [ ] Health check status monitoring
- [ ] Service status alerts configured (email)

### Vercel Monitoring
- [ ] Deployment logs accessible
- [ ] Build time acceptable
- [ ] Analytics dashboard configured (optional)
- [ ] Speed insights enabled (optional)

### Database Monitoring
- [ ] PostgreSQL connection count within limits (90)
- [ ] Storage usage within limits (512MB)
- [ ] Backup schedule confirmed

### Redis Monitoring
- [ ] Connection count within limits (10)
- [ ] Memory usage within limits (25MB)
- [ ] Eviction policy configured (LRU)

---

## Notification Checklist

### Alerts Configuration
- [ ] Email alerts enabled for deployment failures (Render)
- [ ] Email alerts enabled for service failures (Render)
- [ ] Build alerts enabled (Vercel)
- [ ] Error rate monitoring setup (optional)

---

## Documentation Checklist

- [ ] Updated README with deployment URLs
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Architecture diagram updated
- [ ] Known issues documented (if any)
- [ ] Troubleshooting guide reviewed

---

## Custom Domain (Optional)

### Backend Custom Domain
- [ ] Custom domain added to Render service
- [ ] DNS records configured (CNAME)
- [ ] Domain verified in Render
- [ ] SSL certificate active
- [ ] Backend accessible via custom domain
- [ ] CORS_ORIGIN updated to custom domain

### Frontend Custom Domain
- [ ] Custom domain added to Vercel project
- [ ] DNS records configured (A/CNAME)
- [ ] Domain verified in Vercel
- [ ] SSL certificate active
- [ ] Frontend accessible via custom domain
- [ ] VITE_API_URL updated to custom backend domain

---

## Testing Checklist

### Smoke Tests (Automated)
- [ ] Health check passes
- [ ] Database connection test passes
- [ ] Redis connection test passes
- [ ] API root endpoint responds
- [ ] Frontend root page loads

### End-to-End Tests (Manual)
- [ ] User can register new account
- [ ] User can login
- [ ] User can view projects
- [ ] User can create project
- [ ] User can edit project
- [ ] User can delete project
- [ ] User can logout
- [ ] Admin panel accessible (if applicable)

### Edge Cases
- [ ] Invalid login credentials handled correctly
- [ ] Concurrent user sessions work
- [ ] Large file uploads (if applicable)
- [ ] Rate limit enforcement works
- [ ] Database connection recovery tested
- [ ] Service handles high load (test with multiple requests)

---

## Disaster Recovery Checklist

### Backups
- [ ] PostgreSQL automatic backups verified
- [ ] Backup retention confirmed (7 days)
- [ ] Manual backup process documented

### Recovery Procedure
- [ ] Database restore procedure documented
- [ ] Service restart procedure documented
- [ ] Emergency contact information available

---

## Cost Monitoring

### Free Tier Limits
- [ ] Render Web Service usage monitored (512MB RAM)
- [ ] PostgreSQL usage monitored (512MB storage)
- [ ] Redis usage monitored (25MB memory)
- [ ] Vercel usage monitored (100GB bandwidth)

### Alerts
- [ ] Alert configured if approaching limits
- [ ] Upgrade procedure understood (if needed)

---

## Final Sign-Off

### Readiness Assessment
- [ ] All checklist items completed
- [ ] No critical issues found
- [ ] Team/stakeholder has reviewed
- [ ] Go/No-Go decision made

### Launch
- [ ] Production environment is live
- [ ] DNS propagation complete (if using custom domain)
- [ ] All services operational
- [ ] Monitoring active
- [ ] Team notified of launch

---

## Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Watch for unusual patterns
- [ ] Verify backups are running
- [ ] Check health check status

### First Week
- [ ] Daily review of logs
- [ ] Monitor resource usage
- [ ] Track user engagement
- [ ] Address any issues found
- [ ] Refine monitoring/alerts

---

## Reference

### Generated Secrets

Keep these secure (use password manager):

- **JWT Secret**: `_____________________`
- **JWT Refresh Secret**: `_____________________`
- **Stripe Webhook Secret**: `_____________________`

### Service URLs

- **Backend API**: `https://your-api.onrender.com`
- **Frontend**: `https://freelance-agents-marketplace.vercel.app`
- **PostgreSQL**: Internal URL only
- **Redis**: Internal URL only

### Environment Files

- Backend env vars: `/home/sndrkrshnn/freelance-agents-marketplace/.render.env.example`
- Deploy checklist: `/home/sndrkrshnn/freelance-agents-marketplace/docs/DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: 2026-02-09

This checklist helps ensure nothing is missed during deployment. Print or copy to track progress!
