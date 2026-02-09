# Custom Domain Setup - Render.com

This guide explains how to set up a custom domain for your Freelance AI Agents Marketplace deployment on Render.com.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Custom Domain on Backend (Render)](#custom-domain-on-backend-render)
3. [Custom Domain on Frontend (Vercel)](#custom-domain-on-frontend-vercel)
4. [DNS Configuration](#dns-configuration)
5. [SSL Certificates](#ssl-certificates)
6. [Domain Verification](#domain-verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- A registered domain name (e.g., Namecheap, GoDaddy, Google Domains)
- Admin access to your domain's DNS settings
- Access to Render dashboard (https://dashboard.render.com)
- Access to Vercel dashboard (https://vercel.com)

## Custom Domain on Backend (Render)

### Step 1: Add Custom Domain

1. Go to your backend web service in Render dashboard
2. Click on **Settings** tab
3. Scroll down to **Custom Domains** section
4. Click **+ Add Custom Domain**
5. Enter your domain (e.g., `api.yourdomain.com` or `backend.yourdomain.com`)
6. Click **Add**

### Step 2: Configure DNS

Render will provide DNS records that you need to add:

```
Type: CNAME
Name: api (or your subdomain)
Value: [your-service-name].onrender.com
TTL: 300 (or default)
```

Add this record in your domain's DNS management panel.

### Step 3: Verify Domain

1. After adding the DNS record, wait a few minutes for propagation
2. Click **Verify** in Render dashboard
3. Render will check the DNS configuration
4. Once verified, Render will automatically provision an SSL certificate

## Custom Domain on Frontend (Vercel)

### Step 1: Add Custom Domain

1. Go to your project in Vercel dashboard
2. Click on **Settings** tab
3. Click **Domains**
4. Click **Add** button
5. Enter your domain (e.g., `www.yourdomain.com` or `yourdomain.com`)
6. Click **Add**

### Step 2: Configure DNS

For `www.yourdomain.com`:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 300
```

For root domain (`yourdomain.com`):

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 300
```

```
Type: CNAME
Name: cname verification
Value: cname.vercel-dns.com
```

### Step 3: Verify Domain

Vercel will guide you through the verification process:
1. Add the suggested DNS records
2. Wait for DNS propagation (5-60 minutes)
3. Vercel will verify automatically
4. SSL certificate is provisioned automatically

## DNS Configuration

### Recommended Setup

For a professional setup, use this configuration:

```
# Backend API (Render)
api.yourdomain.com → CNAME → [service-name].onrender.com

# Frontend (Vercel)
www.yourdomain.com → CNAME → cname.vercel-dns.com
yourdomain.com → A → 76.76.21.21
```

### Alternative Setup (Subdomain-only)

If you want to use a subdomain for the entire application:

```
# Main application (Frontend + Backend proxy)
app.yourdomain.com → CNAME → cname.vercel-dns.com

# API endpoint (use path-based routing in Vercel)
app.yourdomain.com/api/* → [Render backend URL]
```

## SSL Certificates

### Render SSL

- **Automatic**: Render automatically provisions and renews SSL certificates via Let's Encrypt
- **No cost**: Free SSL certificates for all custom domains
- **HTTPS Only**: All traffic is automatically redirected to HTTPS
- **Certificate Renewal**: Automatic, before expiration

### Vercel SSL

- **Automatic**: Vercel provides free SSL certificates (Let's Encrypt)
- **No cost**: Included in free tier
- **HTTPS Only**: Automatic redirect to HTTPS
- **Wildcard**: Supports wildcard certificates for subdomains

## Domain Verification

### DNS Propagation Time

DNS changes typically take:
- **5-30 minutes**: Fast update
- **1-24 hours**: Typical update
- **Up to 48 hours**: Maximum time (rare)

### Quick Propagation Check

Check if DNS has propagated:

```bash
# Check DNS propagation
dig api.yourdomain.com
```

Or use online tools:
- https://dnschecker.org/
- https://whatsmydns.net/

### Verification Checklist

- [ ] DNS records added to domain provider
- [ ] DNS propagated globally (check multiple regions)
- [ ] Domain verified in Render dashboard
- [ ] Domain verified in Vercel dashboard
- [ ] SSL certificate active in Render
- [ ] SSL certificate active in Vercel
- [ ] Test HTTPS access to frontend
- [ ] Test HTTPS access to backend

## Environment Variables Update

After setting up custom domains, update environment variables:

### Backend (Render)

```env
CORS_ORIGIN=https://www.yourdomain.com,https://yourdomain.com
FRONTEND_URL=https://www.yourdomain.com
```

### Frontend (Vercel)

```env
VITE_API_URL=https://api.yourdomain.com
```

## Testing Your Setup

### Test Frontend

```bash
curl -I https://www.yourdomain.com
```

Should return:
```
HTTP/2 200
content-type: text/html; charset=utf-8
```

### Test Backend Health

```bash
curl https://api.yourdomain.com/health
```

Should return:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-09T20:00:00.000Z",
  "environment": "production"
}
```

### Test API Endpoint

```bash
curl https://api.yourdomain.com/api/v1/users
```

## Troubleshooting

### Issue: DNS Not Propagating

**Symptoms**: Domain not resolving

**Solutions**:
1. Wait longer (up to 48 hours)
2. Verify DNS records are correct
3. Check for typos in DNS configuration
4. Clear local DNS cache: `sudo dscacheutil -flushcache` (macOS) or `ipconfig /flushdns` (Windows)
5. Use different DNS server (8.8.8.8 or 1.1.1.1) for testing

### Issue: SSL Certificate Not Active

**Symptoms**: HTTPS redirects not working, certificate errors

**Solutions**:
1. Wait for certificate provisioning (up to 24 hours)
2. Verify DNS records are correct
3. Check domain verification status in dashboard
4. Ensure domain is not blocked by firewall
5. Contact support if issue persists

### Issue: CORS Errors

**Symptoms**: Browser console shows CORS errors when calling API

**Solutions**:
1. Update CORS_ORIGIN in backend environment variables
2. Add both www and non-www variants if needed
3. Check server CORS configuration
4. Ensure API URL in frontend is correct

### Issue: Mixed Content Warnings

**Symptoms**: Browser warnings about mixed HTTP/HTTPS content

**Solutions**:
1. Ensure all resources use HTTPS
2. Update absolute URLs to use HTTPS
3. Use protocol-relative URLs (e.g., `//cdn.example.com/script.js`)
4. Verify all API calls use HTTPS

### Issue: Domain Shows Default Page

**Symptoms**: Custom domain shows default Vercel/Render page

**Solutions**:
1. Check if project is deployed to production
2. Verify domain is linked to correct project
3. Check deployment logs for errors
4. Redeploy from dashboard

## Best Practices

1. **Use Subdomains**: Use `api.yourdomain.com` for backend API
2. **HTTPS Only**: Never configure HTTP-only domains
3. **DNS TTL**: Use 300 seconds TTL for faster updates
4. **Backup DNS**: Keep a record of all DNS configurations
5. **Regular Checks**: Monitor SSL certificate expiration (auto-renewed but good to verify)
6. **Environment Updates**: Always update environment variables after domain changes
7. **Test Thoroughly**: Test all functionality after domain setup

## Additional Resources

- [Render Custom Domains Docs](https://render.com/docs/custom-domains)
- [Vercel Custom Domains Docs](https://vercel.com/docs/concepts/projects/domains)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [DNS Checker](https://dnschecker.org/)
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html)

## Support

If you encounter issues:

1. Check Render status page: https://status.render.com
2. Check Vercel status page: https://www.vercel-status.com
3. Review deployment logs
4. Check domain provider's DNS documentation
5. Submit support ticket with:
   - Domain name
   - DNS configuration screenshot
   - Error messages
   - Deployment logs
