const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Get user notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const result = await Notification.findByUserId(userId, {
      unreadOnly: unreadOnly === 'true',
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    throw error;
  }
};

/**
 * Get notification by ID
 */
exports.getNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    if (notification.user_id !== userId && req.user.userType !== 'admin') {
      throw new AppError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Get notification error:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    throw error;
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    await Notification.delete(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    throw error;
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const { notifications, unreadCount } = await Notification.findByUserId(userId, {
      unreadOnly: true,
      limit: 1,
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    throw error;
  }
};
