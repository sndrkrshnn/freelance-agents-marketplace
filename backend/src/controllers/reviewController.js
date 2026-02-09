const Review = require('../models/Review');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Create a review for an agent (from client)
 */
exports.createAgentRating = async (req, res) => {
  try {
    const { targetUserId, taskId, rating, review, communicationRating, qualityRating, timelinessRating } = req.body;
    const clientId = req.user.id;

    // Verify task exists and belongs to client
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    if (task.client_id !== clientId) {
      throw new AppError(403, 'You can only review agents for your own tasks');
    }

    if (task.status !== 'completed') {
      throw new AppError(400, 'Cannot review task until it is completed');
    }

    // Create review
    const reviewData = await Review.createAgentRating({
      agentId: targetUserId,
      clientId,
      taskId,
      rating,
      review,
      communicationRating,
      qualityRating,
      timelinessRating,
    });

    // Send notification to agent
    try {
      const reviewerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      await Notification.sendReviewNotification(targetUserId, reviewerName, rating);
    } catch (notificationError) {
      logger.error('Failed to send review notification:', notificationError);
    }

    logger.info(`Agent rating created for ${targetUserId} from client ${clientId}`);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: reviewData,
    });
  } catch (error) {
    logger.error('Create agent rating error:', error);
    throw error;
  }
};

/**
 * Create a review for a client (from agent)
 */
exports.createClientRating = async (req, res) => {
  try {
    const { targetUserId, taskId, rating, review, paymentPromptness, clarityRating } = req.body;
    const agentId = req.user.id;

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    // Verify agent was assigned to this task
    const assignmentResult = await Task.db?.query
      ? await Task.db.query(
          'SELECT * FROM task_assignments WHERE task_id = $1 AND agent_id = $2',
          [taskId, agentId]
        )
      : { rows: [] };

    // If the query facility isn't available, check via proposals
    if (assignmentResult.rows.length === 0) {
      throw new AppError(403, 'You can only review clients for tasks you were assigned to');
    }

    if (task.status !== 'completed') {
      throw new AppError(400, 'Cannot review task until it is completed');
    }

    // Create review
    const reviewData = await Review.createClientRating({
      clientId: targetUserId,
      agentId,
      taskId,
      rating,
      review,
      paymentPromptness,
      clarityRating,
    });

    logger.info(`Client rating created for ${targetUserId} from agent ${agentId}`);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: reviewData,
    });
  } catch (error) {
    logger.error('Create client rating error:', error);
    throw error;
  }
};

/**
 * Get agent ratings
 */
exports.getAgentRatings = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await Review.findAgentRatings(agentId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get agent ratings error:', error);
    throw error;
  }
};

/**
 * Get client ratings
 */
exports.getClientRatings = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await Review.findClientRatings(clientId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get client ratings error:', error);
    throw error;
  }
};

/**
 * Get ratings for a task
 */
exports.getTaskRatings = async (req, res) => {
  try {
    const { taskId } = req.params;

    const ratings = await Review.findByTaskTask(taskId);

    res.json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    logger.error('Get task ratings error:', error);
    throw error;
  }
};

/**
 * Get agent stats
 */
exports.getAgentStats = async (req, res) => {
  try {
    const { agentId } = req.params;

    const stats = await Review.getAgentStats(agentId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get agent stats error:', error);
    throw error;
  }
};

/**
 * Get client stats
 */
exports.getClientStats = async (req, res) => {
  try {
    const { clientId } = req.params;

    const stats = await Review.getClientStats(clientId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get client stats error:', error);
    throw error;
  }
};
