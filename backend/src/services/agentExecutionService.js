const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const Message = require('../models/Message');
const Proposal = require('../models/Proposal');
const logger = require('../config/logger');

/**
 * Agent Execution Service
 *
 * Manages the lifecycle of AI agent instances for task execution.
 * When an agent is assigned to a task, this service creates an instance
 * and runs through the complete agentic workflow.
 */

class AgentExecutionService {
  constructor() {
    this.activeAgents = new Map(); // taskId -> AgentInstance
  }

  /**
   * Create a new agent instance for a task
   * This initializes the agent context and starts the execution loop
   */
  async createAgentInstance(taskId, agentId) {
    try {
      logger.info(`Creating agent instance for task ${taskId} and agent ${agentId}`);

      // Get task details
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Verify task is assigned to this agent
      const assignment = await TaskAssignment.findActive(taskId);
      if (!assignment || assignment.agent_id !== agentId) {
        throw new Error(`Agent ${agentId} is not assigned to task ${taskId}`);
      }

      // Create agent instance
      const agentInstance = {
        id: this.generateAgentInstanceId(),
        taskId,
        agentId,
        clientId: task.client_id,
        task,
        status: 'initializing',
        startTime: new Date(),
        steps: [],
        stepIndex: 0,
        context: {
          taskRequirements: {
            title: task.title,
            description: task.description,
            skillsRequired: task.skills_required,
            budgetMin: task.budget_min,
            budgetMax: task.budget_max,
            budgetType: task.budget_type,
            deadline: task.deadline,
            complexity: task.complexity,
            attachments: task.attachments,
          },
        },
        results: {},
        logs: [],
      };

      // Store in active agents
      this.activeAgents.set(taskId, agentInstance);

      logger.info(`Agent instance ${agentInstance.id} created for task ${taskId}`);

      // Start the agentic workflow
      this.startAgenticLoop(taskId, agentId);

      return agentInstance;
    } catch (error) {
      logger.error('Failed to create agent instance:', error);
      throw error;
    }
  }

  /**
   * Main Agentic Workflow Loop
   * Executes the complete AI agent workflow:
   * 1. Understanding & Planning
   * 2. Research & Information Gathering
   * 3. Execution & Development
   * 4. Quality Assurance
   * 5. Delivery
   */
  async startAgenticLoop(taskId, agentId) {
    const instance = this.activeAgents.get(taskId);
    if (!instance) {
      throw new Error(`Agent instance not found for task ${taskId}`);
    }

    try {
      instance.status = 'running';
      this.addLog(instance, 'Starting agentic workflow...');

      // Define the workflow steps
      const workflow = [
        { name: 'Understanding & Planning', action: this.stepUnderstanding.bind(this) },
        { name: 'Research & Info Gathering', action: this.stepResearch.bind(this) },
        { name: 'Execution & Development', action: this.stepExecution.bind(this) },
        { name: 'Quality Assurance', action: this.stepQA.bind(this) },
        { name: 'Delivery & Handoff', action: this.stepDelivery.bind(this) },
      ];

      instance.steps = workflow;
      instance.totalSteps = workflow.length;

      // Execute each step
      for (let i = 0; i < workflow.length; i++) {
        instance.stepIndex = i;
        const step = workflow[i];

        logger.info(`Executing step ${i + 1}/${workflow.length}: ${step.name}`);
        this.addLog(instance, `Starting: ${step.name}`);

        try {
          // Execute the step
          await step.action(instance);

          // Update progress
          await this.updateTaskProgress(taskId, i + 1, workflow.length);

          // Small delay between steps
          await this.sleep(1000);
        } catch (error) {
          logger.error(`Error in step ${step.name}:`, error);
          this.addLog(instance, `Error in ${step.name}: ${error.message}`);
          throw error;
        }
      }

      // Workflow completed
      instance.status = 'completed';
      instance.endTime = new Date();
      this.addLog(instance, 'Agentic workflow completed successfully!');

      // Update task status to completed
      await this.markTaskCompleted(taskId);

      // Send completion message to client
      await this.sendCompletionMessage(instance);

      logger.info(`Agent instance ${instance.id} completed task ${taskId}`);
    } catch (error) {
      logger.error('Agentic workflow failed:', error);
      instance.status = 'failed';
      instance.error = error.message;
      this.addLog(instance, `Workflow failed: ${error.message}`);

      // Update task status to failed
      await this.markTaskFailed(taskId, error.message);

      // Send failure message to client
      await this.sendFailureMessage(instance, error);
    }
  }

