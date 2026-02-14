# 🚀 Deployment Guide - Free Tier

Complete deployment documentation for the Freelance AI Marketplace on **Render.com + Vercel** with **ZERO cost**.

---

## 📋 Quick Links

| Guide | Description | Reading Time |
|-------|-------------|--------------|
| [Quick Deploy](docs/QUICK_DEPLOY.md) | ⚡ Deploy in 15 minutes | 5 min |
| [Full Deployment Guide](docs/DEPLOYMENT_RENDER.md) | 📚 Complete deployment documentation | 15 min |
| [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) | ✅ Verify everything is configured | 10 min |
| [Custom Domain Setup](docs/render-domain-setup.md) | 🌐 Set up your own domain | 8 min |
| [Redis Configuration](docs/REDIS_SETUP.md) | 💾 Redis cache setup and usage | 10 min |

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────┐
│              Users / Browsers                 │
└───────────────────┬───────────────────────────┘
                    │ HTTPS
                    ▼
┌───────────────────────────────────────────────┐
│         Frontend (Vercel)                     │
│  • React + TypeScript                        │
│  • Global CDN                                 │
│  • Auto SSL                                   │
│  • URL: https://your-app.vercel.app          │
└───────────────────┬───────────────────────────┘
                    │ HTTPS
                    ▼
┌───────────────────────────────────────────────┐
│         Backend API (Render)                  │
│  • Node.js + Express                          │
│  • REST API + WebSockets                      │
│  • Health Checks                              │
│  • Auto SSL                                   │
│  • URL: https://your-api.onrender.com        │
└───────────┬───────────────────────────────┬───┘
            │                               │
            ▼                               ▼
┌───────────────────┐         ┌───────────────────┐
│  PostgreSQL       │         │  Redis            │
│  (Render DB)      │         │  (Render Cache)   │
│  • 512MB storage  │         │  • 25MB memory    │
│  • 90 connections │         │  • Fast access    │
│  • Auto backups   │         │  • LRU eviction   │
└───────────────────┘         └───────────────────┘
```

---

## 💰 Cost Breakdown

| Service | Platform | Plan | Cost |
|---------|----------|------|------|
| Web Service (Backend) | Render.com | Free | **$0** |
| PostgreSQL Database | Render.com | Free | **$0** |
| Redis Cache | Render.com | Free | **$0** |
| Frontend (Static) | Vercel | Free | **$0** |
| **Total** | | | **$0/month** |

---

## ⚡ Quick Start

### Option 1: Automated (Recommended)

```bash
# 1. Clone repository
git clone <your-repo>
cd freelance-agents-marketplace

# 2. Run setup script
chmod +x scripts/setup-render.sh
./scripts/setup-render.sh
```

Follow the interactive prompts.

### Option 2: Manual Steps

1. **Create Render Account**: https://render.com/register
2. **Create Vercel Account**: https://vercel.com/signup
3. **Deploy to Render**:
   - Create PostgreSQL
   - Create Redis
   - Create Backend Web Service
4. **Deploy to Vercel**:
   - Connect GitHub repository
   - Configure build settings
   - Deploy

Read [Quick Deploy Guide](docs/QUICK_DEPLOY.md) for detailed steps.

---

## 📁 Deployment Files

Your repository should include:

```
freelance-agents-marketplace/
├── render.yaml                      # Render service definitions
├── backend/
│   ├── Dockerfile.render            # Optimized Dockerfile for Render
│   └── package.json                 # With render start script
├── frontend/
│   ├── vercel.json                  # Vercel configuration
│   ├── .vercelignore                # Files to ignore
│   └── package.json                 # With vercel-build script
├── scripts/
│   ├── setup-render.sh              # Automated setup script
│   └── render-migrate.sh            # Migration script
└── docs/
    ├── DEPLOYMENT_RENDER.md         # Full deployment guide
    ├── QUICK_DEPLOY.md              # 5-minute quick start
    ├── DEPLOYMENT_CHECKLIST.md      # Verification checklist
    ├── render-domain-setup.md       # Custom domain guide
    └── REDIS_SETUP.md               # Redis configuration
```

---

## 🔧 Environment Variables

### Backend (Render)

```env
# Application
NODE_ENV=production
PORT=5000

