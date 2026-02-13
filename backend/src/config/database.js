const { Pool } = require('pg');
const logger = require('./logger');

// Validate environment variables
const validateEnvVars = () => {
  const envVars = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };

  const missingVars = Object.entries(envVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Log in non-production if using defaults
  if (process.env.NODE_ENV !== 'production') {
    const usingDefaults = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (usingDefaults.length > 0) {
      logger.warn(`Using default values for: ${usingDefaults.join(', ')}`);
    }
  }

  return envVars;
};

const envVars = validateEnvVars();

const pool = new Pool({
  host: envVars.DB_HOST || 'localhost',
  port: parseInt(envVars.DB_PORT || '5432', 10),
  database: envVars.DB_NAME || 'freelance_agents_db',
  user: envVars.DB_USER || 'postgres',
  password: envVars.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  logger.info('Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  // Don't use process.exit - let the application handle the error gracefully
  throw new Error(`Unexpected database error: ${err.message}`);
});

/**
 * Test database connection
 * @returns {Promise<void>}
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database test connection successful:', result.rows[0]);
  } catch (error) {
    logger.error('Database test connection failed:', error);
    throw error;
  }
};

/**
 * Check if database is healthy
 * @returns {Promise<boolean>}
 */
const isHealthy = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

// Export pool as the main export for backward compatibility
// also attach helper methods to pool object
pool.testConnection = testConnection;
pool.isHealthy = isHealthy;

module.exports = pool;
