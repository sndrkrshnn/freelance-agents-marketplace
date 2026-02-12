import api from './api'
import type { Agent, Task, Proposal, AgentStats, ApiResponse, PaginatedResponse } from '../types'

export const taskService = {
  /**
   * Get all tasks with filters
   */
  async listTasks(filters?: {
    status?: string
    skills?: string[]
    budgetMin?: number
    budgetMax?: number
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Task>> {
    return api.get<PaginatedResponse<Task>>('/tasks', filters)
  },

  /**
   * Get task by ID
   */
  async getTask(id: string): Promise<ApiResponse<Task>> {
    return api.get<ApiResponse<Task>>(`/tasks/${id}`)
  },

  /**
   * Create a new task
   */
  async createTask(taskData: {
    title: string
    description: string
    skillsRequired: string[]
    budgetMin: number
    budgetMax: number
    budgetType: 'fixed' | 'hourly'
    estimatedHours?: number
    deadline?: string
    complexity?: 'low' | 'medium' | 'high'
  }): Promise<ApiResponse<Task>> {
    return api.post<ApiResponse<Task>>('/tasks', taskData)
  },

  /**
   * Update a task
   */
  async updateTask(id: string, taskData: Partial<Task>): Promise<ApiResponse<Task>> {
    return api.put<ApiResponse<Task>>(`/tasks/${id}`, taskData)
  },

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return api.delete<ApiResponse<void>>(`/tasks/${id}`)
  },

  /**
   * Get my tasks (tasks created by current user)
   */
  async getMyTasks(status?: string): Promise<PaginatedResponse<Task>> {
    return api.get<PaginatedResponse<Task>>('/tasks/my-tasks', { status })
  },

  /**
   * Search tasks
   */
  async searchTasks(query: string, page = 1, limit = 10): Promise<PaginatedResponse<Task>> {
    return api.get<PaginatedResponse<Task>>('/tasks/search', { q: query, page, limit })
  },

  /**
   * Get task proposals
   */
  async getTaskProposals(taskId: string): Promise<ApiResponse<Proposal[]>> {
    return api.get<ApiResponse<Proposal[]>>(`/tasks/${taskId}/proposals`)
  },

  /**
   * Get task matches (matched agents)
   */
  async getTaskMatches(taskId: string): Promise<ApiResponse<Agent[]>> {
    return api.get<ApiResponse<Agent[]>>(`/tasks/${taskId}/matches`)
  },
}

export const agentService = {
  /**
   * Get all agents
   */
  async listAgents(filters?: {
    skills?: string[]
    availabilityStatus?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Agent>> {
    return api.get<PaginatedResponse<Agent>>('/agents', filters)
  },

  /**
   * Get agent by ID
   */
  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    return api.get<ApiResponse<Agent>>(`/agents/${id}`)
  },

  /**
   * Search agents
   */
  async searchAgents(query: string): Promise<ApiResponse<Agent[]>> {
    return api.get<ApiResponse<Agent[]>>('/agents/search', { q: query })
  },

  /**
   * Get agent stats
   */
  async getStats(): Promise<ApiResponse<AgentStats>> {
    return api.get<ApiResponse<AgentStats>>('/agents/stats')
  },
}

export const proposalService = {
  /**
   * Create a proposal for a task
   */
  async createProposal(taskId: string, proposalData: {
    proposedAmount: number
    proposedDurationDays?: number
    coverLetter: string
  }): Promise<ApiResponse<Proposal>> {
    return api.post<ApiResponse<Proposal>>(`/proposals/${taskId}`, proposalData)
  },

  /**
   * Get proposal by ID
   */
  async getProposal(id: string): Promise<ApiResponse<Proposal>> {
    return api.get<ApiResponse<Proposal>>(`/proposals/${id}`)
  },

  /**
   * Update proposal
   */
  async updateProposal(id: string, data: Partial<Proposal>): Promise<ApiResponse<Proposal>> {
    return api.put<ApiResponse<Proposal>>(`/proposals/${id}`, data)
  },

  /**
   * Delete proposal
   */
  async deleteProposal(id: string): Promise<ApiResponse<void>> {
    return api.delete<ApiResponse<void>>(`/proposals/${id}`)
  },

  /**
   * Accept a proposal
   */
  async acceptProposal(id: string): Promise<ApiResponse<Proposal>> {
    return api.put<ApiResponse<Proposal>>(`/proposals/${id}/accept`)
  },

  /**
   * Reject a proposal
   */
  async rejectProposal(id: string): Promise<ApiResponse<Proposal>> {
    return api.put<ApiResponse<Proposal>>(`/proposals/${id}/reject`)
  },
}

export const authService = {
  /**
   * Register a new user
   */
  async register(userData: {
    email: string
    password: string
    userType: 'client' | 'agent'
    firstName: string
    lastName: string
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    return api.post<ApiResponse<{ token: string; user: any }>>('/auth/register', userData)
  },

  /**
   * Login user
   */
  async login(credentials: {
    email: string
    password: string
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    return api.post<ApiResponse<{ token: string; user: any }>>('/auth/login', credentials)
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    return api.post<ApiResponse<void>>('/auth/logout')
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<any>> {
    return api.get<ApiResponse<any>>('/auth/me')
  },
}

export default {
  task: taskService,
  agent: agentService,
  proposal: proposalService,
  auth: authService,
}
