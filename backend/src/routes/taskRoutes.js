const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');
const { taskCreationLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, listTasksSchema } = require('../validators/taskValidators');

// All routes require authentication
router.use(authenticate);

// Task routes
router.post('/', taskCreationLimiter, validate(createTaskSchema), taskController.createTask);
router.get('/', validate(listTasksSchema), taskController.listTasks);
router.get('/search', taskController.searchTasks);
router.get('/my-tasks', taskController.getMyTasks);
router.get('/:id', taskController.getTask);
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.get('/:id/matches', taskController.getTaskMatches);
router.get('/:id/proposals', taskController.getTaskProposals);

module.exports = router;
