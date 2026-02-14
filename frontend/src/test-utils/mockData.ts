import { Agent, Task, Message, User } from '@/types'

// Mock User
export const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'client',
  name: 'Test User',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
  createdAt: new Date('2024-01-01'),
}

export const mockAgent: Agent = {
  id: 'agent-1',
  userId: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
  bio: 'Experienced AI agent developer',
  expertise: ['machine-learning', 'nlp', 'computer-vision'],
  hourlyRate: 75,
  rating: 4.8,
  reviewCount: 23,
  completedTasks: 45,
  availability: 'available',
  verified: true,
  createdAt: new Date('2024-01-01'),
}

export const mockTask: Task = {
  id: 'task-1',
  title: 'Build a React App',
  description: 'Need a single-page React app with modern UI',
  budget: 500,
  category: 'web-development',
  status: 'open',
  clientId: 'client-1',
  createdAt: new Date('2024-01-01'),
  deadline: new Date('2024-02-01'),
  requiredSkills: ['react', 'typescript', 'tailwindcss'],
  proposals: [],
  attachments: [],
}

export const mockMessage: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  recipientId: 'user-2',
  content: 'Hello, I am interested in your task',
  timestamp: new Date('2024-01-01'),
  read: false,
}

// Mock API responses
export const mockLoginResponse = {
  user: mockUser,
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
}

export const mockAgentsResponse = {
  agents: [mockAgent],
  total: 1,
  page: 1,
  pageSize: 10,
}

export const mockTasksResponse = {
  tasks: [mockTask],
  total: 1,
  page: 1,
  pageSize: 10,
}

export const mockMessagesResponse = {
  messages: [mockMessage],
  total: 1,
}

// Mock error responses
export const mockUnauthorizedError = {
  response: {
    status: 401,
    data: {
      message: 'Unauthorized',
    },
  },
}

export const mockNotFoundError = {
  response: {
    status: 404,
    data: {
      message: 'Resource not found',
    },
  },
}

export const mockValidationError = {
  response: {
    status: 400,
    data: {
      message: 'Validation error',
      errors: [
        {
          field: 'email',
          message: 'Invalid email format',
        },
      ],
    },
  },
}

// Helper functions
export const createMockAgents = (count: number): Agent[] =>
  Array.from({ length: count }, (_, i) => ({
    ...mockAgent,
    id: `agent-${i + 1}`,
    name: `Agent ${i + 1}`,
    email: `agent${i + 1}@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=agent${i + 1}`,
  }))

export const createMockTasks = (count: number): Task[] =>
  Array.from({ length: count }, (_, i) => ({
    ...mockTask,
    id: `task-${i + 1}`,
    title: `Task ${i + 1}`,
    budget: 100 + i * 100,
  }))

export const createMockMessages = (
  count: number,
  conversationId: string = 'conv-1'
): Message[] =>
  Array.from({ length: count }, (_, i) => ({
    ...mockMessage,
    id: `msg-${i + 1}`,
    conversationId,
    content: `Message ${i + 1}`,
    timestamp: new Date(Date.now() - i * 60000),
  }))
