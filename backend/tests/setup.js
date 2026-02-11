const pool = require('../src/config/database');

beforeAll(async () => {
  // Setup test database connection
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'freelance_agents_test_db';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_USER = process.env.DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

  // Verify environment variables are set
  const requiredEnvVars = ['NODE_ENV', 'DB_NAME', 'DB_HOST', 'DB_PORT', 'DB_USER'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  }

  // Test database connection if possible
  try {
    if (pool.isHealthy && typeof pool.isHealthy === 'function') {
      await pool.isHealthy();
    }
  } catch (error) {
    console.warn('Warning: Could not establish database connection for tests:', error.message);
  }
});

afterAll(async () => {
  // Close database connection
  if (pool && typeof pool.end === 'function') {
    await pool.end().catch(err => {
      console.warn('Warning: Error closing database connection:', err.message);
    });
  }
});

// Global test timeout
jest.setTimeout(10000);
