const { cacheService } = require('./cacheService');
const AgentProfile = require('../models/AgentProfile');
const Review = require('../models/Review');

/**
 * Cache TTL configurations for agent data
 */
const TTL = {
  PROFILE: parseInt(process.env.CACHE_TTL_PROFILES) || 3600, // 1 hour
  LISTING: parseInt(process.env.CACHE_TTL_LISTINGS) || 300, // 5 minutes
  SEARCH: parseInt(process.env.CACHE_TTL_LISTINGS) || 300, // 5 minutes
  STATS: parseInt(process.env.CACHE_TTL_PROFILES) || 3600, // 1 hour
  TOP_AGENTS: 600, // 10 minutes
};

/**
 * Agent profile caching service
 */
class AgentCacheService {
  /**
   * Build cache key for agent profile
   */
  buildProfileKey(userId) {
    return `agent:profile:${userId}`;
  }

  /**
   * Build cache key for agent profile stats
   */
  buildStatsKey(userId) {
    return `agent:stats:${userId}`;
  }

  /**
   * Build cache key for agent listings
   */
  buildListingKey(filters) {
    const filtersStr = JSON.stringify(filters);
    return `agent:listings:${Buffer.from(filtersStr).toString('base64')}`;
  }

  /**
   * Build cache key for search results
   */
  buildSearchKey(query, page, limit) {
    return `agent:search:${query}:${page}:${limit}`;
  }

  /**
   * Build cache key for top agents
   */
  buildTopAgentsKey(limit) {
    return `agent:top:${limit}`;
  }

  /**
   * Build cache key for recommended tasks
   */
  buildRecommendedTasksKey(agentId) {
    return `agent:recommended:${agentId}`;
  }

  /**
   * Get agent profile from cache or database
   */
  async getProfile(userId) {
    const cacheKey = this.buildProfileKey(userId);

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fallback to database
    try {
      const profile = await AgentProfile.findByUserId(userId);

      if (profile) {
        // Cache the result
        await cacheService.set(cacheKey, profile, TTL.PROFILE);
      }

      return profile;
    } catch (error) {
      console.error('Error fetching agent profile from database:', error);
      throw error;
    }
  }

  /**
   * Set agent profile in cache
   */
  async setProfile(userId, profile) {
    const cacheKey = this.buildProfileKey(userId);
    return await cacheService.set(cacheKey, profile, TTL.PROFILE);
  }

  /**
   * Invalidate agent profile cache
   */
  async invalidateProfile(userId) {
    const cacheKey = this.buildProfileKey(userId);
    await cacheService.del(cacheKey);

    // Also invalidate stats
    await this.invalidateStats(userId);

    // Invalidate listings that might contain this agent
    await this.invalidateAllListings();

    // Invalidate recommended tasks
    await this.invalidateRecommendedTasks(userId);
  }

  /**
   * Get agent profile stats from cache or database
   */
  async getProfileStats(userId) {
    const cacheKey = this.buildStatsKey(userId);

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fallback to database
    try {
      const stats = await Review.getAgentStats(userId);

      if (stats) {
        // Cache the result
        await cacheService.set(cacheKey, stats, TTL.STATS);
      }

      return stats;
    } catch (error) {
      console.error('Error fetching agent stats from database:', error);
      throw error;
    }
  }

  /**
   * Set agent profile stats in cache
   */
  async setProfileStats(userId, stats) {
    const cacheKey = this.buildStatsKey(userId);
    return await cacheService.set(cacheKey, stats, TTL.STATS);
  }

  /**
   * Invalidate agent stats cache
   */
  async invalidateStats(userId) {
    const cacheKey = this.buildStatsKey(userId);
    return await cacheService.del(cacheKey);
  }

  /**
   * Get agent listings from cache or database
   */
  async getAgentListings(filters) {
    const cacheKey = this.buildListingKey(filters);

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fallback to database
    try {
      const result = await AgentProfile.list(filters);

      if (result) {
        // Cache the result
        await cacheService.set(cacheKey, result, TTL.LISTING);
      }

      return result;
    } catch (error) {
      console.error('Error fetching agent listings from database:', error);
      throw error;
    }
  }

  /**
   * Set agent listings in cache
   */
  async setAgentListings(filters, result) {
    const cacheKey = this.buildListingKey(filters);
    return await cacheService.set(cacheKey, result, TTL.LISTING);
  }

  /**
   * Invalidate all agent listings cache
   */
  async invalidateAllListings() {
    return await cacheService.delPattern('agent:listings:*');
  }

