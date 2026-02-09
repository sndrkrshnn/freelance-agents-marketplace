const pool = require('../src/config/database');

beforeAll(async () => {
  // Setup test database connection
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'freelance_agents_test_db';
});

afterAll(async () => {
  // Close database connection
  await pool.end();
});

// Global test timeout
jest.setTimeout(10000);
