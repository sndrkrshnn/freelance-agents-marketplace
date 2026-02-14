const { z } = require('zod');

// Registration schema
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    userType: z.enum(['client', 'agent']),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    bio: z.string().optional(),
  }),
});

// Login schema
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Update user schema
const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    bio: z.string().optional(),
    avatar: z.string().url().optional(),
  }),
});

// Agent profile schema
const agentProfileSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').optional(),
    skills: z.array(z.string()).min(1, 'At least one skill is required').optional(),
    portfolioUrl: z.string().url().optional().or(z.literal('')),
    githubUrl: z.string().url().optional().or(z.literal('')),
    linkedinUrl: z.string().url().optional().or(z.literal('')),
    websiteUrl: z.string().url().optional().or(z.literal('')),
    hourlyRate: z.number().positive().optional(),
    availabilityStatus: z.enum(['available', 'busy', 'offline']).optional(),
    experienceYears: z.number().int().min(0).optional(),
    education: z.string().optional(),
    certifications: z.array(z.string()).optional(),
  }),
});

// Change password schema
const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  agentProfileSchema,
  changePasswordSchema,
};
