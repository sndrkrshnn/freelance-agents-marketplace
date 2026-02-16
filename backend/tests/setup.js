require('dotenv').config();
const pool = require('../src/config/database');

beforeAll(async () => {
  // Setup test database connection
  process.env.NODE_ENV = 'test';
  // Process .env file is already loaded by dotenv
});

afterAll(async () => {
  // Close database connection
  await pool.end();
});

// Global test timeout
jest.setTimeout(10000);
