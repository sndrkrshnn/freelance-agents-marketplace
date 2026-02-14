import webpush from 'web-push';
import db from '../db/connection.js';

// Configure VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'admin@freelance-agents-marketplace.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PushService {
  /**
   * Save push subscription to database
   */
  async subscribe(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      // Check if subscription already exists
      const existing = await db.query(
        'SELECT id FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
        [userId, subscription.endpoint]
      );

      if (existing.rows.length === 0) {
        // Insert new subscription
        await db.query(
          `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [
            userId,
            subscription.endpoint,
            subscription.keys.p256dh,
            subscription.keys.auth
          ]
        );

        console.log(`[PushService] Subscription added for user ${userId}`);
      } else {
        // Update existing subscription
        await db.query(
          `UPDATE push_subscriptions
           SET p256dh_key = $1, auth_key = $2, updated_at = NOW()
           WHERE id = $3`,
          [
            subscription.keys.p256dh,
            subscription.keys.auth,
            existing.rows[0].id
          ]
        );

        console.log(`[PushService] Subscription updated for user ${userId}`);
      }
    } catch (error) {
      console.error('[PushService] Error saving subscription:', error);
      throw error;
    }
  }

  /**
   * Remove push subscription from database
   */
  async unsubscribe(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      await db.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
        [userId, subscription.endpoint]
      );

      console.log(`[PushService] Subscription removed for user ${userId}`);
    } catch (error) {
      console.error('[PushService] Error removing subscription:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    try {
      const result = await db.query(
        'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      return result.rows.map(row => ({
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh_key,
          auth: row.auth_key
        }
      }));
    } catch (error) {
      console.error('[PushService] Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendNotification(userId: string, payload: NotificationPayload): Promise<void> {
    const subscriptions = await this.getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log(`[PushService] No subscriptions found for user ${userId}`);
      return;
    }

    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        webpush.sendNotification(subscription, JSON.stringify(payload))
          .catch(error => {
            // Handle expired or invalid subscriptions
            if (error.statusCode === 410 || error.statusCode === 404) {
              console.log(`[PushService] Removing expired subscription: ${subscription.endpoint}`);
              this.removeSubscriptionByEndpoint(subscription.endpoint);
            }
            throw error;
          })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[PushService] Sent notification to user ${userId}: ${successful} successful, ${failed} failed`);
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUserIds(userIds: string[], payload: NotificationPayload): Promise<void> {
    const promises = userIds.map(userId => this.sendNotification(userId, payload));
    await Promise.allSettled(promises);
  }

  /**
   * Send notification when a task is assigned to an agent
   */
  async taskAssigned(agentId: string, taskInfo: any): Promise<void> {
    await this.sendNotification(agentId, {
      title: '🎯 New Task Assigned!',
      body: taskInfo.description || `You have been assigned a new task: ${taskInfo.title}`,
      icon: '/icons/task-icon.png',
      badge: '/icons/badge-96x96.png',
      url: `/tasks/${taskInfo.id}`,
      data: { taskId: taskInfo.id, type: 'task_assigned' },
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  /**
   * Send notification when a task is created (for matching agents)
   */
  async taskCreated(taskInfo: any, matchingAgentIds: string[]): Promise<void> {
    await this.sendNotificationToUserIds(matchingAgentIds, {
      title: '📋 New Task Available!',
      body: `A new task matching your skills has been posted: ${taskInfo.title}`,
      icon: '/icons/task-icon.png',
      badge: '/icons/badge-96x96.png',
      url: `/tasks/${taskInfo.id}`,
      data: { taskId: taskInfo.id, type: 'task_created' },
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  /**
   * Send notification when a message is received
   */
  async messageReceived(userId: string, message: any): Promise<void> {
    await this.sendNotification(userId, {
      title: `💬 New message from ${message.senderName}`,
      body: message.content?.substring(0, 100) + (message.content?.length > 100 ? '...' : ''),
      icon: '/icons/chat-icon.png',
      badge: '/icons/badge-96x96.png',
      url: `/chat/${message.conversationId}`,
      data: { conversationId: message.conversationId, type: 'new_message' },
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  /**
   * Send notification when a proposal is received
   */
  async proposalReceived(clientId: string, proposal: any): Promise<void> {
    await this.sendNotification(clientId, {
      title: '📝 New Proposal Received',
      body: `${proposal.agentName} has submitted a proposal for your task`,
      icon: '/icons/proposal-icon.png',
      badge: '/icons/badge-96x96.png',
      url: `/tasks/${proposal.taskId}/proposals`,
      data: { proposalId: proposal.id, taskId: proposal.taskId, type: 'proposal_received' },
      actions: [
        { action: 'view', title: 'View Proposal' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  /**
   * Send notification when payment is received
   */
  async paymentReceived(userId: string, payment: any): Promise<void> {
    await this.sendNotification(userId, {
      title: '💰 Payment Received',
      body: `You received a payment of $${payment.amount.toFixed(2)}`,
      icon: '/icons/payment-icon.png',
      badge: '/icons/badge-96x96.png',
      url: '/wallet',
      data: { paymentId: payment.id, type: 'payment_received' },
      actions: [
        { action: 'view', title: 'View Wallet' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  /**
   * Send notification when task status changes
   */
  async taskStatusChanged(userId: string, taskId: string, status: string, taskTitle: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      in_progress: 'Task is now in progress',
      completed: 'Task has been completed',
      disputed: 'Task has been disputed',
      cancelled: 'Task has been cancelled'
    };

    await this.sendNotification(userId, {
      title: '📊 Task Status Update',
      body: `${statusMessages[status] || `Task status changed to ${status}`}: ${taskTitle}`,
      icon: '/icons/task-icon.png',
      badge: '/icons/badge-96x96.png',
      url: `/tasks/${taskId}`,
      data: { taskId, status, type: 'task_status_changed' }
    });
  }

  /**
   * Send badge update notification
   */
  async badgeEarned(userId: string, badge: { name: string; icon: string }): Promise<void> {
    await this.sendNotification(userId, {
      title: '🏆 New Badge Earned!',
      body: `Congratulations! You've earned the "${badge.name}" badge`,
      icon: badge.icon,
      badge: '/icons/badge-96x96.png',
      url: '/profile',
      data: { badge, type: 'badge_earned' }
    });
  }

  /**
   * Remove subscription by endpoint (for cleanup)
   */
  private async removeSubscriptionByEndpoint(endpoint: string): Promise<void> {
    try {
      await db.query(
        'UPDATE push_subscriptions SET is_active = false WHERE endpoint = $1',
        [endpoint]
      );
    } catch (error) {
      console.error('[PushService] Error removing subscription:', error);
    }
  }

  /**
   * Clean up inactive subscriptions
   */
  async cleanupInactiveSubscriptions(): Promise<void> {
    try {
      // Mark subscriptions as inactive if they haven't been updated in 30 days
      await db.query(
        `UPDATE push_subscriptions
         SET is_active = false
         WHERE updated_at < NOW() - INTERVAL '30 days'`
      );

      console.log('[PushService] Cleaned up inactive subscriptions');
    } catch (error) {
      console.error('[PushService] Error cleaning up subscriptions:', error);
    }
  }

  /**
   * Get push notification statistics
   */
  async getStatistics(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    notificationsSentToday: number;
  }> {
    try {
      const [totalResult, activeResult, todayResult] = await Promise.all([
        db.query('SELECT COUNT(*) FROM push_subscriptions'),
        db.query("SELECT COUNT(*) FROM push_subscriptions WHERE is_active = true"),
        db.query(
          "SELECT COUNT(*) FROM notification_logs WHERE created_at >= CURRENT_DATE"
        )
      ]);

      return {
        totalSubscriptions: parseInt(totalResult.rows[0].count),
        activeSubscriptions: parseInt(activeResult.rows[0].count),
        notificationsSentToday: parseInt(todayResult.rows[0]?.count || 0)
      };
    } catch (error) {
      console.error('[PushService] Error getting statistics:', error);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        notificationsSentToday: 0
      };
    }
  }
}

export default new PushService();
