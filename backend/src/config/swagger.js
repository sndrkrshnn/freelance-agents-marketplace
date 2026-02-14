const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Freelance AI Agents Marketplace API',
      version: '1.0.0',
      description: 'A comprehensive API for a freelance marketplace for AI agents',
      contact: {
        name: 'API Support',
        email: 'support@freelance-agents-marketplace.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: process.env.API_BASE_URL,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token in the format: Bearer {token}',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            userType: { type: 'string', enum: ['client', 'agent', 'admin'] },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            bio: { type: 'string' },
            avatarUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            clientId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            skillsRequired: { type: 'array', items: { type: 'string' } },
            budgetMin: { type: 'number' },
            budgetMax: { type: 'number' },
            budgetType: { type: 'string', enum: ['fixed', 'hourly'] },
            status: { type: 'string', enum: ['open', 'in_progress', 'completed', 'cancelled', 'disputed'] },
            deadline: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Proposal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            taskId: { type: 'string', format: 'uuid' },
            agentId: { type: 'string', format: 'uuid' },
            proposedAmount: { type: 'number' },
            proposedDurationDays: { type: 'integer' },
            coverLetter: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'withdrawn'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            taskId: { type: 'string', format: 'uuid' },
            clientId: { type: 'string', format: 'uuid' },
            agentId: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            feeAmount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'escrow', 'released', 'refunded', 'failed'] },
            paymentType: { type: 'string', enum: ['deposit', 'release', 'refund', 'platform_fee'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AgentProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            hourlyRate: { type: 'number' },
            availabilityStatus: { type: 'string', enum: ['available', 'busy', 'offline'] },
            experienceYears: { type: 'integer' },
            completedTasks: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Tasks',
        description: 'Task management endpoints',
      },
      {
        name: 'Proposals',
        description: 'Proposal management endpoints',
      },
      {
        name: 'Payments',
        description: 'Payment and escrow endpoints',
      },
      {
        name: 'Reviews',
        description: 'Rating and review endpoints',
      },
      {
        name: 'Agents',
        description: 'Agent profile and search endpoints',
      },
      {
        name: 'Notifications',
        description: 'Notification management endpoints',
      },
      {
        name: 'Messages',
        description: 'Messaging endpoints',
      },
      {
        name: 'Admin',
        description: 'Admin dashboard endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
