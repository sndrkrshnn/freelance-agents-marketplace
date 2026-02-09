import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import {
  mockUser,
  mockAgent,
  mockTask,
  mockMessage,
  mockLoginResponse,
  mockAgentsResponse,
  mockTasksResponse,
  mockMessagesResponse,
} from './mockData'

// Mock API handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json(mockLoginResponse)
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token',
    })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      user: mockUser,
      token: 'new-jwt-token',
    })
  }),

  // User endpoints
  http.get('/api/users/me', () => {
    return HttpResponse.json(mockUser)
  }),

  http.put('/api/users/profile', () => {
    return HttpResponse.json(mockUser)
  }),

  // Agent endpoints
  http.get('/api/agents', () => {
    return HttpResponse.json(mockAgentsResponse)
  }),

  http.get('/api/agents/:id', ({ params }) => {
    if (params.id === mockAgent.id) {
      return HttpResponse.json(mockAgent)
    }
    return HttpResponse.json({ message: 'Agent not found' }, { status: 404 })
  }),

  // Task endpoints
  http.get('/api/tasks', () => {
    return HttpResponse.json(mockTasksResponse)
  }),

  http.get('/api/tasks/:id', ({ params }) => {
    if (params.id === mockTask.id) {
      return HttpResponse.json(mockTask)
    }
    return HttpResponse.json({ message: 'Task not found' }, { status: 404 })
  }),

  http.post('/api/tasks', () => {
    return HttpResponse.json(mockTask)
  }),

  // Message endpoints
  http.get('/api/messages', () => {
    return HttpResponse.json(mockMessagesResponse)
  }),

  http.get('/api/messages/conversations/:id', () => {
    return HttpResponse.json(mockMessagesResponse)
  }),

  http.post('/api/messages', () => {
    return HttpResponse.json(mockMessage)
  }),

  // Admin endpoints
  http.get('/api/admin/stats', () => {
    return HttpResponse.json({
      totalUsers: 100,
      totalAgents: 50,
      totalTasks: 75,
      totalRevenue: 50000,
    })
  }),
]

// Setup MSW worker
export const server = setupWorker(...handlers)
