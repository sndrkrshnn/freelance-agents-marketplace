const Message = require('../models/Message');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Send a message
 */
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { taskId, recipientId, content, attachmentUrl } = req.body;

    const messageData = {
      taskId,
      senderId,
      recipientId,
      content,
      attachmentUrl,
    };

    const message = await Message.create(messageData);

    logger.info(`Message sent from ${senderId} to ${recipientId}`);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    logger.error('Send message error:', error);
    throw error;
  }
};

/**
 * Get messages for a task
 */
exports.getTaskMessages = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    const result = await Message.findByTask(taskId, userId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get task messages error:', error);
    throw error;
  }
};

/**
 * Get conversation with another user
 */
exports.getConversation = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.id;
    const { taskId, page = 1, limit = 50 } = req.query;

    const result = await Message.findByConversation(userId, otherUserId, taskId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get conversation error:', error);
    throw error;
  }
};

/**
 * Get all user conversations
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Message.getConversations(userId);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    throw error;
  }
};

/**
 * Get message by ID
 */
exports.getMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      throw new AppError(404, 'Message not found');
    }

    // Verify access (sender or recipient)
    if (
      message.sender_id !== req.user.id &&
      message.recipient_id !== req.user.id &&
      req.user.userType !== 'admin'
    ) {
      throw new AppError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error('Get message error:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds)) {
      throw new AppError(400, 'messageIds must be an array');
    }

    const messages = await Message.markAsRead(messageIds, userId);

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: messages,
    });
  } catch (error) {
    logger.error('Mark messages as read error:', error);
    throw error;
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    await Message.delete(messageId, userId);

    logger.info(`Message deleted: ${messageId} by ${userId}`);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logger.error('Delete message error:', error);
    throw error;
  }
};

/**
 * Get unread message count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Message.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    throw error;
  }
};
