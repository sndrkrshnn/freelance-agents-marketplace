const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReviewSchema } = require('../validators/taskValidators');

// All routes require authentication
router.use(authenticate);

// Create reviews
router.post('/agent', validate(createReviewSchema), reviewController.createAgentRating);
router.post('/client', validate(createReviewSchema), reviewController.createClientRating);

// Get ratings
router.get('/agent/:agentId', reviewController.getAgentRatings);
router.get('/client/:clientId', reviewController.getClientRatings);
router.get('/task/:taskId', reviewController.getTaskRatings);

// Get stats
router.get('/agent/:agentId/stats', reviewController.getAgentStats);
router.get('/client/:clientId/stats', reviewController.getClientStats);

module.exports = router;
