# 🔥 QUICK: Generate All Keys & Deploy

**3 commands to generate all keys + deployment URLs**

---

## 📋 Quick Commands (Copy & Paste)

### 1. Generate JWT Secret
```bash
openssl rand -base64 32
```
**Copy output** → Use as `JWT_SECRET`

---

### 2. Generate VAPID Keys (Push Notifications)
```bash
cd ~/freelance-agents-marketplace/backend
npx web-push generate-vapid-keys
```
**Copy:**
- Public Key → `VAPID_PUBLIC_KEY`
- Private Key → `VAPID_PRIVATE_KEY`
- Add your email → `VAPID_EMAIL`

---

### 3. Get Stripe Keys
Go to: **https://dashboard.stripe.com/apikeys**
- Copy `pk_test_...` → `STRIPE_PUBLIC_KEY` (Frontend)
- Copy `sk_test_...` → `STRIPE_SECRET_KEY` (Backend)

---

## 🚀 Deploy URLs

### Backend (Render)
Go to: **https://dashboard.render.com/blueprints**
- Import `freelance-agents-marketplace`
- Auto-detects `render.yaml`
- Creates: Backend + PostgreSQL + Redis

### Frontend (Vercel)
Go to: **https://vercel.com/new**
- Import `freelance-agents-marketplace`
- Set Root Directory: `frontend`
- Add env vars
- Deploy

---

## ⚙️ Environment Variables (Backend - Render)

```bash
# REQUIRED
JWT_SECRET=[from command 1]
DATABASE_URL=[Render provides]
REDIS_URL=[Render provides]
STRIPE_SECRET_KEY=[from Stripe]

# OPTIONAL - AFTER FRONTEND DEPLOY
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app

# PUSH NOTIFICATIONS
VAPID_PUBLIC_KEY=[from command 2]
VAPID_PRIVATE_KEY=[from command 2]
VAPID_EMAIL=your-email@domain.com
```

---

## ⚙️ Environment Variables (Frontend - Vercel)

```bash
# REQUIRED
VITE_API_URL=https://your-backend.onrender.com
VITE_STRIPE_PUBLIC_KEY=[from Stripe]

# OPTIONAL
VITE_VAPID_PUBLIC_KEY=[from command 2]
```

---

## 🧪 Test After Deploy

```bash
# Test Backend
curl https://your-backend.onrender.com/health

# Expected:
{"status":"ok","timestamp":"...","port":5000}
```

---

## 📚 Full Guide

See: `COMPLETE_DEPLOYMENT_GUIDE.md` in the repo

Or: https://github.com/sndrkrshnn/freelance-agents-marketplace/blob/main/COMPLETE_DEPLOYMENT_GUIDE.md

---

**That's it! Generate keys → Deploy → Test! 🚀**