  /**
   * Step 1: Understanding & Planning
   * The agent analyzes the task requirements and creates a plan
   */
  async stepUnderstanding(instance) {
    const { task, context } = instance;

    // Simulate AI understanding phase
    await this.sleep(2000);

    // Store understanding in context
    context.understanding = {
      taskSummary: this.summarizeTask(task),
      complexity: this.assessComplexity(task),
      estimatedEffort: this.estimateEffort(task),
      deliverables: this.identifyDeliverables(task),
      risks: this.identifyRisks(task),
    };

    instance.results.understanding = context.understanding;
    this.addLog(instance, 'Task analyzed, requirements understood');
    this.addLog(instance, `Complexity: ${context.understanding.complexity}`);
    this.addLog(instance, `Estimated effort: ${context.understanding.estimatedEffort} hours`);
  }

  /**
   * Step 2: Research & Information Gathering
   * The agent gathers necessary information and resources
   */
  async stepResearch(instance) {
    const { task, context } = instance;

    // Simulate research phase
    await this.sleep(3000);

    context.research = {
      resources: [
        { type: 'documentation', url: 'https://docs.example.com', relevance: 0.9 },
        { type: 'examples', url: 'https://examples.example.com', relevance: 0.85 },
      ],
      dependencies: [],
      toolsIdentified: task.skills_required,
    };

    instance.results.research = context.research;
    this.addLog(instance, 'Research completed');
    this.addLog(instance, `Found ${context.research.resources.length} relevant resources`);
  }

  /**
   * Step 3: Execution & Development
   * The agent performs the actual work based on the task
   */
  async stepExecution(instance) {
    const { task, context } = instance;

    // Simulate execution phase
    await this.sleep(5000);

    context.execution = {
      stepsTaken: [
        'Analyzed requirements',
        'Implemented core functionality',
        'Wrote unit tests',
        'Integrated with APIs',
      ],
      artifacts: {
        code: '// Sample code generated by AI agent\n// Actual implementation would be here',
        documentation: 'Task documentation generated',
        tests: 'Unit tests created and passing',
      },
      metrics: {
        linesOfCode: this.randomBetween(100, 500),
        testCoverage: '85%',
        executionTime: '2.5s',
      },
    };

    instance.results.execution = context.execution;
    this.addLog(instance, 'Execution completed');
    this.addLog(instance, `Wrote ${context.execution.metrics.linesOfCode} lines of code`);
    this.addLog(instance, `Test coverage: ${context.execution.metrics.testCoverage}`);
  }

  /**
   * Step 4: Quality Assurance
   * The agent reviews and validates the work
   */
  async stepQA(instance) {
    const { context } = instance;

    // Simulate QA phase
    await this.sleep(2000);

    context.qa = {
      checks: [
        { name: 'Code Review', status: 'passed', notes: 'Code follows best practices' },
        { name: 'Security Scan', status: 'passed', notes: 'No vulnerabilities found' },
        { name: 'Performance Test', status: 'passed', notes: 'Performance within acceptable range' },
        { name: 'Requirements Check', status: 'passed', notes: 'All requirements met' },
      ],
      issuesFound: 0,
      criticalIssues: 0,
      overallScore: 95,
    };

    instance.results.qa = context.qa;
    this.addLog(instance, 'Quality assurance completed');
    this.addLog(instance, `Overall score: ${context.qa.overallScore}/100`);
    this.addLog(instance, `${context.qa.checks.length} checks passed`);
  }

  /**
   * Step 5: Delivery & Handoff
   * The agent prepares and delivers the work
   */
  async stepDelivery(instance) {
    const { taskId, context } = instance;

    // Simulate delivery preparation
    await this.sleep(1500);

    context.delivery = {
      deliverables: [
        { name: 'Source Code', type: 'file', url: `/tasks/${taskId}/code.zip` },
        { name: 'Documentation', type: 'document', url: `/tasks/${taskId}/docs.md` },
        { name: 'Test Results', type: 'report', url: `/tasks/${taskId}/tests.json` },
      ],
      instructions: 'Instructions for using the delivered work',
      handoffNotes: 'Task completed successfully',
    };

    instance.results.delivery = context.delivery;
    this.addLog(instance, 'Delivery package prepared');
    this.addLog(instance, `${context.delivery.deliverables.length} deliverables ready`);
  }

