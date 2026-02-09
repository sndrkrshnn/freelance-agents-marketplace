# 🔧 Complete Setup Guide - API Keys & Deployment

**Detailed steps to generate all necessary keys and deploy to Render**

---

## 📋 Table of Contents

1. [Generate JWT Secret](#1-generate-jwt-secret)
2. [Get Stripe API Keys](#2-get-stripe-api-keys)
3. [Generate VAPID Keys](#3-generate-vapid-keys)
4. [Deploy Backend to Render](#4-deploy-backend-to-render)
5. [Deploy Frontend to Vercel](#5-deploy-frontend-to-vercel)

---

## 1. Generate JWT Secret

The JWT Secret is used to sign and verify authentication tokens. It should be a long, random string.

### Method 1: Using OpenSSL (Recommended)

```bash
# Generate a random 32-byte base64 encoded string
openssl rand -base64 32
```

**Example output:**
```
xK9mP2vQ5wR8tY1uI4nL7jM3pS6vT9xF2wB5hG8jK1n=
```

**Copy this entire string!** You'll need it for `JWT_SECRET`.

### Method 2: Using Node.js (Alternative)

```bash
# Create a Node.js script to generate the secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Method 3: Quick Command (One-liner)

```bash
echo "JWT_SECRET=$(openssl rand -base64 32)"
```

**This is your `JWT_SECRET` - save it somewhere secure!**

---

## 2. Get Stripe API Keys

Stripe is used for payment processing in the marketplace. You'll need test keys for development/production.

### Step 1: Sign Up / Log In to Stripe

1. Go to: **https://dashboard.stripe.com/login**
2. Sign up (free) or log in
3. Verify your email if it's a new account

### Step 2: Get API Keys

After logging in:

1. Click **Developers** in the left sidebar (or go to https://dashboard.stripe.com/apikeys)
2. You'll see **Test mode** keys (for development)
3. Look for:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

**Copy both keys!**

Example:
```
STRIPE_PUBLIC_KEY=pk_test_51M8sZkJxK9mP2vQ...
STRIPE_SECRET_KEY=sk_test_51M8sZkJxK9mP2vQ...
```

### Step 3: For Production (Later)

When you're ready to go live:
1. Click **Test mode** toggle → Switch to **Live mode**
2. You'll get different keys starting with `pk_live_` and `sk_live_`

### Step 4: Get Webhook Secret (Optional - For Payment Notifications)

1. In Stripe Dashboard → **Webhooks** → **Add endpoint**
2. Webhook URL: `https://your-backend-url.onrender.com/api/payments/webhook`
3. Events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `charge.succeeded`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`)

**Copy the webhook secret for `STRIPE_WEBHOOK_SECRET`**

---

## 3. Generate VAPID Keys

VAPID keys are used for web push notifications. You'll need them to send notifications to users' browsers.

### Step 1: Install web-push

```bash
# Navigate to backend directory
cd ~/freelance-agents-marketplace/backend

# Install web-push (if not already installed)
npm install web-push --save-dev
```

### Step 2: Generate Keys

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys
```

**Example output:**
```
========================================
Public Key:
BCtKqLX7uT8vR2nG5hP9wK3mY6tQ1jV8pB4cH7xZ2fL9nM4sP6kR1tU8yV3wX7hQ2

Private Key:
qP9sB2uV5yX8mK1nL4tR7wZ3cH6jP9sV2tU5yX8mK1nL4tR7wZ3cH6jP9sV2tU5yX
========================================
```

**Copy both keys:**
- `VAPID_PUBLIC_KEY` = The public key above
- `VAPID_PRIVATE_KEY` = The private key above
- `VAPID_EMAIL` = Your email (e.g., `admin@yourdomain.com`)

---

## 4. Deploy Backend to Render

Render provides free hosting for web apps, PostgreSQL, and Redis.

### Step 1: Create Render Account

1. Go to: **https://dashboard.render.com/register**
2. Sign up with:
   - GitHub (recommended - easiest)
   - Email + password
   - Google
3. Authorize Render to access your GitHub repositories

### Step 2: Deploy Using Blueprint (Easiest - Auto Setup)

#### Method A: Import from GitHub (Auto-Detect render.yaml)

1. Go to: **https://dashboard.render.com/blueprints**
2. Click **New Blueprint Instance**
3. Select **freelance-agents-marketplace** repository
4. Render will auto-detect `render.yaml` and show you:
   - **Web Service** (Backend)
   - **PostgreSQL** (Database)
   - **Redis** (Cache)
5. Click **Create Blueprint** (don't add env vars yet)
6. Wait for services to be created (~1-2 minutes)

#### After Services Are Created:

You'll get 3 services with URLs like:
- Backend: `https://freelance-agents-marketplace-backend-xxxx.onrender.com`
- PostgreSQL: Internal connection string (Render provides)
- Redis: Internal connection string (Render provides)

### Step 3: Add Environment Variables

#### For the **Web Service (Backend)**

Click on your Web Service → **Settings** → **Environment Variables** → **Add**

Add these variables:

```bash
# ===================================
# ESSENTIAL - REQUIRED
# ===================================

NODE_ENV=production
PORT=5000

# JWT Secret (from Step 1)
JWT_SECRET=your_generated_jwt_secret_here

# ===================================
# DATABASE (Render provides these automatically)
# ===================================
DATABASE_URL=postgresql://user:password@database-name.render.com/database-name

# Redis (Render provides this automatically)
REDIS_URL=redis://default:password@redis-name.render.com:6379

# ===================================
# STRIPE (from Step 2)
# ===================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# Optional: Webhook (from Step 2, if you set it up)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# ===================================
# OPTIONAL - FEATURES
# ===================================

# Frontend URL (update this after you deploy frontend)
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app

# OAuth - Google (Optional - skip if not using)
# Get from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend-url.onrender.com/api/auth/google/callback

# OAuth - GitHub (Optional - skip if not using)
# Get from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=https://your-backend-url.onrender.com/api/auth/github/callback

# Push Notifications (from Step 3)
VAPID_PUBLIC_KEY=your_vapid_public_key_from_step3
VAPID_PRIVATE_KEY=your_vapid_private_key_from_step3
VAPID_EMAIL=your-email@domain.com
```

**Click "Save Changes" after adding variables**

### Step 4: Trigger Deployment

Go to your **Web Service** → **Manual Deploy** → **Clear build cache & deploy**

Wait 2-3 minutes for the deployment to complete.

### Step 5: Verify Backend is Running

Once deployed, test the health endpoint:

```bash
# Replace with your actual Render URL
curl https://freelance-agents-marketplace-backend-xxxx.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-09T...",
  "port": 5000
}
```

**If you see this, your backend is live!** ✅

### Step 6: Check Database Migrations

Render will automatically run migrations if configured. Check the logs:
1. Go to your Web Service → **Logs**
2. Look for migration messages like "Running migrations..."
3. If you see any database errors, check the DATABASE_URL

---

## 5. Deploy Frontend to Vercel

Vercel provides free hosting for frontend React apps with automatic SSL and CDN.

### Step 1: Create Vercel Account

1. Go to: **https://vercel.com/signup**
2. Sign up with:
   - GitHub (recommended - easiest)
   - Email + password
   - Google
3. Authorize Vercel to access your GitHub repositories

### Step 2: Import Project

1. Go to: **https://vercel.com/new**
2. Click **Import Project**
3. Select **freelance-agents-marketplace** repository
4. Configure:

#### Project Settings:

```
Project Name: freelance-agents-marketplace-frontend
Framework Preset: Vite
Root Directory: ./frontend
Build Command: npm run build
Output Directory: dist
```

5. Make sure **Root Directory** is set to `frontend` (not root)
6. Click **Continue**

### Step 3: Add Environment Variables

In the **Environment Variables** section, add:

```bash
# ===================================
# REQUIRED
# ===================================

# Your backend URL from Step 4 (Render)
VITE_API_URL=https://freelance-agents-marketplace-backend-xxxx.onrender.com

# Stripe Public Key (from Step 2)
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here

# ===================================
# OPTIONAL
# ===================================

# Push Notification Public Key (from Step 3)
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

**Click "Add" for each variable, then "Deploy"**

### Step 4: Wait for Deployment

Vercel will build and deploy your frontend (usually takes 30-60 seconds).

### Step 5: Get Your Frontend URL

After deploying successfully, you'll get a URL like:
```
https://freelance-marketplace-frontend.vercel.app
```

**Copy this URL!** You'll need to update the backend's `FRONTEND_URL` and `CORS_ORIGIN`.

### Step 6: Update Backend Environment Variables

Go back to Render → Backend Service → Environment Variables

Update these with your Vercel URL:

```bash
FRONTEND_URL=https://freelance-marketplace-frontend.vercel.app
CORS_ORIGIN=https://freelance-marketplace-frontend.vercel.app
```

**Save and redeploy the backend** (Manual Deploy → Clear build cache & deploy)

---

## ✅ Verification Checklist

### Backend (Render)
- [ ] Health check returns 200 OK
- [ ] Database migrations ran successfully
- [ ] Redis connection working
- [ ] Environment variables all set
- [ ] No errors in logs

### Frontend (Vercel)
- [ ] Site loads successfully
- [ ] Can access your Vercel URL
- [ ] Can make API calls to backend
- [ ] No console errors

### Integration
- [ ] Frontend can call backend API
- [ ] CORS is working (no CORS errors in browser)
- [ ] User can register/login
- [ ] Can view agents
- [ ] Can browse tasks

---

## 🔧 Troubleshooting

### Issue: Backend deployment fails

**Check:**
- Render logs for errors
- DATABASE_URL is correct (Render provides this)
- JWT_SECRET is set
- All build dependencies are in package.json

**Fix:**
```bash
# Check backend can run locally
cd ~/freelance-agents-marketplace/backend
npm install
npm start
# Then test with: curl http://localhost:5000/health
```

### Issue: Frontend can't connect to backend

**Check:**
- `VITE_API_URL` is correct
- Backend is actually running (test health endpoint)
- CORS origin in backend matches frontend URL

**Fix:**
- Update `VITE_API_URL` in Vercel
- Update `CORS_ORIGIN` in Render
- Redeploy both

### Issue: Database connection errors

**Check:**
- DATABASE_URL is set correctly in Render
- PostgreSQL service is running
- Database name matches migrations

**Fix:**
- Go to PostgreSQL service in Render → Copy Internal Database URL
- Paste into backend's DATABASE_URL

### Issue: CORS errors in browser

**Symptom:** Seeing CORS errors in browser console

**Fix:**
```bash
# In Render backend environment:
CORS_ORIGIN=https://your-frontend.vercel.app

# Make sure there's no trailing slash!
# Wrong: https://your-frontend.vercel.app/
# Right: https://your-frontend.vercel.app
```

---

## 📝 Quick Summary Commands

```bash
# 1. Generate JWT Secret
openssl rand -base64 32

# 2. Generate VAPID Keys
cd ~/freelance-agents-marketplace/backend
npx web-push generate-vapid-keys

# 3. Test Backend (after Render deploy)
curl https://your-backend.onrender.com/health

# 4. Test Backend Locally
cd backend
npm install
npm start
curl http://localhost:5000/health
```

---

## 🎉 You're Done!

Once completed:
1. **Frontend**: https://your-frontend.vercel.app
2. **Backend**: https://your-backend.onrender.com
3. **Database**: Running on Render PostgreSQL
4. **Redis**: Running on Render Redis

**Everything is live and free!** 🚀

---

## 🚀 Next Steps

1. **Deploy Blueprint**: Go to Render dashboard → New Blueprint
2. **Add Env Vars**: Use keys generated above
3. **Deploy Frontend**: Import to Vercel with proper config
4. **Test**: Open frontend URL and test registration

---

**Need help? Check the logs in both Render and Vercel dashboards!**

Good luck with deployment! 🎊
