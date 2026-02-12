const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const Notification = require('./Notification');

class Message {
  static async create(messageData) {
    const {
      taskId,
      senderId,
      recipientId,
      content,
      attachmentUrl,
    } = messageData;

    const query = `
      INSERT INTO messages (task_id, sender_id, recipient_id, content, attachment_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [taskId, senderId, recipientId, content, attachmentUrl];

    const result = await pool.query(query, values);
    const message = result.rows[0];

    // Send notification to recipient
    try {
      const taskResult = await pool.query('SELECT title FROM tasks WHERE id = $1', [taskId]);
      const taskTitle = taskResult.rows[0]?.title || 'a task';

      const senderResult = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [senderId]
      );
      const senderName = `${senderResult.rows[0]?.first_name || ''} ${senderResult.rows[0]?.last_name || ''}`.trim();

      await Notification.sendNewMessageNotification(recipientId, senderName, taskTitle);
    } catch (error) {
      // Don't fail message creation if notification fails
      console.error('Failed to send notification:', error);
    }

    return message;
  }

  static async findByTask(taskId, userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    // Verify user is involved in the task
    const taskCheck = await pool.query(
      `SELECT client_id, (
         SELECT agent_id FROM task_assignments WHERE task_id = $1 LIMIT 1
       ) as agent_id
       FROM tasks WHERE id = $1`,
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError(404, 'Task not found');
    }

    const task = taskCheck.rows[0];
    if (task.client_id !== userId && task.agent_id !== userId) {
      throw new AppError(403, 'Access denied to task messages');
    }

    const query = `
      SELECT 
        m.*,
        s.first_name as sender_first_name, s.last_name as sender_last_name,
        s.avatar_url as sender_avatar,
        r.first_name as recipient_first_name, r.last_name as recipient_last_name
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.recipient_id = r.id
      WHERE m.task_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [taskId, limit, offset]);

    // Mark messages as read for the recipient
    await pool.query(
      'UPDATE messages SET is_read = true WHERE task_id = $1 AND recipient_id = $2 AND is_read = false',
      [taskId, userId]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM messages WHERE task_id = $1',
      [taskId]
    );
    const total = parseInt(countResult.rows[0].count);

    return {
      messages: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async findByConversation(userId, otherUserId, taskId = null, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        m.*,
        s.first_name as sender_first_name, s.last_name as sender_last_name,
        s.avatar_url as sender_avatar,
        r.first_name as recipient_first_name, r.last_name as recipient_last_name,
        t.title as task_title
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.recipient_id = r.id
      LEFT JOIN tasks t ON m.task_id = t.id
      WHERE (
        (m.sender_id = $1 AND m.recipient_id = $2) OR
        (m.sender_id = $2 AND m.recipient_id = $1)
      )
    `;

    const values = [userId, otherUserId];

    if (taskId) {
      query += ` AND m.task_id = $${values.length + 1}`;
      values.push(taskId);
    }

    query += ' ORDER BY m.created_at DESC';

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    return {
      messages: result.rows,
      pagination: {
        page,
        limit,
      },
    };
  }

  static async getConversations(userId) {
    const query = `
      SELECT DISTINCT
        COALESCE(t.id, m.id::TEXT) as conversation_id,
        CASE 
          WHEN m.sender_id = $1 THEN r.id
          ELSE s.id
        END as other_user_id,
        CASE 
          WHEN m.sender_id = $1 THEN r.first_name
          ELSE s.first_name
        END as other_user_first_name,
        CASE 
          WHEN m.sender_id = $1 THEN r.last_name
          ELSE s.last_name
        END as other_user_last_name,
        CASE 
          WHEN m.sender_id = $1 THEN r.avatar_url
          ELSE s.avatar_url
        END as other_user_avatar,
        t.id as task_id,
        t.title as task_title,
        m.content as last_message,
        m.created_at as last_message_time,
        COUNT(CASE WHEN m.recipient_id = $1 AND m.is_read = false THEN 1 END) as unread_count
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.recipient_id = r.id
      LEFT JOIN tasks t ON m.task_id = t.id
      WHERE m.sender_id = $1 OR m.recipient_id = $1
      GROUP BY s.id, r.id, t.id, m.id, m.content, m.created_at
      ORDER BY m.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        m.*,
        s.first_name as sender_first_name, s.last_name as sender_last_name,
        s.avatar_url as sender_avatar,
        r.first_name as recipient_first_name, r.last_name as recipient_last_name,
        r.avatar_url as recipient_avatar,
        t.title as task_title
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.recipient_id = r.id
      LEFT JOIN tasks t ON m.task_id = t.id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async markAsRead(messageIds, userId) {
    const query = `
      UPDATE messages
      SET is_read = true
      WHERE id = ANY($1) AND recipient_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [messageIds, userId]);
    return result.rows;
  }

  static async delete(id, userId) {
    const query = `
      DELETE FROM messages
      WHERE id = $1 AND sender_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Message not found or not owned by user');
    }

    return { success: true };
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM messages
      WHERE recipient_id = $1 AND is_read = false
    `;

    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Message;
