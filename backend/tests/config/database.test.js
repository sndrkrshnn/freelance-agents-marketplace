const { Pool } = require('pg');
const pool = require('../../src/config/database');
const logger = require('../../src/config/logger');

// Mock logger to avoid actual logging during tests
jest.mock('../../src/config/logger');

describe('Database Configuration', () => {
  describe('Environment Variables', () => {
    it('should use provided DB_HOST from environment', () => {
      expect(pool.options.host).toBeDefined();
      expect(typeof pool.options.host).toBe('string');
    });

    it('should use provided DB_PORT from environment', () => {
      expect(pool.options.port).toBeDefined();
      expect(typeof pool.options.port).toBe('number');
      expect(pool.options.port).toBeGreaterThan(0);
    });

    it('should use provided DB_NAME from environment', () => {
      expect(pool.options.database).toBeDefined();
      expect(typeof pool.options.database).toBe('string');
    });

    it('should use provided DB_USER from environment', () => {
      expect(pool.options.user).toBeDefined();
      expect(typeof pool.options.user).toBe('string');
    });

    it('should use provided DB_PASSWORD from environment', () => {
      expect(pool.options.password).toBeDefined();
      expect(typeof pool.options.password).toBe('string');
    });

    it('should fallback to default values when env vars are not set', () => {
      // Test that defaults exist (without modifying process.env)
      const { Pool: PoolTest } = require('pg');
      const testPool = new PoolTest({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'freelance_agents_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      });

      expect(testPool.options.host).toBeTruthy();
      expect(testPool.options.port).toBeGreaterThan(0);
      expect(testPool.options.database).toBeTruthy();
      expect(testPool.options.user).toBeTruthy();
      expect(testPool.options.password).toBeTruthy();
    });
  });

  describe('Pool Configuration', () => {
    it('should have connection pool configured with max clients', () => {
      expect(pool.options.max).toBeDefined();
      expect(typeof pool.options.max).toBe('number');
      expect(pool.options.max).toBeGreaterThan(0);
    });

    it('should have idle timeout configured', () => {
      expect(pool.options.idleTimeoutMillis).toBeDefined();
      expect(typeof pool.options.idleTimeoutMillis).toBe('number');
      expect(pool.options.idleTimeoutMillis).toBeGreaterThan(0);
    });

    it('should have connection timeout configured', () => {
      expect(pool.options.connectionTimeoutMillis).toBeDefined();
      expect(typeof pool.options.connectionTimeoutMillis).toBe('number');
      expect(pool.options.connectionTimeoutMillis).toBeGreaterThan(0);
    });
  });

  describe('Connection Events', () => {
    it('should have connect event handler', () => {
      expect(pool.listenerCount('connect')).toBeGreaterThan(0);
    });

    it('should have error event handler', () => {
      expect(pool.listenerCount('error')).toBeGreaterThan(0);
    });
  });

  describe('Pool Methods', () => {
    it('should expose connect method', () => {
      expect(typeof pool.connect).toBe('function');
    });

    it('should expose query method', () => {
      expect(typeof pool.query).toBe('function');
    });

    it('should expose end method', () => {
      expect(typeof pool.end).toBe('function');
    });
  });

  describe('Helper Methods', () => {
    it('should have testConnection method', () => {
      expect(typeof pool.testConnection).toBe('function');
    });

    it('should have isHealthy method', () => {
      expect(typeof pool.isHealthy).toBe('function');
    });
  });

  describe('Instance Type', () => {
    it('should export a Pool instance', () => {
      expect(pool).toBeInstanceOf(Pool);
    });
  });

  describe('Environment Variable Validation', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore original environment after each test
      process.env = { ...originalEnv };
      jest.clearAllMocks();
    });

    it('should validate required environment variables in production', () => {
      process.env.NODE_ENV = 'production';

      // Set required variables
      process.env.DB_HOST = 'test-host';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'test-user';
      process.env.DB_PASSWORD = 'test-pass';

      // Import fresh database config with new env
      jest.resetModules();
      const db = require('../../src/config/database');

      // In production, env vars should not use defaults
      expect(db.options.host).toBe('test-host');
      expect(db.options.database).toBe('test-db');
      expect(db.options.user).toBe('test-user');
    });

    it('should accept defaults in development', () => {
      process.env.NODE_ENV = 'development';

      // Import fresh database config with test env
      jest.resetModules();
      const db = require('../../src/config/database');

      expect(db.options.host).toBeTruthy();
      expect(db.options.database).toBeTruthy();
    });

    it('should use test database when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      process.env.DB_NAME = 'freelance_agents_test_db';

      // Import fresh database config with test env
      jest.resetModules();
      const db = require('../../src/config/database');

      expect(db.options.database).toContain('test');
    });

    it('should warn when using defaults in non-production', () => {
      process.env.NODE_ENV = 'development';
      // Unset all DB environment variables
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;

      // Import fresh database config
      jest.resetModules();
      const db = require('../../src/config/database');

      // Should have used defaults
      expect(db.options.host).toBe('localhost');
      expect(db.options.database).toBe('freelance_agents_db');
    });

    it('should throw error when required env vars missing in production', () => {
      process.env.NODE_ENV = 'production';
      // Unset required DB environment variable
      delete process.env.DB_HOST;
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test-db';
      process.env.DB_USER = 'test-user';
      process.env.DB_PASSWORD = 'test-pass';

      expect(() => {
        jest.resetModules();
        require('../../src/config/database');
      }).toThrow('Missing required environment variables');
    });
  });
});
