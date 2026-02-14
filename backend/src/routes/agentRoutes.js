const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { agentProfileSchema, listAgentsSchema } = require('../validators/userValidators');

// Public routes
router.get('/', validate(listAgentsSchema), agentController.listAgents);
router.get('/top', agentController.getTopAgents);
router.get('/search', agentController.searchAgents);
router.get('/:userId/profile', agentController.getProfile);

// All routes require authentication
router.use(authenticate);

// My profile (agents only)
router.get('/profile/me', authorize('agent'), agentController.getMyProfile);
router.put('/profile/me', authorize('agent'), validate(agentProfileSchema), agentController.updateProfile);

// Recommended tasks (agents only)
router.get('/recommended-tasks/me', authorize('agent'), agentController.getRecommendedTasks);

module.exports = router;
