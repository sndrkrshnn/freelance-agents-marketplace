const Payment = require('../models/Payment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Create payment intent for Stripe
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { taskId, amount } = req.body;
    const clientId = req.user.id;

    // Verify task exists and belongs to client
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    if (task.client_id !== clientId) {
      throw new AppError(403, 'You do not have permission to pay for this task');
    }

    // Create Stripe payment intent
    const paymentIntent = await Payment.createStripePaymentIntent(amount, taskId);

    res.json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        intentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    logger.error('Create payment intent error:', error);
    throw error;
  }
};

/**
 * Confirm payment and create escrow
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, taskId, amount } = req.body;
    const clientId = req.user.id;

    // Verify task and get agent_id from task_assignments (or from accepted proposal)
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    if (task.client_id !== clientId) {
      throw new AppError(403, 'You do not have permission to pay for this task');
    }

    // Get the assigned agent
    const assignmentResult = await Task.db.query(
      'SELECT agent_id FROM task_assignments WHERE task_id = $1',
      [taskId]
    );

    if (assignmentResult.rows.length === 0) {
      throw new AppError(400, 'No agent assigned to this task');
    }

    const agentId = assignmentResult.rows[0].agent_id;

    // Create escrow payment
    const payment = await Payment.createEscrow({
      taskId,
      clientId,
      agentId,
      amount,
      stripePaymentIntentId: paymentIntentId,
    });

    // Send notification to agent
    try {
      await Notification.sendPaymentEscrowNotification(
        agentId,
        task.title,
        amount
      );
    } catch (notificationError) {
      logger.error('Failed to send payment notification:', notificationError);
    }

    logger.info(`Payment confirmed and escrow created: ${payment.id}`);

    res.json({
      success: true,
      message: 'Payment confirmed and escrow created',
      data: payment,
    });
  } catch (error) {
    logger.error('Confirm payment error:', error);
    throw error;
  }
};

/**
 * Release payment to agent
 */
exports.releasePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const clientId = req.user.id;

    // Get payment details
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    // Verify ownership
    if (payment.client_id !== clientId && req.user.userType !== 'admin') {
      throw new AppError(403, 'You do not have permission to release this payment');
    }

    // Release payment
    const releasedPayment = await Payment.releaseToAgent(paymentId);

    // Send notification to agent
    try {
      const task = await Task.findById(payment.task_id);
      await Notification.sendPaymentReleasedNotification(
        payment.agent_id,
        task ? task.title : 'a task',
        payment.amount - payment.fee_amount
      );
    } catch (notificationError) {
      logger.error('Failed to send release notification:', notificationError);
    }

    logger.info(`Payment released: ${paymentId} to agent ${payment.agent_id}`);

    res.json({
      success: true,
      message: 'Payment released successfully',
      data: releasedPayment,
    });
  } catch (error) {
    logger.error('Release payment error:', error);
    throw error;
  }
};

/**
 * Refund payment
 */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const clientId = req.user.id;

    // Get payment details
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    // Verify ownership
    if (payment.client_id !== clientId && req.user.userType !== 'admin') {
      throw new AppError(403, 'You do not have permission to refund this payment');
    }

    // Refund payment
    const refundedPayment = await Payment.refund(paymentId, reason);

    logger.info(`Payment refunded: ${paymentId}`);

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: refundedPayment,
    });
  } catch (error) {
    logger.error('Refund payment error:', error);
    throw error;
  }
};

/**
 * Get payment by ID
 */
exports.getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    // Verify access (client or agent involved)
    if (
      payment.client_id !== req.user.id &&
      payment.agent_id !== req.user.id &&
      req.user.userType !== 'admin'
    ) {
      throw new AppError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Get payment error:', error);
    throw error;
  }
};

/**
 * Get user's payments
 */
exports.getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = req.query;

    const result = await Payment.findByUser(userId, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get my payments error:', error);
    throw error;
  }
};

/**
 * Get task payments
 */
exports.getTaskPayments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const payments = await Payment.findByTask(taskId);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error('Get task payments error:', error);
    throw error;
  }
};

/**
 * Get user balance
 */
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const balance = await Payment.getUserBalance(userId);

    res.json({
      success: true,
      data: { balance },
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    throw error;
  }
};

/**
 * Get user transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = req.query;

    const result = await Payment.getTransactions(userId, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    throw error;
  }
};
