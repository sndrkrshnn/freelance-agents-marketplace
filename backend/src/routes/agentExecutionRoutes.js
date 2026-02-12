const express = require('express');
const router = express.Router();
const agentExecutionService = require('../services/agentExecutionService');
const { authenticate, authorize } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const logger = require('../config/logger');

// All routes require authentication
router.use(authenticate);

/**
 * Start agent execution for a task
 * POST /api/agent-execution/start
 */
router.post('/start', generalLimiter, async (req, res) => {
  try {
    const { taskId, agentId } = req.body;

    if (!taskId || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'taskId and agentId are required',
      });
    }

    // Check if task is assigned to this agent
    const TaskAssignment = require('../models/TaskAssignment');
    const assignment = await TaskAssignment.findActive(taskId);

    if (!assignment || assignment.agent_id !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'Task is not assigned to this agent',
      });
    }

    // Create and start the agent instance
    const agentInstance = await agentExecutionService.createAgentInstance(taskId, agentId);

    res.status(200).json({
      success: true,
      message: 'Agent execution started successfully',
      data: {
        agentInstanceId: agentInstance.id,
        taskId,
        agentId,
        status: agentInstance.status,
        totalSteps: agentInstance.totalSteps,
      },
    });
  } catch (error) {
    logger.error('Start agent execution error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start agent execution',
    });
  }
});

/**
 * Get agent execution status
 * GET /api/agent-execution/:taskId/status
 */
router.get('/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;

    const agentInstance = agentExecutionService.getAgentInstance(taskId);

    if (!agentInstance) {
      return res.status(404).json({
        success: false,
        message: 'No active agent execution found for this task',
      });
    }

    // Check if user is authorized (client or agent of the task)
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);

    if (task.client_id !== req.user.id && agentInstance.agentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this execution',
      });
    }

    res.json({
      success: true,
      data: {
        agentInstanceId: agentInstance.id,
        taskId: agentInstance.taskId,
        agentId: agentInstance.agentId,
        status: agentInstance.status,
        stepIndex: agentInstance.stepIndex,
        totalSteps: agentInstance.totalSteps,
        progress: agentInstance.totalSteps ? Math.round((agentInstance.stepIndex / agentInstance.totalSteps) * 100) : 0,
        currentStep: agentInstance.steps[agentInstance.stepIndex]?.name || 'Not started',
        logs: agentInstance.logs,
        results: agentInstance.results,
        startTime: agentInstance.startTime,
        endTime: agentInstance.endTime,
      },
    });
  } catch (error) {
    logger.error('Get agent execution status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get agent execution status',
    });
  }
});

/**
 * Stop agent execution
 * POST /api/agent-execution/:taskId/stop
 */
router.post('/:taskId/stop', async (req, res) => {
  try {
    const { taskId } = req.params;

    const agentInstance = agentExecutionService.getAgentInstance(taskId);

    if (!agentInstance) {
      return res.status(404).json({
        success: false,
        message: 'No active agent execution found for this task',
      });
    }

    // Only the client can stop the agent
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);

    if (task.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the client can stop the agent execution',
      });
    }

    const stopped = await agentExecutionService.stopAgent(taskId);

    if (stopped) {
      res.json({
        success: true,
        message: 'Agent execution stopped successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Agent execution could not be stopped. It may already be completed or stopped.',
      });
    }
  } catch (error) {
    logger.error('Stop agent execution error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to stop agent execution',
    });
  }
});

/**
 * Get all active agent executions (admin only)
 * GET /api/agent-execution/active
 */
router.get('/active', authorize(['admin']), async (req, res) => {
  try {
    const activeAgents = agentExecutionService.getAllActiveAgents();

    res.json({
      success: true,
      data: activeAgents,
      count: activeAgents.length,
    });
  } catch (error) {
    logger.error('Get active agents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active agents',
    });
  }
});

module.exports = router;
