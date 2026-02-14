import { test, expect } from '@playwright/test'

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate to login page', async ({ page }) => {
    await page.click('text=Sign In')
    await expect(page).toHaveURL(/.*\/login$/)
    await expect(page.getByText('Welcome Back')).toBeVisible()
  })

  test('should display login form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByText('Forgot password?')).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Password123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard$/, { timeout: 10000 })
    await expect(page.getByText(/dashboard/i)).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login')

    // Try to submit with empty form
    await page.click('button[type="submit"]')

    // Check for validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'WrongPassword')

    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    await expect(page).toHaveURL(/.*\/login$/)
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid email format/i)).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login')

    const passwordInput = page.getByLabel('Password')
    const toggleButton = page.getByRole('button', { name: /show password/i })

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should remember email when remember me is checked', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.getByLabel('Email')
    const rememberMeCheckbox = page.getByLabel('Remember me')

    await emailInput.fill('remember@example.com')
    await rememberMeCheckbox.check()
    await page.click('button[type="submit"]')

    // Simulate page reload or return visit
    await page.goto('/login')

    // Email should be remembered
    await expect(emailInput).toHaveValue('remember@example.com')
  })

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login')

    await page.click('text=Sign Up')
    await expect(page).toHaveURL(/.*\/register$/)
  })

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login')

    await page.click('text=Forgot password?')
    await expect(page).toHaveURL(/.*\/forgot-password$/)
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/login')

    // Tab through form fields
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Email')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password')).toBeFocused()

    // Submit with Enter key
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.keyboard.press('Enter')

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard$/, { timeout: 10000 })
  })

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/login')

    // First form field should have focus
    await expect(page.getByLabel('Email')).toBeFocused()

    // Focus should move to first error after submit
    await page.click('button[type="submit"]')
    await expect(page.getByLabel('Email')).toBeFocused()
  })

  test('should handle network errors', async ({ page }) => {
    // Mock offline mode
    await page.context().setOffline(true)

    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/network error/i)).toBeVisible()

    // Restore online mode
    await page.context().setOffline(false)
  })

  test('should redirect authenticated user to dashboard', async ({ page }) => {
    // Simulate authenticated state
    await page.goto('/login')
    await page.context().addCookies([
      {
        name: 'token',
        value: 'mock-jwt-token',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.reload()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard$/)
  })

  test('should clear auth state on logout', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')

    // Navigate to settings and logout
    await page.goto('/settings')
    await page.click('button:has-text("Logout")')

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login$/)
  })
})
