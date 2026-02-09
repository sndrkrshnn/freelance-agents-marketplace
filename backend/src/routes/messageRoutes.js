const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Send message
router.post('/', messageLimiter, messageController.sendMessage);

// Get messages
router.get('/tasks/:taskId', messageController.getTaskMessages);
router.get('/conversation/:otherUserId', messageController.getConversation);
router.get('/conversations', messageController.getConversations);
router.get('/:messageId', messageController.getMessage);
router.get('/unread-count/me', messageController.getUnreadCount);

// Mark as read
router.put('/read', messageController.markAsRead);

// Delete message
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
