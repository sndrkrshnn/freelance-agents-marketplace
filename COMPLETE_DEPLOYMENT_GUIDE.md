# 🚀 Complete Deployment Guide
## Freelance Agents Marketplace - Backend (Render) + Frontend (Vercel)

---

## 📋 Prerequisites

Before you start, ensure you have:

1. **GitHub Account** - Free
2. **Render Account** - Free tier available
3. **Vercel Account** - Free tier available
4. **Git Installed** - For pushing to GitHub
5. **Local Repository** - Your cleaned workspace repo

---

## 🗂️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│                   Frontend (React)                          │
│              https://[project].vercel.app                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─┐
                      │ │ HTTPS API Calls
                      ├─┘
                      │
┌─────────────────────────────────────────────────────────────┐
│                        Render                                │
│              ┌───────────────────────┐                     │
│              │   PostgreSQL DB       │                     │
│              │   (512MB, Free)       │                     │
│              └───────────────────────┘                     │
│              ┌───────────────────────┐                     │
│              │      Redis            │                     │
│              │   (25MB, Free)        │                     │
│              └───────────────────────┘                     │
│              ┌───────────────────────┐                     │
│              │   Backend API         │                     │
│              │  (Express + Docker)   │                     │
│              │  [name].onrender.com  │                     │
│              └───────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 PART 1: Prepare Your Repository

### Step 1.1: Push Cleaned Code to GitHub

Your local repository is already cleaned (commit: `815341b`). Push it:

```bash
cd /home/sndrkrshnn/.openclaw/workspace/freelance-agents-marketplace

# Verify clean git status
git status

# Add any new changes (if any)
git add .
git commit -m "chore: prepare for deployment"

# Push to GitHub (You'll need your GitHub credentials)
git push origin main
```

**Expected Status:**
- Backend: Complete with full implementation
- Frontend: Placeholder stage (minimal pages)
- `render.yaml`: Present and configured
- `frontend/vercel.json`: Present and configured

---

## 🔧 PART 2: Backend Deployment (Render.com)

### Step 2.1: Create Render Account

1. Go to https://dashboard.render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories
4. Verify your email

**Free Tier Limits:**
- PostgreSQL: 512MB storage
- Redis: 25MB
- Web Service: 512MB RAM, 750 CPU hours/month
- SSL certificate: Auto-generated
- Custom domain: Included

---

### Step 2.2: Create PostgreSQL Database

1. **Navigate to Dashboard**
   - Click **"+ New"** button
   - Select **"PostgreSQL"**
   
2. **Configure Database**
   ```
   Name: freelance-agents-marketplace-db
   Database: freelance_marketplace
   User: freelance_user
   Region: Oregon (or nearest to users)
   Plan: Free (512MB)
   ```

3. **Click "Create Database"**
   
4. **Wait for Database to Create** (~2-3 minutes)

5. **Save Connection Information**
   ```
   Internal Database URL (shown after creation):
   postgresql://freelance_user:[password]@[host]:5432/freelance_marketplace
   
   NOTE: Don't need to copy this - render.yaml uses automatic linking
   ```

---

### Step 2.3: Create Redis Cache

1. **Click "+ New"** → **"Redis"**

2. **Configure Redis**
   ```
   Name: freelance-agents-marketplace-redis
   Region: Oregon (same as database)
   Plan: Free (25MB)
   Maxmemory Policy: allkeys-lru
   ```

3. **Click "Create Redis"**

4. **Wait for Redis to Create** (~1-2 minutes)

---

### Step 2.4: Create Backend Web Service

1. **Click "+ New"** → **"Web Service"**

2. **Connect Repository**
   - Select repository: `freelance-agents-marketplace`
   - Branch: `main`
   - Runtime: **Docker**
   
3. **Configure Service**
   ```
   Name: freelance-agents-marketplace-api
   Region: Oregon
   Plan: Free
   ```

4. **Docker Settings**
   ```
   Dockerfile Path: ./backend/Dockerfile
   Docker Context: ./backend
   ```
   
5. **Environment Variables** (from `render.yaml`, will auto-apply):
   
   **Auto-generated by render.yaml:**
   - `NODE_ENV`: production
   - `PORT`: 5000
   - `CORS_ORIGIN`: https://freelance-agents-marketplace.vercel.app
   - `DATABASE_URL`: (linked to PostgreSQL)
   - `REDIS_URL`: (linked to Redis)
   - `JWT_SECRET`: Auto-generated
   - `JWT_REFRESH_SECRET`: Auto-generated
   
   **You Need to Update:**
   - `STRIPE_SECRET_KEY`: Get from Stripe Dashboard → Developers → API Keys
     ``sk_test_your_stripe_secret_key_here``
   
