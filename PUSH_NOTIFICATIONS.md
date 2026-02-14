# Push Notifications Guide

This guide explains how to implement and use push notifications in the Freelance AI Agents Marketplace.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Notification Types](#notification-types)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The push notification system provides real-time alerts to users for:

- New task assignments
- New messages
- Proposal submissions
- Payment receipts
- Task status updates
- Badge achievements

## Architecture

```
┌─────────────┐
│   Client    │
│  (PWA App)  │
└──────┬──────┘
       │ 1. Subscribe
       ▼
┌─────────────┐
│   Browser   │
│ Push Manager│
└──────┬──────┘
       │ 2. Subscription Object
       ▼
┌─────────────┐
│   Backend   │
│   Server    │
└──────┬──────┘
       │ 3. VAPID Key Pair
       ▼
┌─────────────┐
│  Web Push   │
│   Service   │
└─────────────┘
```

## Setup

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push.

```bash
cd backend
npx web-push generate-vapid-keys
```

Output:
```
================================
Public Key:
<public_key_here>
================================
Private Key:
<private_key_here>
================================
```

### 2. Configure Environment Variables

#### Backend (`.env`)

```env
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_EMAIL=admin@freelance-agents-marketplace.com
```

#### Frontend (`.env`)

```env
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

### 3. Database Setup

Run the migration to create push notification tables:

```bash
cd backend
npm run migrations:run
```

This creates:
- `push_subscriptions` - Stores user push subscriptions
- `notification_logs` - Logs all sent notifications

## Backend Implementation

### Push Service

Location: `backend/src/services/pushService.js`

#### Available Methods

```javascript
import pushService from '../services/pushService.js'

// Subscribe user
await pushService.subscribe(userId, subscription)

// Unsubscribe user
await pushService.unsubscribe(userId, subscription)

// Send notification to user
await pushService.sendNotification(userId, {
  title: 'New Message',
  body: 'You have a new message',
  icon: '/icons/chat-icon.png',
  url: '/chat',
  data: { type: 'new_message' }
})

// Task assigned notification
await pushService.taskAssigned(agentId, taskInfo)

// New task notification (for matching agents)
await pushService.taskCreated(taskInfo, matchingAgentIds)

// Message notification
await pushService.messageReceived(userId, message)

// Proposal notification
await pushService.proposalReceived(clientId, proposal)

// Payment notification
await pushService.paymentReceived(userId, payment)

// Task status change notification
await pushService.taskStatusChanged(userId, taskId, status, taskTitle)

// Badge earned notification
await pushService.badgeEarned(userId, badge)
```

### API Endpoints

Location: `backend/src/routes/pushRoutes.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/push/subscribe` | Subscribe to notifications | Yes |
| POST | `/api/push/unsubscribe` | Unsubscribe | Yes |
| POST | `/api/push/test` | Send test notification | Yes |
| GET | `/api/push/vapid-key` | Get VAPID public key | No |
| GET | `/api/push/stats` | Get statistics | Admin |
| POST | `/api/push/cleanup` | Clean up subscriptions | Admin |

## Frontend Implementation

### Hook: usePushNotifications

Location: `frontend/src/hooks/usePushNotifications.ts`

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications'

function NotificationComponent() {
  const {
    permission,
    subscription,
    supported,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications()

  const handleEnable = async () => {
    const result = await requestPermission()
    if (result === 'granted') {
      console.log('Notifications enabled!')
    }
  }

  return (
    <div>
      {supported ? (
        <>
          <p>Permission: {permission}</p>
          {permission === 'default' && (
            <button onClick={handleEnable} disabled={loading}>
              Enable Notifications
            </button>
          )}
          {permission === 'granted' && subscription && (
            <button onClick={() => unsubscribe()}>
              Disable Notifications
            </button>
          )}
          <button onClick={sendTestNotification}>
            Test Notification
          </button>
        </>
      ) : (
        <p>Notifications not supported in this browser</p>
      )}
    </div>
  )
}
```

### Components

#### PushNotificationPermission

Automatic permission request banner that appears after 3 seconds if the user hasn't made a choice.

```tsx
import { PushNotificationPermission } from '@/components/notifications'

function Layout() {
  return (
    <div>
      <PushNotificationPermission />
      {/* Your app content */}
    </div>
  )
}
```

#### NotificationSettings

Settings panel to enable/disable notifications and configure notification types.

```tsx
import { NotificationSettings } from '@/components/notifications'

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <NotificationSettings />
    </div>
  )
}
```

## Notification Types

### Task Notifications

#### New Task Assignment
```javascript
await pushService.taskAssigned(agentId, {
  id: 'task_123',
  title: 'Build AI Chatbot',
  description: 'Create a conversational AI assistant'
})
```

#### New Task Posted
```javascript
await pushService.taskCreated(taskInfo, ['agent_1', 'agent_2'])
```

#### Task Status Update
```javascript
await pushService.taskStatusChanged(userId, taskId, 'in_progress', 'Build AI Chatbot')
```

### Message Notifications

```javascript
await pushService.messageReceived(userId, {
  conversationId: 'conv_123',
  senderName: 'John Doe',
  content: 'Hi, I have a question about the task'
})
```

### Proposal Notifications

```javascript
await pushService.proposalReceived(clientId, {
  id: 'prop_123',
  taskId: 'task_123',
  agentName: 'Jane Smith'
})
```

### Payment Notifications

```javascript
await pushService.paymentReceived(userId, {
  id: 'payment_123',
  amount: 150.00
})
```

## Testing

### Test Notification (Frontend)

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Button } from '@/components/ui/button'

