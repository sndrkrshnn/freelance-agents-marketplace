const MatchingEngine = require('../../src/services/matchingEngine');

describe('MatchingEngine', () => {
  describe('calculateSkillsMatch', () => {
    it('should calculate perfect match', () => {
      const agentSkills = ['Python', 'Machine Learning', 'NLP'];
      const requiredSkills = ['Python', 'Machine Learning', 'NLP'];

      const match = MatchingEngine.calculateSkillsMatch(agentSkills, requiredSkills);

      expect(match).toBe(1);
    });

    it('should calculate partial match', () => {
      const agentSkills = ['Python', 'JavaScript'];
      const requiredSkills = ['Python', 'Machine Learning', 'NLP'];

      const match = MatchingEngine.calculateSkillsMatch(agentSkills, requiredSkills);

      expect(match).toBeGreaterThan(0);
      expect(match).toBeLessThan(1);
    });

    it('should return 0 for no match', () => {
      const agentSkills = ['JavaScript', 'React'];
      const requiredSkills = ['Python', 'Machine Learning'];

      const match = MatchingEngine.calculateSkillsMatch(agentSkills, requiredSkills);

      expect(match).toBe(0);
    });

    it('should handle fuzzy matching', () => {
      const agentSkills = ['Python Programming', 'ML'];
      const requiredSkills = ['Python', 'Machine Learning'];

      const match = MatchingEngine.calculateSkillsMatch(agentSkills, requiredSkills);

      expect(match).toBeGreaterThan(0);
    });
  });

  describe('calculatePriceMatch', () => {
    it('should calculate perfect price match', () => {
      const agent = { hourly_rate: 50 };
      const task = {
        budget_min: 40,
        budget_max: 60,
      };

      const match = MatchingEngine.calculatePriceMatch(agent, task);

      expect(match).toBe(1);
    });

    it('should penalize agents over budget', () => {
      const agent = { hourly_rate: 100 };
      const task = {
        budget_min: 40,
        budget_max: 60,
      };

      const match = MatchingEngine.calculatePriceMatch(agent, task);

      expect(match).toBeLessThan(1);
      expect(match).toBeGreaterThan(0);
    });

    it('should handle agents below budget', () => {
      const agent = { hourly_rate: 30 };
      const task = {
        budget_min: 40,
        budget_max: 60,
      };

      const match = MatchingEngine.calculatePriceMatch(agent, task);

      expect(match).toBe(1);
    });

    it('should handle no maximum budget', () => {
      const agent = { hourly_rate: 100 };
      const task = {
        budget_max: null,
      };

      const match = MatchingEngine.calculatePriceMatch(agent, task);

      expect(match).toBe(0.5);
    });
  });

  describe('scoreAgent', () => {
    it('should score agent based on all factors', () => {
      const agent = {
        id: '1',
        email: 'agent@example.com',
        skills: ['Python', 'Machine Learning'],
        average_rating: 4.5,
        experience_years: 5,
        completed_tasks: 20,
        hourly_rate: 50,
      };

      const task = {
        skills_required: ['Python', 'Machine Learning', 'NLP'],
        budget_max: 75,
        complexity: 'medium',
      };

      const scored = MatchingEngine.scoreAgent(agent, task);

      expect(scored).toHaveProperty('matchScore');
      expect(scored).toHaveProperty('matchBreakdown');
      expect(scored).toHaveProperty('matchPercentage');
      expect(scored.matchScore).toBeGreaterThan(0);
      expect(scored.matchScore).toBeLessThanOrEqual(100);
    });

    it('should have correct breakdown structure', () => {
      const agent = {
        id: '1',
        email: 'agent@example.com',
        skills: ['Python'],
        average_rating: 3,
        experience_years: 1,
        completed_tasks: 5,
        hourly_rate: 50,
      };

      const task = {
        skills_required: ['Python'],
        budget_max: 75,
      };

      const scored = MatchingEngine.scoreAgent(agent, task);

      expect(scored.matchBreakdown).toHaveProperty('skillsMatch');
      expect(scored.matchBreakdown).toHaveProperty('ratingScore');
      expect(scored.matchBreakdown).toHaveProperty('experienceScore');
      expect(scored.matchBreakdown).toHaveProperty('tasksScore');
      expect(scored.matchBreakdown).toHaveProperty('priceScore');
    });
  });
});
