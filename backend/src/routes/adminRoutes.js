const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Users management
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUser);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Tasks management
router.get('/tasks', adminController.getTasks);
router.put('/tasks/:taskId/status', adminController.updateTaskStatus);

// Payments and earnings
router.get('/earnings', adminController.getEarnings);

// Activity logs
router.get('/activity-logs', adminController.getActivityLogs);

module.exports = router;
