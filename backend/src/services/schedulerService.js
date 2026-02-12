const cron = require('node-cron');
const agentAutoStartService = require('./agentAutoStartService');
const logger = require('../config/logger');

/**
 * Scheduler Service
 *
 * Handles scheduled tasks such as:
 * - Agent recovery checks
 * - Status updates
 * - Cleanup tasks
 * - Notifications
 */

class SchedulerService {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler service...');
    this.isRunning = true;

    // Agent Recovery Check - every 10 minutes
    const agentRecoveryTask = cron.schedule('*/10 * * * *', async () => {
      try {
        await agentAutoStartService.checkAndRecoverAgents();
      } catch (error) {
        logger.error('Agent recovery task failed:', error);
      }
    }, {
      name: 'agent-recovery-check',
      timezone: process.env.TZ || 'UTC',
    });

    this.tasks.push({
      name: 'agent-recovery-check',
      task: agentRecoveryTask,
      schedule: '*/10 * * * *',
      description: 'Check and recover stuck agent executions',
    });

    logger.info(`Started ${this.tasks.length} scheduled tasks`);

    // Log all tasks
    this.tasks.forEach(t => {
      logger.info(`  - ${t.name}: ${t.schedule} (${t.description})`);
    });
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    logger.info('Stopping scheduler service...');

    this.tasks.forEach(({ name, task }) => {
      task.stop();
      logger.info(`Stopped task: ${name}`);
    });

    this.tasks = [];
    this.isRunning = false;

    logger.info('Scheduler stopped');
  }

  /**
   * Get all scheduled tasks
   */
  getTasks() {
    return this.tasks.map(t => ({
      name: t.name,
      schedule: t.schedule,
      description: t.description,
      running: true,
    }));
  }

  /**
   * Add a custom scheduled task
   */
  addTask(name, cronExpression, callback, options = {}) {
    try {
      const task = cron.schedule(cronExpression, callback, {
        name,
        timezone: process.env.TZ || 'UTC',
        ...options,
      });

      this.tasks.push({
        name,
        task,
        schedule: cronExpression,
        description: options.description || 'Custom task',
      });

      logger.info(`Added scheduled task: ${name} (${cronExpression})`);
      return true;
    } catch (error) {
      logger.error(`Failed to add task ${name}:`, error);
      return false;
    }
  }
}

// Export singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;
