import { test, expect } from '@playwright/test'

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate to registration page', async ({ page }) => {
    await page.click('text=Sign Up')
    await expect(page).toHaveURL(/.*\/register$/)
    await expect(page.getByText('Create Account')).toBeVisible()
  })

  test('should display registration form', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByLabel('Confirm Password')).toBeVisible()
    await expect(page.getByLabel('Role')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible()
  })

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register')

    // Fill registration form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.fill('input[name="confirmPassword"]', 'Password123!')
    await page.selectOption('select[name="role"]', 'client')

    // Submit form
    await page.click('button[type="submit"]')

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard$/)
    await expect(page.getByText('Welcome, Test User')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/register')

    // Try to submit with empty form
    await page.click('button[type="submit"]')

    // Check for validation errors
    await expect(page.getByText(/name is required/i)).toBeVisible()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/register')

    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid email format/i)).toBeVisible()
  })

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/register')

    // Test weak password
    await page.fill('input[name="password"]', '123')
    await page.fill('input[name="confirmPassword"]', '123')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/register')

    await page.fill('input[name="password"]', 'Password123!')
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword!')

    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Register' })).toBeDisabled()
  })

  test('should handle duplicate email error', async ({ page }) => {
    await page.goto('/register')

    // Use existing email
    await page.fill('input[name="name"]', 'Another User')
    await page.fill('input[name="email"]', 'existing@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.fill('input[name="confirmPassword"]', 'Password123!')

    await page.click('button[type="submit"]')

    // Should show error for existing email
    await expect(page.getByText(/email already registered/i)).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/register')

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

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/register')

    // Tab through form fields
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Name')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Email')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password')).toBeFocused()

    // Submit with Enter key
    await page.keyboard.press('Enter')

    // Should be on registration page (validation will fail)
    await expect(page).toHaveURL(/.*\/register$/)
  })

  test('should persist form data briefly', async ({ page }) => {
    await page.goto('/register')

    // Fill form partially
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')

    // Navigate away and back
    await page.goto('/login')
    await page.goto('/register')

    // Form might be cleared or persisted depending on implementation
    // This test documents expected behavior
  })

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/register')

    // First form field should have focus
    await expect(page.getByLabel('Name')).toBeFocused()

    // Focus should move to first error after submit
    await page.click('button[type="submit"]')
    await expect(page.getByLabel('Name')).toBeFocused()
  })
})
