import { test, expect } from '@playwright/test'

test.describe('Task Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'client@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*\/dashboard$/)
  })

  test('should navigate to create task page', async ({ page }) => {
    await page.click('text=Post a Task')
    await expect(page).toHaveURL(/.*\/tasks\/new$/)
    await expect(page.getByText('Create New Task')).toBeVisible()
  })

  test('should display task creation form', async ({ page }) => {
    await page.goto('/tasks/new')

    await expect(page.getByLabel('Title')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Budget')).toBeVisible()
    await expect(page.getByLabel('Category')).toBeVisible()
    await expect(page.getByLabel('Deadline')).toBeVisible()
    await expect(page.getByLabel('Skills')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Post Task' })).toBeVisible()
  })

  test('should create and post a new task', async ({ page }) => {
    await page.goto('/tasks/new')

    // Fill task form
    const taskTitle = `Build a React App - ${Date.now()}`
    await page.fill('input[name="title"]', taskTitle)
    await page.fill('textarea[name="description"]', 'Need a single-page React app with modern UI')
    await page.fill('input[name="budget"]', '500')
    await page.selectOption('select[name="category"]', 'web-development')
    await page.fill('input[name="deadline"]', '2024-12-31')

    // Add skills
    await page.fill('input[name="skills"]', 'React, TypeScript, TailwindCSS')

    // Submit task
    await page.click('button[type="submit"]')

    // Verify task was created and redirected to task details
    await expect(page).toHaveURL(/.*\/tasks\/[\w]+$/)
    await expect(page.getByText(taskTitle)).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/tasks/new')

    // Try to submit with empty form
    await page.click('button[type="submit"]')

    // Check for validation errors
    await expect(page.getByText(/title is required/i)).toBeVisible()
    await expect(page.getByText(/description is required/i)).toBeVisible()
    await expect(page.getByText(/budget is required/i)).toBeVisible()
    await expect(page.getByText(/category is required/i)).toBeVisible()
  })

  test('should validate budget range', async ({ page }) => {
    await page.goto('/tasks/new')

    await page.fill('input[name="budget"]', '10') // Too low

    await expect(page.getByText(/budget must be at least \$50/i)).toBeVisible()
  })

  test('should validate description length', async ({ page }) => {
    await page.goto('/tasks/new')

    await page.fill('textarea[name="description"]', 'Too short')

    await expect(page.getByText(/description must be at least 50 characters/i)).toBeVisible()
  })

  test('should accept file attachments', async ({ page }) => {
    await page.goto('/tasks/new')

    // Fill required fields first
    await page.fill('input[name="title"]', 'Task with attachments')
    await page.fill('textarea[name="description"]', 'Description with enough characters to meet minimum requirements.')
    await page.fill('input[name="budget"]', '500')
    await page.selectOption('select[name="category"]', 'web-development')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'requirements.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content'),
    })

    // Verify file appears in upload list
    await expect(page.getByText('requirements.pdf')).toBeVisible()
  })

  test('should auto-save as draft', async ({ page }) => {
    await page.goto('/tasks/new')

    // Fill some fields
    await page.fill('input[name="title"]', 'Draft Task')
    await page.fill('input[name="budget"]', '300')

    // Wait for auto-save (debounce)
    await page.waitForTimeout(2000)

    // Navigate away and return
    await page.goto('/dashboard')
    await page.goto('/tasks/new')

    // Verify draft was restored
    await expect(page.getByDisplayValue('Draft Task')).toBeVisible()
  })

  test('should handle multiple skill tags', async ({ page }) => {
    await page.goto('/tasks/new')

    await page.fill('input[name="skills"]', 'React')
    await page.keyboard.press('Enter')

    await page.fill('input[name="skills"]', 'TypeScript')
    await page.keyboard.press('Enter')

    await page.fill('input[name="skills"]', 'TailwindCSS')
    await page.keyboard.press('Enter')

    // Verify all skill tags were added
    await expect(page.getByText('React')).toBeVisible()
    await expect(page.getByText('TypeScript')).toBeVisible()
    await expect(page.getByText('TailwindCSS')).toBeVisible()
  })

  test('should remove skill tag', async ({ page }) => {
    await page.goto('/tasks/new')

    await page.fill('input[name="skills"]', 'React')
    await page.keyboard.press('Enter')

    // Remove the skill
    await page.click('[data-testid="remove-skill"]')

    // Verify skill was removed
    await expect(page.getByText('React')).not.toBeVisible()
  })

  test('should preview task before posting', async ({ page }) => {
    await page.goto('/tasks/new')

    await page.fill('input[name="title"]', 'Test Task')
    await page.fill('textarea[name="description"]', 'Test description with enough characters')
    await page.fill('input[name="budget"]', '200')
    await page.selectOption('select[name="category"]', 'web-development')

    // Click preview
    await page.click('button:has-text("Preview")')

    // Verify preview modal
    await expect(page.getByText('Task Preview')).toBeVisible()
    await expect(page.getByText('Test Task')).toBeVisible()
    await expect(page.getByText('$200')).toBeVisible()
  })

  test('should cancel and navigate back', async ({ page }) => {
    await page.goto('/tasks/new')

    await page.fill('input[name="title"]', 'Unsaved Task')
    await page.click('button:has-text("Cancel")')

    // Should show confirmation dialog
    await expect(page.getByText(/unsaved changes/i)).toBeVisible()
    await page.click('button:has-text("Leave")')

    // Should navigate to previous page
    await expect(page).toHaveURL(/.*\/dashboard$/)
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/tasks/new')

    // Tab through form fields
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Title')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Description')).toBeFocused()

    // Submit with keyboard shortcut (Ctrl+Enter or Cmd+Enter)
    page.keyboard.press('Control+Enter')

    // Should show validation errors
    await expect(page.getByText(/title is required/i)).toBeVisible()
  })

  test('should show word count for description', async ({ page }) => {
    await page.goto('/tasks/new')

    const description = page.getByLabel('Description')
    await description.fill('This is a test description')

    await expect(page.getByText(/4 words/i)).toBeVisible()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    await page.context().setOffline(true)

    await page.goto('/tasks/new')

    await page.fill('input[name="title"]', 'Offline Task')
    await page.fill('textarea[name="description"]', 'Description with enough characters to meet minimum requirements.')
    await page.fill('input[name="budget"]', '500')
    await page.selectOption('select[name="category"]', 'web-development')

    await page.click('button[type="submit"]')

    await expect(page.getByText(/network error/i)).toBeVisible()
    await expect(page.getByText(/task saved as draft/i)).toBeVisible()

    await page.context().setOffline(false)
  })

  test('should validate deadline is in the future', async ({ page }) => {
    await page.goto('/tasks/new')

    await page.fill('input[name="deadline"]', '2020-01-01') // Past date

    await expect(page.getByText(/deadline must be in the future/i)).toBeVisible()
  })
})
