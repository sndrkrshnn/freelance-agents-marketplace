# Progressive Web App (PWA) Setup Guide

This guide explains how the Freelance AI Agents Marketplace has been configured as a Progressive Web App (PWA) with offline support, push notifications, and mobile optimization.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Push Notifications](#push-notifications)
- [Offline Support](#offline-support)
- [Mobile Optimization](#mobile-optimization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

This application is a full-featured Progressive Web App that provides:

✅ **Installable** on Android (Chrome) and iOS (Safari)
✅ **Offline support** with service worker caching
✅ **Push notifications** using VAPID keys
✅ **IndexedDB** storage for offline data
✅ **Responsive design** optimized for mobile
✅ **Fast load times** with intelligent caching strategies
✅ **App shortcuts** for quick access to key features

## Installation

### Prerequisites

```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install
```

### Generate Icons

```bash
cd frontend
node scripts/generate-icons.js
```

This will generate all required icon sizes in `public/icons/`.

## Configuration

### Environment Variables

#### Frontend (`.env`)

```env
VITE_API_BASE_URL=/api
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

#### Backend (`.env`)

```env
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_EMAIL=admin@freelance-agents-marketplace.com
```

### Generate VAPID Keys

```bash
cd backend
npx web-push generate-vapid-keys
```

Add the generated keys to both frontend and backend `.env` files.

## Push Notifications

### Backend Setup

The push notification service is located in `backend/src/services/pushService.js`.

#### API Endpoints

- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/unsubscribe` - Unsubscribe from push notifications
- `POST /api/push/test` - Send a test notification
- `GET /api/push/vapid-key` - Get the VAPID public key
- `GET /api/push/stats` - Get push statistics (admin only)

#### Database Migration

Run the migration to create the required tables:

```bash
cd backend
npm run migrations:run
```

This creates:
- `push_subscriptions` table
- `notification_logs` table

### Frontend Setup

The push notification hook provides an easy way to request permissions and manage subscriptions.

#### Usage Example

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { PushNotificationPermission, NotificationSettings } from '@/components/notifications'

function MyComponent() {
  const { permission, requestPermission, sendTestNotification } = usePushNotifications()

  const handleEnable = async () => {
    const result = await requestPermission()
    if (result === 'granted') {
      console.log('Notifications enabled!')
    }
  }

  return (
    <div>
      <PushNotificationPermission />
      <button onClick={handleEnable}>Enable Notifications</button>
      <button onClick={sendTestNotification}>Test Notification</button>
      <NotificationSettings />
    </div>
  )
}
```

## Offline Support

### Service Worker

The service worker (`public/sw.js`) implements multiple caching strategies:

- **NetworkFirst** for API requests
- **CacheFirst** for static assets (images, fonts)
- **StaleWhileRevalidate** for JS/CSS files

### Offline Storage

IndexedDB is used to store:
- Draft content (tasks, proposals, messages)
- Offline messages
- Cached tasks

#### Usage Example

```tsx
import { saveOfflineDraft, getAllOfflineDrafts } from '@/services/indexedDB'

async function saveTaskDraft(taskData: any) {
  const draft = {
    id: crypto.randomUUID(),
    type: 'task',
    data: taskData,
    timestamp: Date.now(),
    synced: false
  }
  await saveOfflineDraft(draft)
}

async function loadDrafts() {
  const drafts = await getAllOfflineDrafts()
  console.log('Offline drafts:', drafts)
}
```

### Online Status Hook

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function MyComponent() {
  const isOnline = useOnlineStatus()

  return (
    <div>
      {isOnline ? 'You are online' : 'You are offline'}
    </div>
  )
}
```

## Mobile Optimization

### Responsive Breakpoints

- `xs`: 320-639px (extra small phones)
- `sm`: 640-767px (phones)
- `md`: 768-1023px (tablets)
- `lg`: 1024-1279px (desktops)
- `xl`: 1280+ (large desktops)

### Touch-Friendly Components

All interactive elements have minimum touch target size of 48x48px:

```css
.touch-target {
  @apply min-h-[48px] min-w-[48px] flex items-center justify-center;
}
```

### Safe Area Insets

For notched devices (iPhone X+), use safe area utilities:

```html
<div class="safe-area-top">Header</div>
<div class="safe-area-bottom">Footer</div>
```

### Performance Optimizations

- Lazy loading of images
- Code splitting per route
- Optimized bundle sizes
- WebP format for images
- System fonts fallback
- Minimal JavaScript for initial paint

## Testing

### Lighthouse Audit

Run a Lighthouse PWA audit:

```bash
npm run lighthouse
```

Or use Chrome DevTools:
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Analyze page load"

**Target Score: 100/100**

### Chrome DevTools

#### Service Worker

Go to **Application > Service Workers** to:
- View service worker status
- Update service worker
- Unregister service worker
- View cached resources

#### Manifest

Go to **Application > Manifest** to:
- Verify manifest is valid
- View installed status
- Test "Add to home screen"

### Offline Testing

1. Open DevTools
2. Go to **Network** tab
3. Check "Offline" in the throttling dropdown
4. Refresh the page
5. The offline page should appear

### Push Notification Testing

#### Backend Test

```bash
# Generate VAPID keys first
npx web-push generate-vapid-keys

# Test notification endpoint (requires auth)
curl -X POST http://localhost:5000/api/push/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Frontend Test

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications'

function TestButton() {
  const { sendTestNotification } = usePushNotifications()
  return <button onClick={sendTestNotification}>Send Test</button>
}
```

### Mobile Device Testing

#### Android (Chrome)

1. Open app in Chrome
2. Tap menu → "Add to Home screen"
3. Launch from home screen
4. Verify standalone mode

#### iOS (Safari)

1. Open app in Safari
2. Tap Share → "Add to Home Screen"
3. Launch from home screen
4. Verify standalone mode

## Troubleshooting

### Service Worker Not Registering

Check console for errors and ensure:
- Service worker file exists at `/public/sw.js`
- Site is served over HTTPS (required for production)
- Manifest is valid

### Push Notifications Not Working

1. Verify VAPID keys are set correctly
2. Check notification permission is "granted"
3. Ensure service worker is active
4. Test with notification panel in DevTools

### Icons Not Showing

1. Run icon generation script: `node scripts/generate-icons.js`
2. Verify paths in `manifest.json` are correct
3. Check file permissions

### Offline Page Not Appearing

1. Verify service worker is caching the offline page
2. Check browser support for service worker
3. Try clearing cache and reloading

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Deployment

### Production Checklist

- [ ] HTTPS enabled (required for PWA)
- [ ] VAPID keys configured in production environment
- [ ] Service worker registered and active
- [ ] Manifest is valid and accessible
- [ ] All icon sizes generated
- [ ] Lighthouse score 100/100
- [ ] Offline functionality tested
- [ ] Push notifications tested
- [ ] Mobile responsiveness verified

### Platform-Specific Deployment

#### Vercel

The frontend is configured for Vercel deployment. The build command automatically generates the service worker.

#### Docker

The Docker configuration includes all PWA assets and service worker files.

#### Nginx

Ensure Nginx configuration includes:

```nginx
# Service Worker
location /sw.js {
  add_header Cache-Control "public, max-age=0, must-revalidate";
}

# Manifest
location /manifest.json {
  add_header Cache-Control "public, max-age=0, must-revalidate";
}

# Icons
location /icons/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Vite PWA Plugin](https://vite-plugin-pwa.netlify.app/)

## Support

For issues specific to the PWA implementation, check:
1. Browser console for errors
2. Service Worker status in DevTools
3. Lighthouse audit report
4. Offline functionality