6. **Advanced Settings**
   - Health Check Path: `/health` (auto-set from render.yaml)
   - Auto-Deploy: ON (detects from render.yaml)

7. **Click "Create Web Service"**

8. **Wait for Build & Deploy** (~5-7 minutes)
   - Build logs will show progress
   - Don't close the tab!

9. **Save Your Backend URL**
   ```
   When deployment completes, you'll see:
   https://freelance-agents-marketplace-api.onrender.com
   ```

---

### Step 2.5: Run Database Migrations

1. **Connect to Render Shell**
   - Go to your service → "Connect" tab
   - Copy the `render connect` command and run in terminal:

```bash
render connect freelance-agents-marketplace-api
```

2. **Or Use Render Console**
   - In Render Dashboard → Service → "Console"
   - Click "Open Console"

3. **Run Migrations**
```bash
cd /workspace/backend
npm run migrations:run
```

4. **Verify Tables Created**
```bash
npx prisma db pull
# Or check using psql
psql $DATABASE_URL -c "\dt"
```

**Expected Tables:**
- users
- agent_profiles
- tasks
- proposals
- payments
- reviews
- messages
- notifications

---

### Step 2.6: Backend Health Check

1. **Test Health Endpoint**
```bash
curl https://freelance-agents-marketplace-api.onrender.com/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-02-10T..."
}
```

---

### Step 2.7: Update Frontend Configuration

Edit `frontend/vercel.json` to use your actual backend URL:

```json
{
  "env": {
    "VITE_API_URL": "https://freelance-agents-marketplace-api.onrender.com",
    "VITE_STRIPE_PUBLIC_KEY": "pk_test_YOUR_PUBLIC_KEY"
  }
}
```

**Also update the rewrites section:**
```json
"rewrites": [
  {
    "source": "/api/:match*",
    "destination": "https://freelance-agents-marketplace-api.onrender.com/api/:match*"
  }
]
```

**Commit & Push:**
```bash
git add frontend/vercel.json
git commit -m "chore: update backend URL for deployment"
git push origin main
```

---

## 🎨 PART 3: Frontend Deployment (Vercel)

### Step 3.1: Create Vercel Account

1. Go to https://vercel.com/signup
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

**Free Tier Limits:**
- Bandwidth: 100GB/month
- Builds: 6000 hours/month
- SSL certificate: Auto-generated
- Edge Network: Global CDN
- Custom domain: Included

---

### Step 3.2: Create Vercel Project

1. **Click "Add New..."** → **"Project"**

2. **Import Repository**
   - Select: `freelance-agents-marketplace`
   - Click "Import"

3. **Configure Project**
   ```
   Project Name: freelance-agents-marketplace
   Framework Preset: Vite
   Root Directory: ./frontend
   ```

4. **Environment Variables**
   Click "New Environment Variable":
   
   ```
   Name: VITE_API_URL
   Value: https://freelance-agents-marketplace-api.onrender.com
   Environment: Production, Preview, Development
   
   Name: VITE_STRIPE_PUBLIC_KEY
   Value: pk_test_your_stripe_public_key
   Environment: Production, Preview, Development
   ```

5. **Build Settings** (auto-detected from package.json)
   ```
   Build Command: npm run build
   Output Directory: dist
   ```

6. **Click "Deploy"**

7. **Wait for Build & Deploy** (~2-3 minutes)

8. **Save Your Frontend URL**
   ```
   When deployment completes, you'll see:
   https://freelance-agents-marketplace.vercel.app
   ```

---

### Step 3.3: Test Frontend

1. **Open in Browser**
   ```
   https://freelance-agents-marketplace.vercel.app
   ```

2. **Expected to See**
   - Homepage or placeholder UI
   - Login/Register buttons
   - Navigation menu

3. **Open Browser Console**
   - Right-click → Inspect → Console
   - Check for API connection errors
   - Should see no CORS errors

---

## ✅ PART 4: Post-Deployment Verification

### Step 4.1: Complete Health Checklist

Run these checks from your local terminal:

```bash
# 1. Backend Health
curl https://freelance-agents-marketplace-api.onrender.com/health

# 2. Frontend Load
curl -I https://freelance-agents-marketplace.vercel.app

# 3. Database Tables (via Render Console)
curl GET /api/admin/stats
```