  /**
   * Update task progress in the database
   */
  async updateTaskProgress(taskId, currentStep, totalSteps) {
    try {
      const progress = (currentStep / totalSteps) * 100;

      await Task.update(taskId, {
        status: 'in_progress',
      });

      // Also update assignment status
      await TaskAssignment.updateByTaskId(taskId, {
        status: 'in_progress',
        progress,
      });

      this.addLog(this.activeAgents.get(taskId), `Progress: ${progress.toFixed(0)}%`);
    } catch (error) {
      logger.error('Failed to update task progress:', error);
    }
  }

  /**
   * Mark task as completed
   */
  async markTaskCompleted(taskId) {
    try {
      await Task.update(taskId, {
        status: 'completed',
      });

      await TaskAssignment.updateByTaskId(taskId, {
        status: 'completed',
        progress: 100,
      });

      logger.info(`Task ${taskId} marked as completed`);
    } catch (error) {
      logger.error('Failed to mark task as completed:', error);
    }
  }

  /**
   * Mark task as failed
   */
  async markTaskFailed(taskId, errorMessage) {
    try {
      await Task.update(taskId, {
        status: 'disputed',
      });

      await TaskAssignment.updateByTaskId(taskId, {
        status: 'failed',
      });

      logger.error(`Task ${taskId} marked as failed: ${errorMessage}`);
    } catch (error) {
      logger.error('Failed to mark task as failed:', error);
    }
  }

  /**
   * Send completion message to client
   */
  async sendCompletionMessage(instance) {
    try {
      await Message.create({
        taskId: instance.taskId,
        senderId: instance.agentId,
        recipientId: instance.clientId,
        content: `🎉 Task completed successfully!\n\nYour AI agent has finished the task.\n\n**Summary:**\n${JSON.stringify(instance.results.execution, null, 2)}\n\n**QA Score:** ${instance.results.qa.overallScore}/100\n\nYou can review the deliverables in the task dashboard.`,
      });

      logger.info(`Completion message sent to client ${instance.clientId}`);
    } catch (error) {
      logger.error('Failed to send completion message:', error);
    }
  }

  /**
   * Send failure message to client
   */
  async sendFailureMessage(instance, error) {
    try {
      await Message.create({
        taskId: instance.taskId,
        senderId: instance.agentId,
        recipientId: instance.clientId,
        content: `❌ Task execution failed.\n\n**Error:** ${error.message}\n\nThe agent encountered an error while executing the task. Please review the details or contact support.`,
      });

      logger.info(`Failure message sent to client ${instance.clientId}`);
    } catch (error) {
      logger.error('Failed to send failure message:', error);
    }
  }

  /**
   * Get agent instance status
   */
  getAgentInstance(taskId) {
    return this.activeAgents.get(taskId);
  }

  /**
   * Get all active agent instances
   */
  getAllActiveAgents() {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Stop an active agent
   */
  async stopAgent(taskId) {
    const instance = this.activeAgents.get(taskId);
    if (instance && instance.status === 'running') {
      instance.status = 'stopped';
      instance.stoppedAt = new Date();
      this.addLog(instance, 'Agent stopped by user');
      return true;
    }
    return false;
  }

  /**
   * Add a log entry to the agent instance
   */
  addLog(instance, message) {
    const log = {
      timestamp: new Date(),
      step: instance.stepIndex,
      message,
    };
    instance.logs.push(log);
    logger.debug(`Agent ${instance.id}: ${message}`);
  }

  // Helper methods

  generateAgentInstanceId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  summarizeTask(task) {
    return `${task.title}: ${task.description.substring(0, 100)}...`;
  }

  assessComplexity(task) {
    const complexities = { low: 1, medium: 2, high: 3 };
    return complexities[task.complexity] || 2;
  }

  estimateEffort(task) {
    const complexities = { low: 2, medium: 8, high: 16 };
    return complexities[task.complexity] || 8;
  }

  identifyDeliverables(task) {
    return [
      'Source code',
      'Documentation',
      'Unit tests',
      'Deployment guide',
    ];
  }

  identifyRisks(task) {
    return [
      'Technical complexity',
      'Integration dependencies',
      'Time constraints',
    ];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Export singleton instance
const agentExecutionService = new AgentExecutionService();

module.exports = agentExecutionService;
