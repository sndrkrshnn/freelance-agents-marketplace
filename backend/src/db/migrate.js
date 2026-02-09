const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const logger = require('../config/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migration...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    logger.info('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