**Expected Results:**
- ✅ Backend: HTTP 200 with JSON response
- ✅ Frontend: HTTP 200 with HTML content
- ✅ Database: Tables exist in PostgreSQL

---

### Step 4.2: Test User Registration

1. **Open Frontend in Browser**
2. **Click "Register"**
3. **Fill Form:**
   ```
   Email: test@example.com
   Password: Test@123
   Role: Client (select one)
   ```
4. **Submit**

5. **Expected Result**
   - Redirects to Dashboard
   - Shows user info
   - Or shows error message if something wrong

---

### Step 4.3: Test API Directly

```bash
# Register API Call
curl -X POST https://freelance-agents-marketplace-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "Test@123",
    "userType": "client",
    "firstName": "API",
    "lastName": "Test"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "user": {...},
#     "token": "eyJhbGciOiJIUzI1NiIs..."
#   }
# }
```

---

## 🔧 PART 5: Troubleshooting Guide

### Common Issues & Solutions

---

#### Issue: Backend Deploy Fails - "Build Error"

**Error Message:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Make sure backend/package.json exists
cd backend
cat package.json | grep "dependencies"

# If missing, reinstall locally and commit
npm install
git add package.json package-lock.json
git commit -m "chore: add dependencies"
git push origin main
```

---

#### Issue: Frontend Deploy Fails - "Build Error"

**Error Message:**
```
Error: VITE_API_URL is not defined
```

**Solution:**
1. Go to Vercel → Project → Settings → Environment Variables
2. Add `VITE_API_URL` with your backend URL
3. Redeploy: Vercel → Deployments → Redeploy

---

#### Issue: CORS Error in Browser

**Error Message:**
```
Access to fetch at 'https://...' has been blocked by CORS policy
```

**Solution:**
1. Check backend `.env` → `CORS_ORIGIN`
2. Ensure it matches your Vercel URL
3. Update in Render → Service → Environment Variables
4. Redeploy backend: Render → Services → Manual Deploy

---

#### Issue: Database Connection Failed

**Error Message:**
```
Error: connect ECONNREFUSED
```

**Solution:**
1. Verify PostgreSQL is running in Render
2. Check `DATABASE_URL` in Render Environment Variables
3. Should be auto-linked, but verify format:
   ```
   postgresql://freelance_user:[password]@[host]:5432/freelance_marketplace
   ```
4. Redeploy backend after changes

---

#### Issue: Migrations Not Running

**Error Message:**
```
Error: relation "users" does not exist
```

**Solution:**
```bash
# Connect via Render Console and run:
cd /workspace/backend
npm run migrations:run
```

---

### Issue: Stripe Webhook Errors

**Error Message:**
```
Error: Invalid signature for Stripe webhook
```

**Solution:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://[your-api].onrender.com/api/payments/webhook`
3. Copy "Signing Secret"
4. Add to Render: `STRIPE_WEBHOOK_SECRET`
5. Test using Stripe CLI:
```bash
stripe trigger payment_intent.succeeded
```

---

## 📊 PART 6: Monitoring & Logs

### Backend Monitoring (Render)

1. **View Logs**
   - Go to Render → Service → Logs
   - Filter: Production, Previous deployments
   - Live logs available

2. **View Metrics**
   - CPU Usage, Memory, Disk
   - Response Times, Uptime
   - Free tier: Basic metrics

---

### Frontend Monitoring (Vercel)

1. **View Logs**
   - Go to Vercel → Project → Functions
   - View function logs

2. **View Analytics**
   - Page views, visitors
   - Geography, devices
   - Available in Vercel Dashboard

---

## 🔐 PART 7: Security Checklist

### ✅ Backend Security

- [ ] JWT secret changed from default
- [ ] JWT_EXPIRES_IN: 7d (or shorter for production)
- [ ] Database password is strong
- [ ] CORS_ORIGIN set to specific domain
- [ ] Rate limiting enabled
- [ ] HTTPS only
- [ ] Helmet security headers
- [ ] STRIPE_SECRET_KEY not exposed

---

### ✅ Frontend Security

- [ ] VITE_API_URL points to backend
- [ ] STRIPE_PUBLIC_KEY (test key only)
- [ ] HTTPS only (Vercel auto)
- [ ] CSP headers set
- [ ] XSS protection headers
- [ ] No sensitive data in frontend code

---

## 🌍 PART 8: Custom Domain Setup (Optional)

### Step 8.1: Backend Domain (Render)

