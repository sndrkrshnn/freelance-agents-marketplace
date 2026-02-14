# 🚀 QUICK DEPLOYMENT GUIDE

Everything is pushed to **https://github.com/sndrkrshnn/freelance-agents-marketplace** ✅

---

## 📱 FRONTEND - Deploy to Vercel (FREE)

### Method 1: Vercel Dashboard (Easiest)

1. **Go to** https://vercel.com/new
2. **Import from GitHub**:
   - Connect your GitHub account
   - Select: `sndrkrshnn/freelance-agents-marketplace`
   - Set **Root Directory**: `frontend`
3. **Configure**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables** (in Vercel dashboard):
   - `VITE_API_URL` = (Add your backend URL after step 2)
   - `VITE_STRIPE_PUBLIC_KEY` = (Get from Stripe dashboard)
5. **Click Deploy** → Wait 1-2 minutes → Done! ✅

### Method 2: Vercel CLI

```bash
# Install CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Production deploy
vercel --prod
```

---

## 🖥️ BACKEND - Deploy to Render (FREE)

### Method 1: Render Blueprint (Easiest - Auto Setup)

1. **Go to** https://dashboard.render.com/blueprints
2. **Connect GitHub** → Select repository
3. Render will auto-detect `render.yaml` and create:
   - ✅ Web Service (Backend)
   - ✅ PostgreSQL Database
   - ✅ Redis Instance
4. **Add Environment Variables**:
   - `JWT_SECRET` = Generate random string (use: `openssl rand -base64 32`)
   - `STRIPE_SECRET_KEY` = Get from Stripe
   - `STRIPE_WEBHOOK_SECRET` = Get from Stripe
   - `GOOGLE_CLIENT_ID` = OAuth setup (optional)
   - `GOOGLE_CLIENT_SECRET` = OAuth setup (optional)
   - `GITHUB_CLIENT_ID` = OAuth setup (optional)
   - `GITHUB_CLIENT_SECRET` = OAuth setup (optional)
   - `VAPID_PUBLIC_KEY` = Generate: `npx web-push generate-vapid-keys`
   - `VAPID_PRIVATE_KEY` = From the command above
   - `VAPID_EMAIL` = Your email

### Method 2: Manual Setup on Render

1. **Create PostgreSQL**:
   - New → PostgreSQL → Free tier
   - Copy the **Internal Database URL**

2. **Create Redis**:
   - New → Redis → Free tier
   - Copy the **Internal Redis URL**

3. **Create Web Service**:
   - New → Web Service → Connect GitHub
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add Environment Variables (see above)

4. **Copy the Backend URL** (looks like: `https://your-app.onrender.com`)
5. Add this to Vercel's `VITE_API_URL`

---

## 🔧 Environment Variables Reference

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
```

### Backend (Render)
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=(provided by Render PostgreSQL)
REDIS_URL=(provided by Render Redis)
JWT_SECRET=(generate with: openssl rand -base64 32)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app
```

### OAuth (Optional)
```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GITHUB_CLIENT_ID=Iv1xxxxx
GITHUB_CLIENT_SECRET=xxxxx
OAUTH_SUCCESS_REDIRECT=https://your-frontend.vercel.app/dashboard
OAUTH_FAILURE_REDIRECT=https://your-frontend.vercel.app/login
```

### Push Notifications
```env
# Generate keys with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx
VAPID_EMAIL=admin@yourdomain.com
```

---

## ✅ Deployment Checklist

### Before Deploying
- [ ] All code is pushed to GitHub ✅ (done!)
- [ ] Generate JWT secret: `openssl rand -base64 32`
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Get Stripe keys from https://dashboard.stripe.com/test/apikeys

### Deploy Backend (Render)
- [ ] Create PostgreSQL database
- [ ] Create Redis instance
- [ ] Create Web Service
- [ ] Add all environment variables
- [ ] Wait for deployment (~2-3 minutes)
- [ ] Test: Visit https://your-backend.onrender.com/health

### Deploy Frontend (Vercel)
- [ ] Import repository
- [ ] Configure build settings
- [ ] Add VITE_API_URL from backend
- [ ] Add VITE_STRIPE_PUBLIC_KEY
- [ ] Click Deploy
- [ ] Wait ~30 seconds
- [ ] Test: Visit your Vercel URL

### After Deployment
- [ ] Frontend can call backend API
- [ ] User can register/login
- [ ] Real-time chat works
- [ ] File uploads work
- [ ] PWA is installable (check devtools → app → manifest)
- [ ] Push notifications work

---

## 🧪 Testing Production

### API Health Check
```bash
curl https://your-backend.onrender.com/health
# Should return: { "status": "ok", "timestamp": "..." }
```

### PWA Verification
1. Open Chrome DevTools → Application tab
2. Check: Manifest, Service Workers
3. Run Lighthouse PWA audit (target: 100/100)

---

## 📊 Monitoring

### Vercel
- Dashboard: https://vercel.com/dashboard
- Logs, Analytics, Deployments

### Render
- Dashboard: https://dashboard.render.com
- Logs, Metrics, Events

---

## 🆘 Troubleshooting

### Issue: Frontend can't connect to backend
- Check CORS origin in backend
- Check VITE_API_URL in frontend
- Both URLs should be correct and accessible

### Issue: Database connection fails
- Check DATABASE_URL in Render
- PostgreSQL instance must be running
- Try "Deploy" again on Render

### Issue: Redis connection fails
- Check REDIS_URL in Render
- Redis instance must be running
- Try "Deploy" again on Render

### Issue: PWA not installable
- Check manifest.json is at root
- Check service worker is registered
- Must be HTTPS (Vercel provides this)

---

## 📝 Next Steps

1. **Deploy Backend first** → Get the URL
2. **Deploy Frontend with Backend URL** → Get the URL
3. **Test the full flow** → Register, browse agents, create tasks
4. **Optional**: OAuth, Stripe payments (requires separate setup)

---

## 🎉 You're Live!

Your Freelance AI Marketplace is now:
- ✅ Hosted on **Vercel (Frontend)** + **Render (Backend)**
- ✅ 100% FREE deployment
- ✅ HTTPS secured
- ✅ Auto-scaling
- ✅ CI/CD with GitHub connected

**GitHub Repo**: https://github.com/sndrkrshnn/freelance-agents-marketplace

Enjoy your new AI agents marketplace! 🚀🤖