  /**
   * Search agents from cache or database
   */
  async searchAgents(query, page = 1, limit = 20) {
    const cacheKey = this.buildSearchKey(query, page, limit);

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fallback to database
    try {
      const { agents } = await AgentProfile.list({ limit: 50 });

      // Filter agents based on search query
      const searchTerms = query.toLowerCase().split(' ');

      const matchedAgents = agents.filter((agent) => {
        const searchableText = `${agent.first_name} ${agent.last_name} ${agent.title} ${(agent.skills || []).join(' ')}`.toLowerCase();
        return searchTerms.some((term) => searchableText.includes(term));
      });

      const paginatedResults = {
        agents: matchedAgents.slice((page - 1) * limit, page * limit),
        total: matchedAgents.length,
        page,
        limit,
        totalPages: Math.ceil(matchedAgents.length / limit),
      };

      // Cache the result
      await cacheService.set(cacheKey, paginatedResults, TTL.SEARCH);

      return paginatedResults;
    } catch (error) {
      console.error('Error searching agents from database:', error);
      throw error;
    }
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearch(query = null) {
    if (query) {
      // Invalidate specific search queries
      return await cacheService.delPattern(`agent:search:${query}:*`);
    } else {
      // Invalidate all searches
      return await cacheService.delPattern('agent:search:*');
    }
  }

  /**
   * Get top agents from cache or database
   */
  async getTopAgents(limit = 10) {
    const cacheKey = this.buildTopAgentsKey(limit);

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fallback to database
    try {
      const agents = await AgentProfile.getTopAgents(limit);

      if (agents) {
        // Cache the result
        await cacheService.set(cacheKey, agents, TTL.TOP_AGENTS);
      }

      return agents;
    } catch (error) {
      console.error('Error fetching top agents from database:', error);
      throw error;
    }
  }

  /**
   * Set top agents in cache
   */
  async setTopAgents(limit, agents) {
    const cacheKey = this.buildTopAgentsKey(limit);
    return await cacheService.set(cacheKey, agents, TTL.TOP_AGENTS);
  }

  /**
   * Invalidate top agents cache
   */
  async invalidateTopAgents() {
    return await cacheService.delPattern('agent:top:*');
  }

  /**
   * Get recommended tasks for agent from cache or compute fresh
   */
  async getRecommendedTasks(agentId, MatchingEngine, Task) {
    const cacheKey = this.buildRecommendedTasksKey(agentId);

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Compute fresh recommendations
    try {
      // Get agent profile
      const profile = await this.getProfile(agentId);
      if (!profile) {
        return [];
      }

      // Get all open tasks
      const tasksResult = await Task.list({ status: 'open', limit: 100 });
      const tasks = tasksResult.tasks || tasksResult;

      // Find matching tasks
      const matchedTasks = await MatchingEngine.findTasksForAgent(profile, tasks, 20);

      // Cache the result
      await cacheService.set(cacheKey, matchedTasks, TTL.SEARCH);

      return matchedTasks;
    } catch (error) {
      console.error('Error getting recommended tasks:', error);
      throw error;
    }
  }

  /**
   * Set recommended tasks in cache
   */
  async setRecommendedTasks(agentId, tasks) {
    const cacheKey = this.buildRecommendedTasksKey(agentId);
    return await cacheService.set(cacheKey, tasks, TTL.SEARCH);
  }

  /**
   * Invalidate recommended tasks cache
   */
  async invalidateRecommendedTasks(agentId = null) {
    if (agentId) {
      const cacheKey = this.buildRecommendedTasksKey(agentId);
      return await cacheService.del(cacheKey);
    } else {
      return await cacheService.delPattern('agent:recommended:*');
    }
  }

  /**
   * Warm up cache for frequently accessed agents
   */
  async warmCache(agentIds = []) {
    const warmupPromises = [];

    for (const userId of agentIds) {
      warmupPromises.push(this.getProfile(userId));
      warmupPromises.push(this.getProfileStats(userId));
    }

    const results = await Promise.allSettled(warmupPromises);
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`Cache warmup complete for ${agentIds.length} agents: ${successful} successful, ${failed} failed`);

    return { successful, failed, total: agentIds.length };
  }

  /**
   * Get detailed cache statistics for agent caching
   */
  async getStats() {
    const stats = await cacheService.getStats();
    return {
      ...stats,
      ttl: TTL,
    };
  }

  /**
   * Clear all agent-related cache
   */
  async clearAll() {
    return await cacheService.delPattern('agent:*');
  }
}

// Export singleton instance
const agentCache = new AgentCacheService();

module.exports = {
  agentCache,
  TTL,
};