1. **Go to Render → Service → Settings**
2. **Scroll to "Domains"**
3. **Click "Add Domain"**
4. **Enter your domain:** `api.yourdomain.com`
5. **DNS Settings Provided:**
   ```
   Type: CNAME
   Name: api
   Value: name provided by Render
   ```
6. **Update DNS at your domain provider**

---

### Step 8.2: Frontend Domain (Vercel)

1. **Go to Vercel → Project → Settings → Domains**
2. **Enter your domain:** `www.yourdomain.com`
3. **Click "Add"**
4. **DNS Settings Provided:**
   ```
   Type: A or CNAME
   Values provided by Vercel
   ```
5. **Update DNS at your domain provider**
6. **SSL Certificate auto-issued**

---

## 📱 PART 9: Mobile Optimization (Optional)

The frontend is already responsive. To test:

1. **Chrome DevTools:**
   - Open website
   - Press F12 → Toggle Device Toolbar (Ctrl+Shift+M)
   - Test responsive modes

2. **Real Device:**
   - Deploy
   - Open on phone
   - Test touch interactions

---

## 💰 PART 10: Pricing Summary

### Render (Backend) - FREE

| Service | Free Tier | Upgrade |
|---------|-----------|---------|
| PostgreSQL | 512MB | $7/mo (1GB) |
| Redis | 25MB | $5/mo (50MB) |
| Web Service | 512MB RAM | $7/mo (1GB) |
| **Total** | **$0/mo** | **$19/mo** |

---

### Vercel (Frontend) - FREE

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Bandwidth | 100GB/mo | 1TB/mo |
| Builds | 6000 hrs/mo | Unlimited |
| **Total** | **$0/mo** | **$20/mo** |

---

### Stripe - PAY AS YOU GO

No monthly fees
- Transaction fee: 2.9% + 30¢ per transaction
- No setup cost

---

## 🎯 PART 11: Next Steps After Deployment

### Immediate (Day 1)
1. ✅ Verify everything works end-to-end
2. ✅ Test user registration & login
3. ✅ Test task creation
4. ✅ Test proposal submission
5. ✅ Test escrow payment flow
6. ✅ Test review submission

### Week 1
1. Set up monitoring alerts
2. Set up error tracking (Sentry, etc.)
3. Test load with multiple users
4. Optimize slow queries

### Week 2-4
1. Build additional frontend pages
2. Add analytics (Google Analytics)
3. Set up email notifications
4. Improve admin dashboard

### Month 2+
1. Consider upgrading tiers if needed
2. Add more features (chat, advanced search)
3. Marketing and user acquisition
4. Gather user feedback

---

## 📞 PART 12: Support Resources

### Official Documentation
- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Stripe Docs:** https://stripe.com/docs

### Your Project Files
- `render.yaml` - Backend configuration
- `frontend/vercel.json` - Frontend configuration
- `.env.example` - Environment variable template

### Quick Reference Commands

```bash
# Push updates
git add .
git commit -m "chore: update"
git push origin main

# Re-deploy backend (automatic on push)
# Re-deploy frontend (automatic on push)

# Check backend logs
# Go to Render Dashboard → Service → Logs

# Check frontend logs
# Go to Vercel Dashboard → Project → Functions
```

---

## ✅ Deployment Checklist

Use this to track your progress:

**Backend (Render):**
- [ ] Repository pushed to GitHub
- [ ] PostgreSQL database created
- [ ] Redis cache created
- [ ] Backend service created and deployed
- [ ] Database migrations run
- [ ] Health check passes
- [ ] Environment variables configured (STRIPE_SECRET_KEY)
- [ ] CORS origin set correctly

**Frontend (Vercel):**
- [ ] Project created from GitHub
- [ ] Root directory set to `frontend`
- [ ] VITE_API_URL set
- [ ] VITE_STRIPE_PUBLIC_KEY set
- [ ] Build successful
- [ ] Frontend loads in browser
- [ ] No CORS errors

**Final Verification:**
- [ ] Can register new user
- [ ] Can login
- [ ] Can create task
- [ ] Can submit proposal
- [ ] API responses work
- [ ] Pages load correctly

---

## 🎉 You're Done!

Congratulations! Your Freelance Agents Marketplace is now deployed and live!

**Your URLs:**
- Frontend: https://freelance-agents-marketplace.vercel.app
- Backend: https://freelance-agents-marketplace-api.onrender.com

---

**Need Help?**
- Check Render Logs for backend errors
- Check Vercel Logs for frontend errors
- Review this guide
- Open an issue on GitHub

Happy Deploying! 🚀
