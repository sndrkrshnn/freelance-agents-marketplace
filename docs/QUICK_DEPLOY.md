# Quick Deploy Guide - Render Free Tier

🚀 Deploy your Freelance AI Marketplace in minutes with **ZERO cost**.

## TL;DR - One-Click Deploy

```bash
git clone <your-repo>
cd freelance-agents-marketplace
./scripts/setup-render.sh
```

Or read below for manual deployment steps.

---

## 5-Minute Setup

### Step 1: Prepare Your Repository (2 min)

1. **Push code to GitHub** (if not already done)
2. **Create Render account**: https://render.com/register
3. **Create Vercel account**: https://vercel.com/signup

### Step 2: Backend (Render) - 3 Services (10 min)

#### A. PostgreSQL Database
1. Go to Render → **New +** → **PostgreSQL**
2. Name: `freelance-agents-marketplace-db`
3. Click **Create Database**
4. ⏱️ Copy **Internal Database URL** (save for later)

#### B. Redis Cache
1. Go to Render → **New +** → **Redis**
2. Name: `freelance-agents-marketplace-redis`
3. Click **Create Redis**
4. ⏱️ Copy **Internal Redis URL** (save for later)

#### C. Backend API
1. Go to Render → **New +** → **Web Service**
2. Connect your GitHub repository
3. **Build settings:**
   - Runtime: **Docker**
   - Context: `./backend`
   - Dockerfile: `Dockerfile.render`
4. **Environment Variables:**
   ```env
   NODE_ENV=production
   DATABASE_URL=<from PostgreSQL>
   REDIS_URL=<from Redis>
   JWT_SECRET=<generate: openssl rand -base64 32>
   JWT_REFRESH_SECRET=<generate: openssl rand -base64 32>
   CORS_ORIGIN=https://freelance-agents-marketplace.vercel.app
   STRIPE_SECRET_KEY=sk_test_<your_key>
   ```
5. **Health Check**: `/health`
6. Click **Deploy**
7. ⏱️ Wait 5-10 minutes for first build

### Step 3: Frontend (Vercel) - 1 Service (3 min)

1. Go to Vercel → **Add New** → **Project**
2. Import your GitHub repository
3. **Settings:**
   - Framework: **Vite**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
4. **Environment Variables:**
   ```env
   VITE_API_URL=https://your-api.onrender.com
   VITE_STRIPE_PUBLIC_KEY=pk_test_<your_key>
   ```
5. Click **Deploy**
6. ⏱️ Wait 2-3 minutes

### Step 4: Verify & Connect (2 min)

1. **Test Backend:**
   ```bash
   curl https://your-api.onrender.com/health
   ```
   Should return: `{"success":true,"status":"healthy"...}`

2. **Test Frontend:**
   - Open your Vercel URL in browser
   - Verify page loads without errors

3. **Update Backend CORS:**
   - Go to Render → Backend Service → Environment
   - Update `CORS_ORIGIN` to your Vercel URL
   - Redeploy (automatic)

---

## ✅ Success Checklist

- [ ] PostgreSQL running on Render
- [ ] Redis running on Render
- [ ] Backend API deployed on Render
- [ ] Health endpoint working
- [ ] Frontend deployed on Vercel
- [ ] Frontend can call backend API
- [ ] User can register and login
- [ ] Database migrations completed
- [ ] No console errors in browser

---

## 📝 Next Steps

1. **Get your URLs:**
   - Backend: `https://your-api.onrender.com`
   - Frontend: `https://freelance-agents-marketplace.vercel.app`

2. **Setup Stripe** (for payments):
   - Create account: https://dashboard.stripe.com/register
   - Get API keys
   - Update environment variables on both services

3. **Custom Domain** (optional):
   - See [render-domain-setup.md](render-domain-setup.md)

4. **Monitor deployments:**
   - Render: https://dashboard.render.com
   - Vercel: https://vercel.com/dashboard

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend 502 error | Wait 10-15s (service spin-up) |
| Database connection failed | Check DATABASE_URL in environment vars |
| CORS error | Update CORS_ORIGIN, redeploy backend |
| Build fails | Check Render logs for error details |
| Frontend not loading | Check browser console for errors |

For detailed troubleshooting, see [DEPLOYMENT_RENDER.md](DEPLOYMENT_RENDER.md)

---

## 📊 Architecture

```
📱 User (Browser)
    │
    ▼
🎨 Frontend (Vercel) - https://app.vercel.app
    │ HTTPS
    ▼
🔧 Backend API (Render) - https://api.onrender.com
    │
    ├─► 🗄️ PostgreSQL (Database)
    ├─► 💾 Redis (Cache)
    └─► 💳 Stripe (Payments)
```

---

## 💰 Cost Breakdown

| Service | Cost |
|---------|------|
| Render Web Service | $0 |
| Render PostgreSQL | $0 |
| Render Redis | $0 |
| Vercel Frontend | $0 |
| **Total** | **$0/month** |

---

## 🔧 Required Files

Your repository should have:

```
freelance-agents-marketplace/
├── render.yaml                  # ✅ Render configuration
├── backend/
│   ├── Dockerfile.render        # ✅ Optimized Dockerfile
│   └── package.json             # ✅ With render script
├── frontend/
│   ├── vercel.json              # ✅ Vercel configuration
│   └── package.json             # ✅ With vercel-build script
├── scripts/
│   ├── setup-render.sh          # ✅ Setup script
│   └── render-migrate.sh        # ✅ Migration script
└── docs/
    ├── DEPLOYMENT_RENDER.md     # ✅ Full deployment guide
    └── REDIS_SETUP.md           # ✅ Redis configuration
```

---

## ⚡ Performance Tips

Free tier backend spins down after 15 min inactivity.

**Solutions**:
1. ✅ Accept the 5-10s wake-up time
2. ✅ Implement loading states in frontend
3. ✅ Use optimistic UI updates
4. ❌ Don't try to keep it alive (wastes resources)

---

## 📖 Full Documentation

- [Complete Deployment Guide](DEPLOYMENT_RENDER.md)
- [Custom Domain Setup](render-domain-setup.md)
- [Redis Configuration](REDIS_SETUP.md)
- [Main README](../README.md)

---

## 🎯 Common Commands

```bash
# Generate secrets
openssl rand -base64 32

# Test health endpoint
curl https://your-api.onrender.com/health

# Test Redis (if endpoint exists)
curl https://your-api.onrender.com/api/v1/health/redis

# Check Render logs
# Go to Render Dashboard → Your Service → Logs

# Trigger new deployment
# Go to Render Dashboard → Your Service → Manual Deploy
```

---

## 💡 Pro Tips

1. **Use Render's environment variable generation** for secrets
   - `JWT_SECRET`: Generate value
   - STRIPE_WEBHOOK_SECRET: Generate value

2. **Keep frontend and backend separate**
   - Frontend on Vercel (static, fast)
   - Backend on Render (API, DB)

3. **Monitor free tier usage**
   - PostgreSQL: 90 connections, 512MB storage
   - Redis: 25MB memory, 10 connections
   - Backend: 512MB RAM, spins down after 15min

4. **Database migrations run automatically** on deploy
   - Check Render logs to verify
   - Manual SSH available if needed

5. **Git-based deployment is automatic**
   - Push to main → Auto deploy
   - Use feature branches for testing

---

### Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Issue? Check [DEPLOYMENT_RENDER.md](DEPLOYMENT_RENDER.md) Troubleshooting section

---

**Deploy time**: ~15-20 minutes (first deployment)  
**Cost**: $0/month  
**Difficulty**: Easy 🟢

Happy deploying! 🚀
