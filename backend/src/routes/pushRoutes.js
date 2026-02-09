import express from 'express';
import pushService from '../services/pushService.js';

const router = express.Router();

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    await pushService.subscribe(userId, subscription);

    res.json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    console.error('[PushRoutes] Subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to push notifications'
    });
  }
});

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    await pushService.unsubscribe(userId, subscription);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('[PushRoutes] Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from push notifications'
    });
  }
});

/**
 * POST /api/push/test
 * Send a test notification
 */
router.post('/test', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    await pushService.sendNotification(userId, {
      title: '✅ Test Notification',
      body: 'This is a test notification from AgentMarket!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      url: '/settings/notifications',
      data: { type: 'test' }
    });

    res.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('[PushRoutes] Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

/**
 * POST /api/push/test-multiple
 * Send test notification to multiple users (for admin)
 */
router.post('/test-multiple', async (req, res) => {
  try {
    const { userIds, message } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs'
      });
    }

    // Check if user is admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    await pushService.sendNotificationToUserIds(userIds, {
      title: message?.title || '📢 Announcement',
      body: message?.body || 'This is an announcement from AgentMarket',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      url: '/',
      data: { type: 'announcement' }
    });

    res.json({
      success: true,
      message: `Test notification sent to ${userIds.length} users`
    });
  } catch (error) {
    console.error('[PushRoutes] Test multiple error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notifications'
    });
  }
});

/**
 * GET /api/push/vapid-key
 * Get VAPID public key (no auth required)
 */
router.get('/vapid-key', async (req, res) => {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
      return res.status(500).json({
        success: false,
        message: 'VAPID keys not configured'
      });
    }

    res.json({
      success: true,
      data: {
        publicKey: vapidPublicKey
      }
    });
  } catch (error) {
    console.error('[PushRoutes] Get VAPID key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VAPID key'
    });
  }
});

/**
 * GET /api/push/stats
 * Get push notification statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = await pushService.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[PushRoutes] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

/**
 * POST /api/push/cleanup
 * Clean up inactive subscriptions (admin only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    await pushService.cleanupInactiveSubscriptions();

    res.json({
      success: true,
      message: 'Inactive subscriptions cleaned up'
    });
  } catch (error) {
    console.error('[PushRoutes] Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up subscriptions'
    });
  }
});

export default router;
