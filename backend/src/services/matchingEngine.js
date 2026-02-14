const AgentProfile = require('../models/AgentProfile');
const logger = require('../config/logger');

/**
 * Matching Engine for connecting agents with tasks
 * Uses skill matching, ratings, availability, and price considerations
 */
class MatchingEngine {
  /**
   * Find best matching agents for a given task
   * @param {Object} task - Task object with required properties
   * @param {number} limit - Maximum number of matches to return
   * @returns {Array} - Array of matched agents with scores
   */
  static async findMatchesForTask(task, limit = 10) {
    try {
      const { skillsRequired = [], budgetMax, budgetMin, complexity } = task;

      // Fetch agents with relevant skills
      const { agents } = await AgentProfile.list({
        skills: skillsRequired,
        availability: 'available',
        maxRate: budgetMax,
        sort: 'rating',
        limit: limit * 2, // Get more to filter later
      });

      // Score each agent
      const scoredAgents = agents.map((agent) => this.scoreAgent(agent, task));

      // Sort by score descending
      scoredAgents.sort((a, b) => b.score - a.score);

      // Return top matches
      return scoredAgents.slice(0, limit);
    } catch (error) {
      logger.error('Error in findMatchesForTask:', error);
      throw error;
    }
  }

  /**
   * Score an agent based on match factors
   * @param {Object} agent - Agent object
   * @param {Object} task - Task object
   * @returns {Object} - Agent with score and breakdown
   */
  static scoreAgent(agent, task) {
    let score = 0;
    const breakdown = {};

    // Skills Match (40 points)
    const skillsMatch = this.calculateSkillsMatch(agent.skills, task.skillsRequired);
    breakdown.skillsMatch = skillsMatch;
    score += skillsMatch * 40;

    // Rating Score (25 points) - normalize 0-5 to 0-25
    const ratingScore = (agent.average_rating || 0) / 5;
    breakdown.ratingScore = ratingScore;
    score += ratingScore * 25;

    // Experience Score (15 points) - more experienced agents get higher score
    const experienceScore = Math.min(agent.experience_years / 10, 1);
    breakdown.experienceScore = experienceScore;
    score += experienceScore * 15;

    // Completed Tasks Score (10 points) - more completed tasks means reliability
    const tasksScore = Math.min((agent.completed_tasks || 0) / 50, 1);
    breakdown.tasksScore = tasksScore;
    score += tasksScore * 10;

    // Price Match (10 points) - lower rate within budget is better
    const priceScore = this.calculatePriceMatch(agent, task);
    breakdown.priceScore = priceScore;
    score += priceScore * 10;

    return {
      ...agent,
      matchScore: Math.round(score * 100) / 100,
      matchBreakdown: breakdown,
      matchPercentage: Math.min(Math.round(score), 100),
    };
  }

  /**
   * Calculate how well agent skills match task requirements
   * @param {Array} agentSkills - Agent's skills
   * @param {Array} requiredSkills - Required skills for task
   * @returns {number} - Score between 0 and 1
   */
  static calculateSkillsMatch(agentSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 1;
    if (!agentSkills || agentSkills.length === 0) return 0;

    const requiredSkillsLower = requiredSkills.map(s => s.toLowerCase());
    const agentSkillsLower = agentSkills.map(s => s.toLowerCase());

    // Exact matches
    const exactMatches = agentSkillsLower.filter(skill =>
      requiredSkillsLower.some(req => req === skill || req.includes(skill) || skill.includes(req))
    );

    // Partial/fuzzy matches based on words
    const partialMatches = agentSkillsLower.filter(skill => {
      const words = skill.split(/[\s-]/);
      return words.some(word =>
        requiredSkillsLower.some(req => req.includes(word) || word.includes(req.split(/[\s-]/)[0]))
      );
    });

    const matchCount = Math.max(exactMatches.length, partialMatches.length);
    return Math.min(matchCount / requiredSkills.length, 1);
  }

  /**
   * Calculate how well the agent's rate fits the task budget
   * @param {Object} agent - Agent object
   * @param {Object} task - Task object
   * @returns {number} - Score between 0 and 1
   */
  static calculatePriceMatch(agent, task) {
    if (!agent.hourly_rate) return 0.5; // Neutral score if no rate specified
    if (!task.budget_max) return 0.5; // Neutral score if no max budget

    if (agent.hourly_rate > task.budget_max) {
      // Agent is over budget - penalize based on how far over
      const overBudgetRatio = agent.hourly_rate / task.budget_max;
      return Math.max(0, 1 - (overBudgetRatio - 1) * 0.5);
    }

    if (task.budget_min) {
      // Agent is within budget - preferred range
      if (agent.hourly_rate >= task.budget_min && agent.hourly_rate <= task.budget_max) {
        return 1;
      }

      // Agent is below minimum budget - still good, full score
      if (agent.hourly_rate < task.budget_min) {
        return 1;
      }
    }

    // Use midpoint of budget as reference
    const budgetMidpoint = task.budget_max / 2;
    const deviation = Math.abs(agent.hourly_rate - budgetMidpoint) / budgetMidpoint;
    return Math.max(0, 1 - deviation * 0.3);
  }

