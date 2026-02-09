const Proposal = require('../models/Proposal');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Create a new proposal
 */
exports.createProposal = async (req, res) => {
  try {
    const agentId = req.user.id;
    const { taskId } = req.params;

    // Verify task exists and is open
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    if (task.status !== 'open') {
      throw new AppError(400, 'Cannot submit proposal for this task');
    }

    const proposalData = {
      taskId,
      agentId,
      ...req.body,
    };

    const proposal = await Proposal.create(proposalData);

    // Send notification to client
    try {
      const agentName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      await Notification.sendNewProposalNotification(
        task.client_id,
        task.title,
        agentName,
        taskId
      );
    } catch (notificationError) {
      logger.error('Failed to send proposal notification:', notificationError);
    }

    logger.info(`Proposal created: ${proposal.id} for task ${taskId} by agent ${agentId}`);

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: proposal,
    });
  } catch (error) {
    logger.error('Create proposal error:', error);
    throw error;
  }
};

/**
 * Get proposal by ID
 */
exports.getProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const proposal = await Proposal.findById(id);

    if (!proposal) {
      throw new AppError(404, 'Proposal not found');
    }

    res.json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    logger.error('Get proposal error:', error);
    throw error;
  }
};

/**
 * Get my proposals (agent's proposals)
 */
exports.getMyProposals = async (req, res) => {
  try {
    const agentId = req.user.id;
    const filters = req.query;

    const result = await Proposal.findByAgent(agentId, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get my proposals error:', error);
    throw error;
  }
};

/**
 * Accept a proposal
 */
exports.acceptProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;

    // Get proposal details first
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      throw new AppError(404, 'Proposal not found');
    }

    // Verify task ownership
    const task = await Task.findById(proposal.task_id);
    if (task.client_id !== clientId && req.user.userType !== 'admin') {
      throw new AppError(403, 'You do not have permission to accept this proposal');
    }

    if (proposal.status !== 'pending') {
      throw new AppError(400, 'Proposal has already been ' + proposal.status);
    }

    if (task.status !== 'open') {
      throw new AppError(400, 'Task is not available for proposals');
    }

    // Accept proposal (this will also reject others and create assignment)
    const result = await Proposal.acceptProposal(id);

    // Send notification to agent
    try {
      const clientName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      await Notification.sendProposalAcceptedNotification(
        proposal.agent_id,
        task.title,
        clientId
      );
    } catch (notificationError) {
      logger.error('Failed to send acceptance notification:', notificationError);
    }

    logger.info(`Proposal accepted: ${id} by client ${clientId}`);

    res.json({
      success: true,
      message: 'Proposal accepted successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Accept proposal error:', error);
    throw error;
  }
};

/**
 * Reject a proposal
 */
exports.rejectProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      throw new AppError(404, 'Proposal not found');
    }

    // Verify task ownership
    const task = await Task.findById(proposal.task_id);
    if (task.client_id !== req.user.id && req.user.userType !== 'admin') {
      throw new AppError(403, 'You do not have permission to reject this proposal');
    }

    if (proposal.status !== 'pending') {
      throw new AppError(400, 'Cannot reject this proposal');
    }

    const updatedProposal = await Proposal.update(id, { status: 'rejected' });

    logger.info(`Proposal rejected: ${id}`);

    res.json({
      success: true,
      message: 'Proposal rejected successfully',
      data: updatedProposal,
    });
  } catch (error) {
    logger.error('Reject proposal error:', error);
    throw error;
  }
};

/**
 * Withdraw a proposal (for agents)
 */
exports.withdrawProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;

    const proposal = await Proposal.withdraw(id, agentId);

    logger.info(`Proposal withdrawn: ${id} by agent ${agentId}`);

    res.json({
      success: true,
      message: 'Proposal withdrawn successfully',
      data: proposal,
    });
  } catch (error) {
    logger.error('Withdraw proposal error:', error);
    throw error;
  }
};

/**
 * Update proposal
 */
exports.updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      throw new AppError(404, 'Proposal not found');
    }

    // Only task owner can update status
    const task = await Task.findById(proposal.task_id);
    if (task.client_id !== req.user.id && req.user.userType !== 'admin') {
      throw new AppError(403, 'You do not have permission to update this proposal');
    }

    const updatedProposal = await Proposal.update(id, { status });

    logger.info(`Proposal updated: ${id}`);

    res.json({
      success: true,
      message: 'Proposal updated successfully',
      data: updatedProposal,
    });
  } catch (error) {
    logger.error('Update proposal error:', error);
    throw error;
  }
};
