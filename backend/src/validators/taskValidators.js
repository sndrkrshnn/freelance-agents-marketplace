const { z } = require('zod');

// Create task schema
const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(10, 'Title must be at least 10 characters').max(200),
    description: z.string().min(50, 'Description must be at least 50 characters'),
    skillsRequired: z.array(z.string()).min(1, 'At least one skill is required'),
    budgetMin: z.number().positive().optional(),
    budgetMax: z.number().positive().optional(),
    budgetType: z.enum(['fixed', 'hourly']),
    estimatedHours: z.number().int().positive().optional(),
    deadline: z.string().datetime().optional(),
    complexity: z.enum(['low', 'medium', 'high']).optional(),
    attachments: z.array(z.string().url()).optional(),
  }).refine((data) => {
    if (data.budgetMin && data.budgetMax) {
      return data.budgetMin <= data.budgetMax;
    }
    return true;
  }, {
    message: 'Minimum budget cannot be greater than maximum budget',
    path: ['budgetMin'],
  }),
});

// Update task schema
const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(10).max(200).optional(),
    description: z.string().min(50).optional(),
    skillsRequired: z.array(z.string()).min(1).optional(),
    budgetMin: z.number().positive().optional(),
    budgetMax: z.number().positive().optional(),
    estimatedHours: z.number().int().positive().optional(),
    deadline: z.string().datetime().optional(),
    complexity: z.enum(['low', 'medium', 'high']).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled', 'disputed']).optional(),
  }).refine((data) => {
    if (data.budgetMin && data.budgetMax) {
      return data.budgetMin <= data.budgetMax;
    }
    return true;
  }),
});

// Create proposal schema
const createProposalSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    proposedAmount: z.number().positive('Amount must be positive'),
    proposedDurationDays: z.number().int().positive().optional(),
    coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters'),
  }),
});

// Update proposal schema
const updateProposalSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid proposal ID'),
  }),
  body: z.object({
    status: z.enum(['accepted', 'rejected', 'withdrawn']),
  }),
});

// Create review schema
const createReviewSchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid('Invalid user ID'),
    taskId: z.string().uuid('Invalid task ID'),
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    review: z.string().min(20, 'Review must be at least 20 characters').max(1000),
    communicationRating: z.number().int().min(1).max(5).optional(),
    qualityRating: z.number().int().min(1).max(5).optional(),
    timelinessRating: z.number().int().min(1).max(5).optional(),
  }),
});

// Query params for tasks listing
const listTasksSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => parseInt(val) || 1),
    limit: z.string().optional().transform((val) => parseInt(val) || 10),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled', 'disputed']).optional(),
    skills: z.string().optional().transform((val) => val ? val.split(',') : []),
    budgetMin: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    budgetMax: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    sort: z.enum(['newest', 'oldest', 'budget_high', 'budget_low', 'deadline']).optional(),
  }),
});

// Query params for agents listing
const listAgentsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => parseInt(val) || 1),
    limit: z.string().optional().transform((val) => parseInt(val) || 10),
    skills: z.string().optional().transform((val) => val ? val.split(',') : []),
    minRating: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    maxRate: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    availability: z.enum(['available', 'busy', 'offline']).optional(),
    sort: z.enum(['rating', 'rate_low', 'rate_high', 'newest']).optional(),
  }),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  createProposalSchema,
  updateProposalSchema,
  createReviewSchema,
  listTasksSchema,
  listAgentsSchema,
};
