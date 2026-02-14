import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test-utils'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock pages
vi.mock('@/pages/Register', () => ({
  default: ({ onRegister }: { onRegister: (data: any) => void }) => (
    <div>
      <input
        id="name"
        type="text"
        placeholder="Name"
        onChange={e =>
          onRegister({
            name: e.target.value,
            email: 'test@example.com',
            password: 'password123',
            role: 'client',
          })
        }
      />
      <button onClick={() => onRegister({ name: 'Test User' })}>
        Register
      </button>
    </div>
  ),
}))

vi.mock('@/pages/Dashboard', () => ({
  default: () => <div>Dashboard</div>,
}))

// Mock API
vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('Registration to Dashboard Flow', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('completes registration flow and navigates to dashboard', async () => {
    const { api } = await import('@/services/api')

    vi.mocked(api.post).mockResolvedValue({
      data: {
        user: mockUser,
        token: 'mock-jwt-token',
      },
    })

    const onRegister = vi.fn()

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<div data-testid="register-page"></div>} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page"></div>} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    )

    // User fills registration form
    const nameInput = screen.getByPlaceholderText('Name')
    fireEvent.change(nameInput, { target: { value: 'Test User' } })

    const registerButton = screen.getByText('Register')
    fireEvent.click(registerButton)

    // Verify API call
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'client',
      }))
    })

    // Verify navigation
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })
  })

  it('displays validation errors for invalid registration data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div data-testid="register-page">
            <button type="submit">Register</button>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    )

    const registerButton = screen.getByText('Register')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('handles registration error', async () => {
    const { api } = await import('@/services/api')

    vi.mocked(api.post).mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: 'Email already exists',
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div data-testid="register-page">
            <button type="submit">Register</button>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    )

    const registerButton = screen.getByText('Register')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })

    // Ensure no navigation occurred
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument()
  })
})
