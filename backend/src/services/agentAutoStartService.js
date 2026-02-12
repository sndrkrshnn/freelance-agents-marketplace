const agentExecutionService = require('./agentExecutionService');
const Proposal = require('../models/Proposal');
const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const logger = require('../config/logger');

/**
 * Agent Auto-Start Service
 *
 * Automatically starts agent execution when:
 * 1. A proposal is accepted
 * 2. A task assignment is created
 */

class AgentAutoStartService {
  /**
   * Handle proposal acceptance - auto-start agent execution
   * This is called after a proposal is accepted
   */
  async handleProposalAccepted(proposalId) {
    try {
      logger.info(`Handling proposal acceptance: ${proposalId}`);

      // Get the proposal
      const proposal = await Proposal.findById(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      // Get the task
      const task = await Task.findById(proposal.task_id);
      if (!task) {
        throw new Error(`Task ${proposal.task_id} not found`);
      }

      // Get the assignment
      const assignment = await TaskAssignment.findActive(task.id);
      if (!assignment) {
        throw new Error(`No active assignment for task ${task.id}`);
      }

      // Start agent execution
      const agentInstance = await agentExecutionService.createAgentInstance(
        task.id,
        assignment.agent_id
      );

      logger.info(`Agent execution started automatically for task ${task.id}`);

      return agentInstance;
    } catch (error) {
      logger.error('Failed to auto-start agent execution:', error);
      // Don't throw - the proposal should still be accepted even if agent start fails
      return null;
    }
  }

  /**
   * Handle task assignment creation - auto-start agent execution
   */
  async handleTaskAssignmentCreated(taskId) {
    try {
      logger.info(`Handling task assignment created: ${taskId}`);

      // Get the assignment
      const assignment = await TaskAssignment.findActive(taskId);
      if (!assignment) {
        logger.warn(`No active assignment for task ${taskId}`);
        return null;
      }

      // Check if agent is already running
      const existingInstance = agentExecutionService.getAgentInstance(taskId);
      if (existingInstance) {
        logger.info(`Agent already running for task ${taskId}`);
        return existingInstance;
      }

      // Start agent execution
      const agentInstance = await agentExecutionService.createAgentInstance(
        taskId,
        assignment.agent_id
      );

      logger.info(`Agent execution started automatically for task ${taskId}`);

      return agentInstance;
    } catch (error) {
      logger.error('Failed to auto-start agent execution:', error);
      return null;
    }
  }
}

// Export singleton instance
const agentAutoStartService = new AgentAutoStartService();

module.exports = agentAutoStartService;
