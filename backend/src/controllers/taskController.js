const Task = require('../models/Task');
const Proposal = require('../models/Proposal');
const MatchingEngine = require('../services/matchingEngine');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Create a new task
 */
exports.createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskData = {
      ...req.body,
      clientId: userId,
    };

    const task = await Task.create(taskData);

    logger.info(`Task created: ${task.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    logger.error('Create task error:', error);
    throw error;
  }
};

/**
 * Get task by ID
 */
exports.getTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    logger.error('Get task error:', error);
    throw error;
  }
};

/**
 * List tasks with filters
 */
exports.listTasks = async (req, res) => {
  try {
    const filters = req.query;
    const result = await Task.list(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('List tasks error:', error);
    throw error;
  }
};

/**
 * Search tasks
 */
exports.searchTasks = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      throw new AppError(400, 'Search query is required');
    }

    const result = await Task.search(q, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Search tasks error:', error);
    throw error;
  }
};

/**
 * Update task
 */
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const task = await Task.findById(id);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    if (task.client_id !== userId && req.user.userType !== 'admin') {
      throw new AppError(403, 'You do not have permission to update this task');
    }

    const updatedTask = await Task.update(id, req.body);

    logger.info(`Task updated: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (error) {
    logger.error('Update task error:', error);
    throw error;
  }
};

/**
 * Delete task
 */
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const task = await Task.findById(id);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    if (task.client_id !== userId && req.user.userType !== 'admin') {
      throw new AppError(403, 'You do not have permission to delete this task');
    }

    await Task.delete(id);

    logger.info(`Task deleted: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    logger.error('Delete task error:', error);
    throw error;
  }
};

/**
 * Get my tasks (client's tasks)
 */
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = req.query;

    const result = await Task.getClientTasks(userId, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get my tasks error:', error);
    throw error;
  }
};

/**
 * Get matched agents for a task
 */
exports.getTaskMatches = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    const matches = await MatchingEngine.findMatchesForTask(task, 10);
    const statistics = await MatchingEngine.getMatchStatistics(task);

    res.json({
      success: true,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        matches,
        statistics,
      },
    });
  } catch (error) {
    logger.error('Get task matches error:', error);
    throw error;
  }
};

/**
 * Get task proposals
 */
exports.getTaskProposals = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    // Only task owner or the agent who submitted can see proposals
    // if (task.client_id !== req.user.id && req.user.userType !== 'admin') {
    //   throw new AppError(403, 'Access denied');
    // }

    const proposals = await Proposal.findByTask(id);

    res.json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    logger.error('Get task proposals error:', error);
    throw error;
  }
};
