const AgentProfile = require('../models/AgentProfile');
const Review = require('../models/Review');
const MatchingEngine = require('../services/matchingEngine');
const Task = require('../models/Task');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Create or update agent profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    // Check if profile exists
    const existingProfile = await AgentProfile.findByUserId(userId);

    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await AgentProfile.update(userId, profileData);
    } else {
      // Create new profile
      profile = await AgentProfile.create(userId, profileData);
    }

    logger.info(`Agent profile updated: ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    logger.error('Update agent profile error:', error);
    throw error;
  }
};

/**
 * Get agent profile by user ID
 */
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await AgentProfile.findByUserId(userId);

    if (!profile) {
      throw new AppError(404, 'Agent profile not found');
    }

    // Get agent stats
    const stats = await Review.getAgentStats(userId);

    res.json({
      success: true,
      data: {
        ...profile,
        stats,
      },
    });
  } catch (error) {
    logger.error('Get agent profile error:', error);
    throw error;
  }
};

/**
 * Get my profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await AgentProfile.findByUserId(userId);

    if (!profile) {
      throw new AppError(404, 'Agent profile not found');
    }

    // Get agent stats
    const stats = await Review.getAgentStats(userId);

    res.json({
      success: true,
      data: {
        ...profile,
        stats,
      },
    });
  } catch (error) {
    logger.error('Get my agent profile error:', error);
    throw error;
  }
};

/**
 * List agents with filters
 */
exports.listAgents = async (req, res) => {
  try {
    const filters = req.query;
    const result = await AgentProfile.list(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('List agents error:', error);
    throw error;
  }
};

/**
 * Get top agents
 */
exports.getTopAgents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const agents = await AgentProfile.getTopAgents(parseInt(limit));

    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    logger.error('Get top agents error:', error);
    throw error;
  }
};

/**
 * Get recommended tasks for agent
 */
exports.getRecommendedTasks = async (req, res) => {
  try {
    const agentId = req.user.id;

    // Get agent profile
    const profile = await AgentProfile.findByUserId(agentId);
    if (!profile) {
      throw new AppError(404, 'Agent profile not found');
    }

    // Get all open tasks
    const tasksResult = await Task.list({ status: 'open', limit: 100 });
    const tasks = tasksResult.tasks || tasksResult;

    // Find matching tasks
    const matchedTasks = await MatchingEngine.findTasksForAgent(profile, tasks, 20);

    res.json({
      success: true,
      data: matchedTasks,
    });
  } catch (error) {
    logger.error('Get recommended tasks error:', error);
    throw error;
  }
};

/**
 * Search agents
 */
exports.searchAgents = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      throw new AppError(400, 'Search query is required');
    }

    const { agents } = await AgentProfile.list({ limit: 50 });

    // Filter agents based on search query
    const searchTerms = q.toLowerCase().split(' ');

    const matchedAgents = agents.filter((agent) => {
      const searchableText = `${agent.first_name} ${agent.last_name} ${agent.title} ${(agent.skills || []).join(' ')}`.toLowerCase();

      return searchTerms.some((term) => searchableText.includes(term));
    });

    res.json({
      success: true,
      data: matchedAgents.slice(0, 20),
    });
  } catch (error) {
    logger.error('Search agents error:', error);
    throw error;
  }
};
