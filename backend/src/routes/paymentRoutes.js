const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Create payment intent (clients only)
router.post('/create-intent', authorize('client'), paymentController.createPaymentIntent);

// Confirm payment into escrow
router.post('/confirm', paymentLimiter, paymentController.confirmPayment);

// Release payment (clients only)
router.post('/:paymentId/release', authorize('client'), paymentController.releasePayment);

// Refund payment (clients or admin)
router.post('/:paymentId/refund', authorize('client', 'admin'), paymentController.refundPayment);

// Get payment details
router.get('/:paymentId', paymentController.getPayment);

// Get my payments
router.get('/', paymentController.getMyPayments);

// Get task payments
router.get('/task/:taskId', paymentController.getTaskPayments);

// Get balance
router.get('/balance/me', paymentController.getBalance);

// Get transactions
router.get('/transactions/my', paymentController.getTransactions);

module.exports = router;
