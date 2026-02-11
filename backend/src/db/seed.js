const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateId } = require('../utils/helpers');
const logger = require('../config/logger');

async function seedDatabase() {
  try {
    logger.info('Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, user_type, first_name, last_name, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@freelance-agents.com', adminPassword, 'admin', 'Admin', 'User', true, true]
    );

    // Create sample agents
    const agents = [
      { email: 'agent1@example.com', name: 'John', lastName: 'Doe', skills: ['Python', 'Machine Learning', 'NLP'], rate: 75 },
      { email: 'agent2@example.com', name: 'Jane', lastName: 'Smith', skills: ['JavaScript', 'React', 'Node.js'], rate: 85 },
      { email: 'agent3@example.com', name: 'Bob', lastName: 'Wilson', skills: ['Data Science', 'Python', 'Pandas'], rate: 65 },
      { email: 'agent4@example.com', name: 'Alice', lastName: 'Johnson', skills: ['AI Development', 'TensorFlow', 'PyTorch'], rate: 95 },
      { email: 'agent5@example.com', name: 'Charlie', lastName: 'Brown', skills: ['Web Scraping', 'Python', 'Selenium'], rate: 55 },
    ];

    for (const agent of agents) {
      const userId = generateId();
      const password = await bcrypt.hash('password123', 12);

      await pool.query(
        `INSERT INTO users (id, email, password_hash, user_type, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [userId, agent.email, password, 'agent', agent.name, agent.lastName]
      );

      await pool.query(
        `INSERT INTO agent_profiles (id, user_id, title, skills, hourly_rate, availability_status, experience_years)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO NOTHING`,
        [generateId(), userId, 'AI Agent', agent.skills, agent.rate, 'available', Math.floor(Math.random() * 10) + 2]
      );
    }

    // Create sample clients
    const clients = [
      { email: 'client1@example.com', name: 'Client', lastName: 'One' },
      { email: 'client2@example.com', name: 'Client', lastName: 'Two' },
      { email: 'client3@example.com', name: 'Client', lastName: 'Three' },
    ];

    for (const client of clients) {
      const userId = generateId();
      const password = await bcrypt.hash('password123', 12);

      await pool.query(
        `INSERT INTO users (email, password_hash, user_type, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [client.email, password, 'client', client.name, client.lastName]
      );
    }

    // Create sample tasks
    const tasks = [
      {
        title: 'Build a Chatbot with NLP',
        description: 'Need a chatbot that can understand natural language queries and provide helpful responses. Should integrate with our existing messaging platform.',
        skills: ['Python', 'NLP', 'Machine Learning'],
        budgetMin: 500,
        budgetMax: 1000,
        type: 'fixed',
      },
      {
        title: 'Data Analysis Dashboard',
        description: 'Create an interactive dashboard for visualizing sales data. Should include charts, filters, and export functionality.',
        skills: ['JavaScript', 'React', 'Data Visualization'],
        budgetMin: 300,
        budgetMax: 600,
        type: 'fixed',
      },
      {
        title: 'AI Image Classification Model',
        description: 'Train a machine learning model to classify images into multiple categories. Dataset will be provided.',
        skills: ['Python', 'TensorFlow', 'Computer Vision'],
        budgetMin: 800,
        budgetMax: 1500,
        type: 'fixed',
      },
      {
        title: 'Web Scraper for E-commerce Data',
        description: 'Develop a web scraper to extract product information from multiple e-commerce sites. Data should be saved to a database.',
        skills: ['Python', 'Web Scraping', 'Data Processing'],
        budgetMin: 200,
        budgetMax: 400,
        type: 'fixed',
      },
      {
        title: 'React Frontend for AI API',
        description: 'Build a modern React frontend that connects to our AI backend API. Should be responsive and user-friendly.',
        skills: ['React', 'JavaScript', 'API Integration'],
        budgetMin: 400,
        budgetMax: 700,
        type: 'fixed',
      },
    ];

    // Get a client ID for the tasks
    const clientResult = await pool.query('SELECT id FROM users WHERE user_type = \'client\' LIMIT 1');
    const clientId = clientResult.rows[0]?.id;

    for (const task of tasks) {
      if (clientId) {
        await pool.query(
          `INSERT INTO tasks (id, client_id, title, description, skills_required, budget_min, budget_max, budget_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [generateId(), clientId, task.title, task.description, task.skills, task.budgetMin, task.budgetMax, task.type, 'open']
        );
      }
    }

    logger.info('Database seeding completed successfully');
    logger.info('');
    logger.info('Sample accounts:');
    logger.info('Admin: admin@freelance-agents.com / admin123');
    logger.info('Agents: agent1@example.com / password123 (agent1-5)');
    logger.info('Clients: client1@example.com / password123 (client1-3)');

    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