# Database (from Render PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (from Render Redis)
REDIS_URL=redis://host:port

# Authentication
JWT_SECRET=<generate: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<generate: openssl rand -base64 32>
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=<generate>

# Performance
NODE_OPTIONS=--max-old-space-size=384
```

### Frontend (Vercel)

```env
VITE_API_URL=https://your-api.onrender.com
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here
```

---

## ✅ Verification

### Test Backend

```bash
# Health check
curl https://your-api.onrender.com/health

# Expected response
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-09T20:00:00.000Z",
  "environment": "production"
}
```

### Test Frontend

1. Open `https://your-app.vercel.app` in browser
2. Check browser console for errors
3. Attempt to register/login
4. Verify API calls succeed

---

## 📊 Free Tier Specifications

### Render Web Service
- **RAM**: 512 MB
- **CPU**: 0.1 vCPU (shared)
- **Storage**: 10 GB (ephemeral)
- **Behavior**: Spins down after 15min inactivity
- **Wake-up time**: ~10 seconds

### Render PostgreSQL
- **RAM**: 512 MB
- **Storage**: 512 MB
- **Connections**: 90 max
- **Backups**: Daily, 7-day retention

### Render Redis
- **RAM**: 25 MB (in-memory)
- **Connections**: 10 max
- **Eviction**: LRU (Least Recently Used)
- **Persistence**: None (memory-only)

### Vercel Frontend
- **Bandwidth**: 100 GB/month
- **Builds**: 6,000/month
- **Functions**: 100 GB-hours/month
- **CDN**: Global

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Backend slow on first request | Normal - service spins down after 15min |
| Database connection error | Check DATABASE_URL in Render |
| CORS error in browser | Update CORS_ORIGIN, redeploy backend |
| Build fails on Render | Check Dockerfile and logs |
| Frontend can't call backend | Check VITE_API_URL in Vercel |

For detailed troubleshooting, see [DEPLOYMENT_RENDER.md](docs/DEPLOYMENT_RENDER.md#troubleshooting).

---

## 📚 Documentation

### Deployment Guides
- [Quick Deploy Guide](docs/QUICK_DEPLOY.md) - Get running in 15 minutes
- [Full Deployment Guide](docs/DEPLOYMENT_RENDER.md) - Complete documentation
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) - Verify everything

### Additional Guides
- [Custom Domain Setup](docs/render-domain-setup.md) - Use your own domain
- [Redis Configuration](docs/REDIS_SETUP.md) - Redis cache setup

### Main Documentation
- [README.md](README.md) - Project overview
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - Technical details

---

## 🎯 Next Steps

1. **Deploy now** - Follow [Quick Deploy Guide](docs/QUICK_DEPLOY.md)
2. **Test thoroughly** - Use the [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)
3. **Set up custom domain** - See [render-domain-setup.md](docs/render-domain-setup.md)
4. **Configure Stripe** - Add payment functionality
5. **Monitor** - Set up alerts in Render and Vercel dashboards

---

## 🔑 Security Best Practices

- ✅ Never commit secrets to Git
- ✅ Use Render's environment variable generation for secrets
- ✅ Generate unique JWT secrets for production
- ✅ Use HTTPS only (automatic on Render/Vercel)
- ✅ Keep dependencies updated
- ✅ Enable rate limiting
- ✅ Validate all inputs
- ✅ Use parameterized SQL queries
- ✅ Implement proper CORS configuration

---

## 📞 Support

### Documentation
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Redis Documentation](https://redis.io/documentation)

### Status Pages
- [Render Status](https://status.render.com)
- [Vercel Status](https://www.vercel-status.com)

### Community
- [Render Community](https://community.render.com)
- [Vercel Discord](https://vercel.com/discord)
- [Stack Overflow](https://stackoverflow.com) (tags: render, vercel)

---

## 📝 Changelog

### v1.0.0 (2026-02-09)
- Initial deployment configuration
- Complete documentation suite
- Automated setup scripts
- Free tier optimization

---

**Deployment Time**: ~15-20 minutes (first deployment)  
**Total Cost**: $0/month  
**Difficulty**: Easy 🟢  

Happy deploying! 🚀
