import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../useAuth'

// Mock user data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'client',
  name: 'Test User',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
  createdAt: new Date(),
}

// Mock API service
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with no user', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('loads user from localStorage on mount', () => {
    const savedUser = JSON.stringify(mockUser)
    localStorage.setItem('user', savedUser)
    localStorage.setItem('token', 'mock-token')

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe('mock-token')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('logs in user with valid credentials', async () => {
    const { api } = await import('@/services/api')

    vi.mocked(api.post).mockResolvedValue({
      data: {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe('mock-jwt-token')
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser))
      expect(localStorage.getItem('token')).toBe('mock-jwt-token')
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('handles login error', async () => {
    const { api } = await import('@/services/api')

    const errorMessage = 'Invalid credentials'
    vi.mocked(api.post).mockRejectedValue({
      response: {
        data: { message: errorMessage },
      },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await expect(
        result.current.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow(errorMessage)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
  })

  it('registers new user', async () => {
    const { api } = await import('@/services/api')

    const newUser = {
      id: 'user-2',
      email: 'new@example.com',
      role: 'client',
      name: 'New User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=new',
      createdAt: new Date(),
    }

    vi.mocked(api.post).mockResolvedValue({
      data: {
        user: newUser,
        token: 'new-jwt-token',
      },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        role: 'client',
      })
    })

    waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.any(Object))
      expect(result.current.user).toEqual(newUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('logs out user', async () => {
    // Set up logged in state
    localStorage.setItem('user', JSON.stringify(mockUser))
    localStorage.setItem('token', 'mock-token')

    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('updates user profile', async () => {
    const { api } = await import('@/services/api')

    const updatedUser = { ...mockUser, name: 'Updated Name' }
    vi.mocked(api.put).mockResolvedValue({
      data: updatedUser,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    // Set initial user
    result.current.user = mockUser

    await act(async () => {
      await result.current.updateProfile({ name: 'Updated Name' })
    })

    waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/profile', {
        name: 'Updated Name',
      })
      expect(result.current.user).toEqual(updatedUser)
    })
  })

  it('returns correct authentication state', () => {
    localStorage.setItem('user', JSON.stringify(mockUser))
    localStorage.setItem('token', 'mock-token')

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('handles token refresh', async () => {
    const { api } = await import('@/services/api')

    vi.mocked(api.post).mockResolvedValue({
      data: {
        user: mockUser,
        token: 'new-jwt-token',
      },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    localStorage.setItem('refreshToken', 'mock-refresh-token')

    await act(async () => {
      await result.current.refreshToken()
    })

    waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'mock-refresh-token',
      })
      expect(result.current.token).toBe('new-jwt-token')
    })
  })
})
