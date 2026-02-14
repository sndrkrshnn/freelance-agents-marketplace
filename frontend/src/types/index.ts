// User Types
export type UserType = 'client' | 'agent' | 'admin';

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  userType: UserType;
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    token: string;
  };
}

// Agent Profile Types
export interface AgentProfile {
  id?: string;
  user_id?: string;
  title?: string;
  skills: string[];
  portfolio_url?: string;
  github_url?: string;
  linkedin_url?: string;
  website_url?: string;
  hourly_rate?: number;
  availability_status: 'available' | 'busy' | 'offline';
  experience_years?: number;
  education?: string;
  certifications?: string[];
  completed_tasks?: number;
  total_earnings?: number;
  average_rating?: number;
  review_count?: number;
}

export interface AgentStats {
  average_rating: number;
  total_reviews: number;
  positive_reviews?: number;
  negative_reviews?: number;
}

// Task Types
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export type BudgetType = 'fixed' | 'hourly';
export type Complexity = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  client_id: string;
  client_first_name?: string;
  client_last_name?: string;
  client_avatar?: string;
  client_email?: string;
  title: string;
  description: string;
  skills_required: string[];
  budget_min?: number;
  budget_max?: number;
  budget_type: BudgetType;
  estimated_hours?: number;
  deadline?: string;
  status: TaskStatus;
  complexity: Complexity;
  attachments?: string[];
  created_at: string;
  updated_at: string;
  proposal_count?: number;
  client_rating?: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  skillsRequired: string[];
  budgetMin?: number;
  budgetMax?: number;
  budgetType: BudgetType;
  estimatedHours?: number;
  deadline?: string;
  complexity?: Complexity;
  attachments?: string[];
}

// Proposal Types
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Proposal {
  id: string;
  task_id: string;
  agent_id: string;
  proposed_amount: number;
  proposed_duration_days?: number;
  cover_letter: string;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  agent_first_name?: string;
  agent_last_name?: string;
  agent_avatar?: string;
  agent_title?: string;
  agent_hourly_rate?: number;
  agent_skills?: string[];
  agent_rating?: number;
  agent_review_count?: number;
  task_title?: string;
  budget_min?: number;
  budget_max?: number;
  task_skills?: string[];
}

export interface CreateProposalInput {
  taskId: string;
  proposedAmount: number;
  proposedDurationDays?: number;
  coverLetter: string;
}

// Payment Types
export type PaymentStatus = 'pending' | 'escrow' | 'released' | 'refunded' | 'failed';
export type PaymentType = 'deposit' | 'release' | 'refund' | 'platform_fee';

export interface Payment {
  id: string;
  task_id?: string;
  client_id: string;
  agent_id: string;
  amount: number;
  fee_amount: number;
  stripe_payment_intent_id?: string;
  status: PaymentStatus;
  payment_type: PaymentType;
  created_at: string;
  updated_at: string;
  client_first_name?: string;
  client_last_name?: string;
  agent_first_name?: string;
  agent_last_name?: string;
  task_title?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  payment_id?: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description: string;
  balance_after: number;
  created_at: string;
}

// Review Types
export interface AgentRating {
  id: string;
  agent_id: string;
  client_id: string;
  task_id?: string;
  rating: number;
  review: string;
  communication_rating?: number;
  quality_rating?: number;
  timeliness_rating?: number;
  created_at: string;
  client_first_name?: string;
  client_last_name?: string;
  client_avatar?: string;
  task_title?: string;
}

export interface ClientRating {
  id: string;
  client_id: string;
  agent_id: string;
  task_id?: string;
  rating: number;
  review: string;
  payment_promptness?: number;
  clarity_rating?: number;
  created_at: string;
  agent_first_name?: string;
  agent_last_name?: string;
  agent_avatar?: string;
  task_title?: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

// Message Types
export interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  attachment_url?: string;
  created_at: string;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_avatar?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
}

// Admin Types
export interface DashboardStats {
  users: {
    total: number;
    client?: number;
    agent?: number;
    admin?: number;
  };
  tasks: {
    total: number;
    [status: string]: number;
  };
  payments: {
    totalRevenue: number;
    platformFees: number;
    [status: string]: {
      count: number;
      totalAmount: number;
    };
  };
  recentUsers?: Partial<User>[];
  recentTasks?: Partial<Task>[];
}

// Match Types
export interface MatchedAgent extends AgentProfile {
  matchScore: number;
  matchBreakdown: {
    skillsMatch: number;
    ratingScore: number;
    experienceScore: number;
    tasksScore: number;
    priceScore: number;
  };
  matchPercentage: number;
}

export interface MatchedTask extends Task {
  matchScore: number;
  matchBreakdown: {
    skillsMatch: number;
    budgetScore: number;
    complexityScore: number;
    clientScore: number;
  };
  matchPercentage: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  [key: string]: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Filter Types
export interface TaskFilters {
  status?: TaskStatus;
  skills?: string[];
  budgetMin?: number;
  budgetMax?: number;
  sort?: 'newest' | 'oldest' | 'budget_high' | 'budget_low' | 'deadline';
  page?: number;
  limit?: number;
}

export interface AgentFilters {
  skills?: string[];
  minRating?: number;
  maxRate?: number;
  availability?: 'available' | 'busy' | 'offline';
  sort?: 'rating' | 'rate_low' | 'rate_high' | 'newest';
  page?: number;
  limit?: number;
}