function TestPage() {
  const { sendTestNotification } = usePushNotifications()

  return (
    <Button onClick={sendTestNotification}>
      Send Test Notification
    </Button>
  )
}
```

### Manual API Test

```bash
# Get VAPID key
curl http://localhost:5000/api/push/vapid-key

# Test notification (requires auth token)
curl -X POST http://localhost:5000/api/push/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Service Worker Testing

1. Open Chrome DevTools (F12)
2. Go to **Application** → **Service Workers**
3. Check service worker status
4. Test push events by clicking "Push" button
5. View notification result

## Best Practices

### 1. Request Permission at the Right Time

Don't request permission on page load. Show the banner after user interaction or when subscribing to a feature.

```tsx
// Good: Request after user clicks "Enable"
<button onClick={requestPermission}>Enable Notifications</button>

// Bad: Request on mount
useEffect(() => {
  requestPermission() // Don't do this
}, [])
```

### 2. Use Descriptive Notification Content

```javascript
// Good: Specific and actionable
{
  title: 'New Task Assigned',
  body: 'You have been assigned: Build AI Chatbot',
  action: { label: 'View Task', url: '/tasks/123' }
}

// Bad: Vague
{
  title: 'Notification',
  body: 'You have a new message'
}
```

### 3. Include Relevant Data

Always include the notification type and relevant IDs for deep linking.

```javascript
{
  title: 'Payment Received',
  body: 'You received $150.00 for completed task',
  data: {
    type: 'payment_received',
    paymentId: 'pay_123',
    taskId: 'task_123'
  },
  url: '/payments/pay_123'
}
```

### 4. Use Appropriate Icons

- Task: `/icons/task-icon.png`
- Chat: `/icons/chat-icon.png`
- Payment: `/icons/payment-icon.png`
- Badge: `/icons/badge-icon.png`

### 5. Handle Failed Subscriptions

The service automatically removes expired subscriptions. Monitor failed sends and clean up periodically.

```javascript
// Schedule cleanup
setInterval(() => {
  pushService.cleanupInactiveSubscriptions()
}, 24 * 60 * 60 * 1000) // Daily
```

## Troubleshooting

### Notifications Not Receiving

1. **Check Permission Status**
   ```javascript
   console.log(Notification.permission) // Should be 'granted'
   ```

2. **Verify Service Worker is Active**
   - Open DevTools → Application → Service Workers
   - Ensure service worker is "activated"

3. **Check Browser Support**
   ```javascript
   console.log('Push supported:', 'PushManager' in window)
   console.log('Notifications supported:', 'Notification' in window)
   ```

4. **Verify VAPID Keys**
   - Check backend `.env` has correct VAPID keys
   - Check frontend `.env` has correct VAPID public key

5. **Check Subscription in Database**
   ```sql
   SELECT * FROM push_subscriptions WHERE user_id = 'user_id';
   ```

### "Invalid VAPID Key" Error

- Regenerate VAPID keys: `npx web-push generate-vapid-keys`
- Update both frontend and backend `.env` files
- Restart both frontend and backend servers

### Service Worker Not Installing

1. Check browser console for errors
2. Verify `public/sw.js` exists
3. Ensure site is served over HTTPS (required for production)
4. Check manifest references correct service worker

### Notifications Blocked

- Check browser notification settings
- User may have blocked notifications
- Show guidance on how to enable:
  ```
  Settings → Site Settings → Notifications → Allow
  ```

## Browser Support

| Browser | Push API | Service Worker | iOS | Android |
|---------|----------|----------------|-----|---------|
| Chrome | ✅ | ✅ | N/A | ✅ |
| Firefox | ✅ | ✅ | N/A | ✅ |
| Safari | ❌ | ✅ | ✅ | ✅* |
| Edge | ✅ | ✅ | N/A | ✅ |

*Safari supports push notifications on macOS but not on iOS (Web Push API not available).

For iOS devices, in-app notifications are used instead of push notifications.

## Advanced Topics

### Custom Notification Actions

```javascript
{
  title: 'New Task Assigned',
  body: 'You have been assigned a new task',
  actions: [
    { action: 'accept', title: 'Accept' },
    { action: 'decline', title: 'Decline' },
    { action: 'later', title: 'View Later' }
  ]
}
```

Handle actions in service worker:

```javascript
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'accept') {
    // Handle accept action
  } else if (event.action === 'decline') {
    // Handle decline action
  }
})
```

### Scheduled Notifications

For time-based notifications, use:

1. Backend cron jobs
2. Browser Notifications API
3. Third-party services (OneSignal, Firebase)

### Silent Notifications

Send silent updates without showing notification:

```javascript
{
  title: '',  // Empty
  body: '',
  silent: true,
  data: { type: 'background_sync' }
}
```

## Resources

- [Web Push API Specification](https://www.w3.org/TR/push-api/)
- [VAPID Keys](https://tools.ietf.org/html/rfc8292)
- [Service Worker Notification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)
- [OneSignal](https://onesignal.com/) - Alternative push service
