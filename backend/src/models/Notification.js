const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class Notification {
  static async create(userId, type, title, message, relatedId = null) {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [userId, type, title, message, relatedId];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId, filters = {}) {
    const { unreadOnly = false, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;

    const values = [userId];

    if (unreadOnly) {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC';

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get unread count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    const unreadCount = parseInt(countResult.rows[0].count);

    return {
      notifications: result.rows,
      unreadCount,
      pagination: {
        page,
        limit,
      },
    };
  }

  static async findById(id) {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Notification not found');
    }

    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
      RETURNING *
    `;

    const result = await pool.query(query, [userId]);
    return { updated: result.rows.length };
  }

  static async delete(id, userId) {
    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Notification not found');
    }

    return { success: true };
  }

  // Helper methods to create specific notification types
  static async sendNewProposalNotification(clientId, taskTitle, agentName, taskId) {
    return this.create(
      clientId,
      'new_proposal',
      'New Proposal Received',
      `${agentName} has submitted a proposal for "${taskTitle}"`,
      taskId
    );
  }

  static async sendProposalAcceptedNotification(agentId, taskTitle, clientId) {
    return this.create(
      agentId,
      'proposal_accepted',
      'Proposal Accepted!',
      `Your proposal for "${taskTitle}" has been accepted. Time to get started!`,
      clientId
    );
  }

  static async sendPaymentEscrowNotification(agentId, taskTitle, amount) {
    return this.create(
      agentId,
      'payment_escrow',
      'Payment in Escrow',
      `Client has deposited $${amount} into escrow for "${taskTitle}"`,
      null
    );
  }

  static async sendPaymentReleasedNotification(agentId, taskTitle, amount) {
    return this.create(
      agentId,
      'payment_released',
      'Payment Released!',
      `$${amount} has been released to you for completing "${taskTitle}"`,
      null
    );
  }

  static async sendNewMessageNotification(userId, senderName, taskTitle) {
    return this.create(
      userId,
      'new_message',
      'New Message',
      `${senderName} sent you a message regarding "${taskTitle}"`,
      null
    );
  }

  static async sendReviewNotification(userId, reviewerName, rating) {
    return this.create(
      userId,
      'new_review',
      'New Review Received',
      `${reviewerName} has given you a ${rating}/5 rating`,
      null
    );
  }
}

module.exports = Notification;
