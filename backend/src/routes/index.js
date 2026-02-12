const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const proposalRoutes = require('./proposalRoutes');
const paymentRoutes = require('./paymentRoutes');
const reviewRoutes = require('./reviewRoutes');
const agentRoutes = require('./agentRoutes');
const notificationRoutes = require('./notificationRoutes');
const messageRoutes = require('./messageRoutes');
const adminRoutes = require('./adminRoutes');
const agentExecutionRoutes = require('./agentExecutionRoutes');

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/proposals', proposalRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/agents', agentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/admin', adminRoutes);
router.use('/agent-execution', agentExecutionRoutes);

module.exports = router;
