import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test-utils'
import LoginForm from '../LoginForm'

// Mock API service
vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form correctly', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
  })

  it('displays validation errors for empty fields', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockResolvedValue({ data: mockLoginResponse })

    render(<LoginForm />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('displays validation error for invalid email', async () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const { api } = await import('@/services/api')
    const mockOnSuccess = vi.fn()

    vi.mocked(api.post).mockResolvedValue({
      data: {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      },
    })

    render(<LoginForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockOnSuccess).toHaveBeenCalledWith(
        {
          id: 'user-1',
          email: 'test@example.com',
          role: 'client',
          name: 'Test User',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
          createdAt: new Date('2024-01-01'),
        },
        'mock-jwt-token'
      )
    })
  })

  it('handles login error', async () => {
    const { api } = await import('@/services/api')

    vi.mocked(api.post).mockRejectedValue({
      response: {
        status: 401,
        data: {
          message: 'Invalid credentials',
        },
      },
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('toggles password visibility', () => {
    render(<LoginForm />)

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    const toggleButton = screen.getByRole('button', {
      name: /show password/i,
    })

    expect(passwordInput.type).toBe('password')

    fireEvent.click(toggleButton)

    expect(passwordInput.type).toBe('text')

    fireEvent.click(toggleButton)

    expect(passwordInput.type).toBe('password')
  })

  it('has accessible form elements', () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('required')
    expect(submitButton).toBeEnabled()
  })
})