  /**
   * Find tasks suitable for an agent
   * @param {Object} agent - Agent object
   * @param {Array} tasks - List of open tasks
   * @param {number} limit - Maximum number of matches to return
   * @returns {Array} - Array of matched tasks with scores
   */
  static async findTasksForAgent(agent, tasks, limit = 10) {
    try {
      const { skills = [], hourly_rate } = agent;

      // Filter open tasks and score them
      const matchedTasks = tasks
        .filter(task => task.status === 'open')
        .map(task => this.scoreTaskForAgent(task, agent))
        .filter(matched => matched.matchPercentage >= 30) // Only show decent matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      return matchedTasks;
    } catch (error) {
      logger.error('Error in findTasksForAgent:', error);
      throw error;
    }
  }

  /**
   * Score a task for an agent
   * @param {Object} task - Task object
   * @param {Object} agent - Agent object
   * @returns {Object} - Task with score and breakdown
   */
  static scoreTaskForAgent(task, agent) {
    let score = 0;
    const breakdown = {};

    // Skills Match (50 points) - Most important for agents
    const skillsMatch = this.calculateSkillsMatch(agent.skills, task.skills_required);
    breakdown.skillsMatch = skillsMatch;
    score += skillsMatch * 50;

    // Budget Match (30 points) - Agent wants to know if they fit the budget
    const budgetScore = this.calculateAgentBudgetMatch(agent, task);
    breakdown.budgetScore = budgetScore;
    score += budgetScore * 30;

    // Complexity Match (10 points) - Prefer tasks matching experience level
    const complexityScore = this.calculateComplexityMatch(agent, task.complexity);
    breakdown.complexityScore = complexityScore;
    score += complexityScore * 10;

    // Client Rating (10 points) - Prefer clients with good ratings
    const clientScore = Math.min((task.client_rating || 0) / 5, 1);
    breakdown.clientScore = clientScore;
    score += clientScore * 10;

    return {
      ...task,
      matchScore: Math.round(score * 100) / 100,
      matchBreakdown: breakdown,
      matchPercentage: Math.min(Math.round(score), 100),
    };
  }

  /**
   * Calculate how well the task budget matches the agent's rate
   * @param {Object} agent - Agent object
   * @param {Object} task - Task object
   * @returns {number} - Score between 0 and 1
   */
  static calculateAgentBudgetMatch(agent, task) {
    if (!agent.hourly_rate) return 0.5;
    if (!task.budget_min && !task.budget_max) return 0.5;

    const agentRate = agent.hourly_rate;

    // Task has no budget range
    if (!task.budget_min && task.budget_max) {
      return 1;
    }

    // Agent is in the budget range - excellent
    if (agentRate >= task.budget_min && agentRate <= task.budget_max) {
      // Position in range (closer to middle is better)
      const range = task.budget_max - task.budget_min;
      const position = (agentRate - task.budget_min) / range;
      return 1 - Math.abs(position - 0.5) * 0.3;
    }

    // Agent is above budget
    if (agentRate > task.budget_max) {
      const overBudget = agentRate / task.budget_max - 1;
      return Math.max(0, 1 - overBudget * 2);
    }

    // Agent is below budget - still acceptable
    const underBudget = task.budget_min / agentRate - 1;
    return Math.max(0.5, 1 - underBudget * 0.5);
  }

  /**
   * Calculate if task complexity matches agent's experience
   * @param {Object} agent - Agent object
   * @param {string} taskComplexity - Task complexity level
   * @returns {number} - Score between 0 and 1
   */
  static calculateComplexityMatch(agent, taskComplexity) {
    const complexityLevels = { low: 1, medium: 2, high: 3 };
    const agentLevel = Math.min(Math.floor(agent.experience_years / 3) + 1, 3);
    const taskLevel = complexityLevels[taskComplexity] || 2;

    // Agents prefer tasks at or below their level
    if (agentLevel >= taskLevel) {
      return 1;
    }

    // Penalize tasks above agent's level
    return Math.max(0, 1 - (taskLevel - agentLevel) * 0.5);
  }

  /**
   * Get matching statistics for a task
   * @param {Object} task - Task object
   * @returns {Object} - Statistics about potential matches
   */
  static async getMatchStatistics(task) {
    try {
      const matches = await this.findMatchesForTask(task, 50);

      if (matches.length === 0) {
        return {
          totalMatches: 0,
          averageScore: 0,
          topScore: 0,
          averageHourlyRate: 0,
        };
      }

      const totalMatches = matches.length;
      const averageScore = matches.reduce((sum, m) => sum + m.matchScore, 0) / totalMatches;
      const topScore = matches[0].matchScore;
      const averageHourlyRate = matches.reduce((sum, m) => sum + (m.hourly_rate || 0), 0) / totalMatches;

      return {
        totalMatches,
        averageScore: Math.round(averageScore * 100) / 100,
        topScore: Math.round(topScore * 100) / 100,
        averageHourlyRate: Math.round(averageHourlyRate * 100) / 100,
      };
    } catch (error) {
      logger.error('Error in getMatchStatistics:', error);
      throw error;
    }
  }
}

module.exports = MatchingEngine;
