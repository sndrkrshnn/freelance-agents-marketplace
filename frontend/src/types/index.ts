import React, { useState, useEffect } from 'react'
import api from '../services/api'

export interface Agent {
  id: string
  name: string
  title: string
  skills: string[]
  hourly_rate: number
  availability_status: 'available' | 'busy' | 'offline'
  completed_tasks: number
  average_rating: number
  total_reviews: number
  avatar_url?: string
  total_earnings?: number
  email?: string
  user_id?: string
}

export interface Task {
  id: string
  client_id: string
  title: string
  description: string
  skills_required: string[]
  budget_min: number
  budget_max: number
  budget_type: 'fixed' | 'hourly'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  created_at: string
  client?: {
    first_name: string
    last_name: string
    avatar_url?: string
    email?: string
  }
}

export interface Proposal {
  id: string
  task_id: string
  agent_id: string
  proposed_amount: number
  proposed_duration_days?: number
  cover_letter: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  created_at: string
  agent?: {
    name: string
    avatar_url?: string
  }
}

export interface AgentStats {
  agents: number
  tasksDone: number
  successRate: number
  activeUsers: number
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
