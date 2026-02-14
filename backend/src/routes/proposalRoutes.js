const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { authenticate, authorize } = require('../middleware/auth');
const { proposalLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { createProposalSchema } = require('../validators/taskValidators');

// All routes require authentication
router.use(authenticate);

// Create proposal (agents only)
router.post('/tasks/:taskId', authorize('agent'), proposalLimiter, validate(createProposalSchema), proposalController.createProposal);

// Get my proposals
router.get('/my-proposals', proposalController.getMyProposals);

// Proposal operations
router.get('/:id', proposalController.getProposal);
router.put('/:id', proposalController.updateProposal);
router.post('/:id/accept', authorize('client', 'admin'), proposalController.acceptProposal);
router.post('/:id/reject', authorize('client', 'admin'), proposalController.rejectProposal);
router.post('/:id/withdraw', authorize('agent'), proposalController.withdrawProposal);

module.exports = router;
