# Docker Setup Guide

Complete Docker infrastructure for the Freelance AI Agents Marketplace.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Services](#services)
6. [Commands](#commands)
7. [Development](#development)
8. [Production Deployment](#production-deployment)
9. [SSL/HTTPS Setup](#sslhttps-setup)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance](#maintenance)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Reverse Proxy)              │
│                        Port 80/443                         │
│  • SSL Termination  • Security Headers  • Rate Limiting   │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
    ┌──────▼────────┐            ┌────────▼─────────┐
    │   Frontend    │            │     Backend      │
    │ (Nginx/React) │            │   (Node.js)      │
    │    Port 80    │            │    Port 5000     │
    └───────────────┘            └────────┬─────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │                                 │
                  ┌──────▼────────┐              ┌────────▼─────────┐
                  │   PostgreSQL  │              │      Redis       │
                  │     Port 5432 │              │     Port 6379    │
                  └───────────────┘              └──────────────────┘
```

### Services

| Service | Image | Ports | Description |
|---------|-------|-------|-------------|
| **frontend** | freelance-marketplace-frontend | 80 | React/Vite application served via Nginx |
| **backend** | freelance-marketplace-backend | 5000 | Node.js Express API |
| **postgres** | postgres:15-alpine | 5432 | PostgreSQL database |
| **redis** | redis:7-alpine | 6379 | Redis cache and session store |
| **nginx** | nginx:alpine | 80, 443 | Reverse proxy and SSL termination |
| **watchtower** | containrrr/watchtower | - | Automatic container updates |

### Development Services (dev only)

| Service | Image | Ports | Description |
|---------|-------|-------|-------------|
| **pgadmin** | dpage/pgadmin4 | 8080 | Database management UI |
| **redis-commander** | rediscommander/redis-commander | 8081 | Redis management UI |
| **mailhog** | mailhog/mailhog | 8025, 1025 | Email testing SMTP server |

---

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

### Check Installation

```bash
docker --version
docker compose version
```

### System Requirements

- **RAM**: Minimum 4GB, Recommended 8GB+
- **Disk**: 10GB+ free space
- **CPU**: 2+ cores recommended

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd freelance-agents-marketplace
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

**Critical variables to set:**
- `POSTGRES_PASSWORD` - Generate a strong password
- `JWT_SECRET` - Generate a secure random string (min 32 chars)
- `ENCRYPTION_KEY` - Generate a 32-byte encryption key
- `STRIPE_SECRET_KEY` - Your Stripe secret key (if using payments)

### 3. Start Services

```bash
# Production mode
./scripts/start-docker.sh start prod

# Development mode (with hot-reload)
./scripts/start-docker.sh start dev
```

### 4. Run Database Migrations

```bash
./scripts/start-docker.sh migrate prod
```

### 5. Access Application

**Production:**
- Frontend: http://localhost
- API: http://localhost/api
- API Docs: http://localhost/api/docs

**Development:**
- Frontend (Vite): http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api/docs
- PGAdmin: http://localhost:8080
- Redis Commander: http://localhost:8081
- Mailhog: http://localhost:8025

---

## Configuration

### Environment Variables

All configuration is managed through environment variables:

- **Root `.env`** - Main configuration for all services
- **`backend/.env.production`** - Backend-specific production config

### Key Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Main environment variables |
| `backend/.env.production` | Backend production overrides |
| `docker-compose.yml` | Production service definitions |
| `docker-compose.dev.yml` | Development overrides |
| `nginx/nginx.conf` | Nginx reverse proxy config |
| `frontend/nginx.conf` | Frontend Nginx config |

### Volumes

Data persistence is managed via Docker volumes:

- `postgres_data` - PostgreSQL database
- `redis_data` - Redis cache persistence
- `ssl_certs` - SSL certificates
- `backend_logs` - Backend application logs
- `nginx_logs` - Nginx access/error logs

---

## Services

### Backend

**Image:** `freelance-marketplace-backend`

**Features:**
- Multi-stage build (build → production)
- Non-root user execution (nodejs:1001)
- Automatic database migrations on startup
- Health check at `/health`
- Signal handling via dumb-init
- Optimized Node.js settings

**Health Check:**
```bash
curl http://localhost:5000/health
```

### Frontend

**Image:** `freelance-marketplace-frontend`

**Features:**
- Multi-stage build (deps → build → nginx)
- Nginx Alpine serve
- Gzip compression
- SPA routing support
- Asset optimization
- Non-root user execution

**Health Check:**
```bash
curl http://localhost/health
```

### PostgreSQL

**Image:** `postgres:15-alpine`

**Features:**
- Data persistence
- Automatic initialization via init-db.sql
- Health check ready before app starts
- Extension support (uuid-ossp, pg_trgm, unaccent)

**Connection:**
```
Host: postgres
Port: 5432
Database: freelance_marketplace
User: freelance_user
Password: (from .env)
```

### Redis

**Image:** `redis:7-alpine`

**Features:**
- AOF persistence
- LRU eviction policy
 Memory limit: 512MB
- Health check via ping

**Connection:**
```
Host: redis
Port: 6379
```

### Nginx Reverse Proxy

**Image:** `nginx:alpine`

**Features:**
- SSL/TLS termination
- HTTP/2 support
- Gzip compression
- Security headers
- Rate limiting
- WebSocket proxy (Socket.IO)
- Cache headers
- SPA routing

### Watchtower

**Image:** `containrrr/watchtower`

**Features:**
- Automatic container updates
- Daily polling (24 hours)
- Cleanup old images
- Label-based targeting

---

## Commands

The `start-docker.sh` script provides all docker management commands.

### Usage

```bash
./scripts/start-docker.sh [command] [environment]
```

### Commands

| Command | Description |
|---------|-------------|
| `start [env]` | Start all services |
| `stop [env]` | Stop all services |
| `restart [env]` | Restart all services |
| `logs [env] [service]` | View logs (add `-f` to follow) |
| `status [env]` | Show service status |
| `build [env]` | Build/rebuild images |
| `clean` | Remove containers, volumes, and images |
| `migrate [env]` | Run database migrations |
| `seed [env]` | Seed database with sample data |
| `shell [env] [service]` | Open shell in a service |
| `health [env]` | Run health checks |
| `help` | Show help message |

### Examples

```bash
# Start production
./scripts/start-docker.sh start prod

# Start development with hot-reload
./scripts/start-docker.sh start dev

# View backend logs
./scripts/start-docker.sh logs prod backend

# Follow all logs
./scripts/start-docker.sh logs dev -f

# Run migrations
./scripts/start-docker.sh migrate prod

# Open shell in PostgreSQL
./scripts/start-docker.sh shell prod postgres

# Build images without cache
./scripts/start-docker.sh build prod
```

---

## Development

### Development Environment

The development environment includes:

1. **Backend Hot-Reload**
   - Nodemon watches for file changes
   - Debug port exposed: 9229
   - Source mounts for instant updates

2. **Frontend Hot-Module Replacement**
   - Vite dev server with HMR
   - Source mounts for instant updates
   - Direct access at http://localhost:3000

3. **Development Tools**
   - PGAdmin (Database UI)
   - Redis Commander (Redis UI)
   - Mailhog (Email testing)

### Enable/Disable Nginx in Dev

By default, development mode bypasses nginx for direct access.
To enable nginx in dev:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile with-nginx up
```

### Debugging

#### Backend with VSCode

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Backend",
      "remoteRoot": "/app",
      "localRoot": "${workspaceFolder}/backend",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    }
  ]
}
```

#### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

---

## Production Deployment

### Before Production

1. **Set strong secrets**
   ```bash
   # Generate secure random strings
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For ENCRYPTION_KEY
   openssl rand -base64 32  # For SESSION_SECRET
   ```

2. **Configure real values**
   - Update `FRONTEND_URL` to your actual domain
   - Set up Stripe keys for payments
   - Configure SMTP for emails

3. **Enable SSL** (see [SSL/HTTPS Setup](#sslhttps-setup))

### Build for Production

```bash
# Build images
./scripts/start-docker.sh build prod

# Tag for registry
docker tag freelance-marketplace-backend:latest your-registry/freelance-marketplace-backend:v1.0.0
docker tag freelance-marketplace-frontend:latest your-registry/freelance-marketplace-frontend:v1.0.0
```

### Start Production Services

```bash
./scripts/start-docker.sh start prod
```

### Health Checks

```bash
# Run health checks
./scripts/start-docker.sh health prod

# Or manually
curl http://localhost/health
curl http://localhost/api/health
```

---

## SSL/HTTPS Setup

### Let's Encrypt with Certbot

#### 1. Prepare Certbot Directory

```bash
mkdir -p nginx/certbot/work nginx/certbot/config
```

#### 2. Obtain Certificate

Create temporary docker-compose for certbot:

```bash
docker run --rm -it \
  -v $(pwd)/nginx/certbot/config:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot/work:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d freelance-marketplace.com -d www.freelance-marketplace.com
```

#### 3. Update Nginx Config

Certificates will be available at:
- `/etc/letsencrypt/live/freelance-marketplace.com/fullchain.pem`
- `/etc/letsencrypt/live/freelance-marketplace.com/privkey.pem`

Update `nginx/nginx.conf` with your domain.

#### 4. Auto-Renewal Certificate

Add to crontab:
```bash
0 0,12 * * * docker run --rm \
  -v $(pwd)/nginx/certbot/config:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot/work:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot renew --quiet && docker-compose restart nginx
```

### Manual SSL Certificates

If using your own SSL certificates:

1. Place certificates in `nginx/ssl/`
2. Update paths in `nginx/nginx.conf`
3. Restart nginx:
```bash
docker compose restart nginx
```

---

## Troubleshooting

### Containers Not Starting

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Check container status
docker compose ps
```

### Database Connection Issues

```bash
# Check postgres is healthy
docker compose ps postgres

# Wait for postgres manually
docker compose logs -f postgres
```

### Port Already in Use

```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Or change ports in docker-compose.yml
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a --volumes

# Check disk usage
docker system df
```

### Redis Connection Refused

```bash
# Check redis status
docker compose logs redis

# Test connection
docker compose exec redis redis-cli ping
```

### Migration Errors

```bash
# Run migrations with verbose output
docker compose exec backend npm run migrations:run

# Check database connection
docker compose exec backend sh -c "node -e \"console.log(process.env.DB_HOST)\""
```

### Permission Issues

```bash
# Fix script permissions
chmod +x scripts/start-docker.sh

# Fix volume permissions
sudo chown -R $USER:$USER uploads/
sudo chown -R $USER:$USER backend/logs/
```

---

## Maintenance

### Regular Tasks

#### Daily
- Monitor logs: `./scripts/start-docker.sh logs prod`
- Check health: `./scripts/start-docker.sh health prod`

#### Weekly
- Clean up logs if they get too large
- Review error logs for issues

#### Monthly
- Update images: Watchtower handles this automatically
- Backup database
- Review security updates

### Database Backup

```bash
# Backup
docker compose exec postgres pg_dump -U freelance_user freelance_marketplace > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U freelance_user freelance_marketplace
```

### View Logs

```bash
# All services
docker compose logs --tail=100 -f

# Specific service
docker compose logs -f backend

# Last 1000 lines
docker compose logs --tail=1000 backend
```

### Resource Monitoring

```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Volume usage
docker system df -v
```

### Clean Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Clean everything
./scripts/start-docker.sh clean
```

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for all services
3. **Enable SSL/HTTPS** in production
4. **Keep images updated** - Watchtower auto-updates
5. **Limit container resources** - Configure in docker-compose.yml
6. **Use non-root users** - Already configured in Dockerfiles
7. **Enable security headers** - Configured in Nginx
8. **Rate limiting** - Enabled in Nginx
9. **Regular backups** - Database backup procedures
10. **Monitor logs** - Set up log aggregation

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review logs for error messages
3. Check GitHub Issues for known problems
4. Create a new issue with details

---

**Built with ❤️ for the Freelance AI Agents Marketplace**
