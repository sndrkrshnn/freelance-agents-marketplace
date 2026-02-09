import { test, expect } from '@playwright/test'

test.describe('Agent Browsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate to agents page', async ({ page }) => {
    await page.click('text=Find Agents')
    await expect(page).toHaveURL(/.*\/agents$/)
    await expect(page.getByText(/browse agents/i)).toBeVisible()
  })

  test('should display list of agents', async ({ page }) => {
    await page.goto('/agents')

    // Verify at least one agent card is displayed
    const agentCards = page.locator('[data-testid="agent-card"]')
    await expect(agentCards.first()).toBeVisible()

    // Verify agent information
    await expect(page.getByText(/hourly rate/i)).toBeVisible()
    await expect(page.getByText(/rating/i)).toBeVisible()
  })

  test('should filter agents by category', async ({ page }) => {
    await page.goto('/agents')

    // Select category filter
    await page.selectOption('select[name="category"]', 'machine-learning')

    // Wait for results to update
    await page.waitForLoadState('networkidle')

    // Verify URL updated with filter
    await expect(page).toHaveURL(/.*category=machine-learning.*/)
  })

  test('should filter agents by expertise', async ({ page }) => {
    await page.goto('/agents')

    // Select expertise filter
    await page.selectOption('select[name="expertise"]', 'nlp')

    // Wait for results to update
    await page.waitForLoadState('networkidle')

    // Verify only agents with NLP expertise are shown
    const agentCards = page.locator('[data-testid="agent-card"]')

    // Each agent should have NLP tag
    for (const card of await agentCards.all()) {
      await expect(card.getByText('nlp', { exact: false })).toBeVisible()
    }
  })

  test('should filter agents by hourly rate range', async ({ page }) => {
    await page.goto('/agents')

    // Set minimum rate
    await page.fill('input[name="minRate"]', '50')
    // Set maximum rate
    await page.fill('input[name="maxRate"]', '100')

    // Apply filters
    await page.click('button:has-text("Apply Filters")')

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Verify filtered results
    const agentCards = page.locator('[data-testid="agent-card"]')

    // Check each agent card
    for (const card of await agentCards.all()) {
      const rateText = await card.getByText(/\$\d+\s*\/\s*hr/).textContent()
      const rate = parseInt(rateText?.replace(/\D/g, '') || '0')

      expect(rate).toBeGreaterThanOrEqual(50)
      expect(rate).toBeLessThanOrEqual(100)
    }
  })

  test('should filter agents by rating', async ({ page }) => {
    await page.goto('/agents')

    // Select minimum rating
    await page.click('[data-testid="rating-filter"]')
    await page.click('text=4.5+ stars')

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Verify URL updated
    await expect(page).toHaveURL(/.*minRating=4\.5.*/)
  })

  test('should filter agents by availability', async ({ page }) => {
    await page.goto('/agents')

    // Select available only
    await page.check('input[name="availableOnly"]')

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Verify only available agents shown
    const agentCards = page.locator('[data-testid="agent-card"]')

    for (const card of await agentCards.all()) {
      await expect(card.getByText(/available/i)).toBeVisible()
    }
  })

  test('should search agents by name', async ({ page }) => {
    await page.goto('/agents')

    // Enter search query
    await page.fill('input[name="search"]', 'John')
    await page.click('button:has-text("Search")')

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Verify search results
    const agentCards = page.locator('[data-testid="agent-card"]')

    for (const card of await agentCards.all()) {
      const name = await card.getByTestId('agent-name').textContent()
      expect(name).toMatch(/john/i)
    }
  })

  test('should sort agents by rating', async ({ page }) => {
    await page.goto('/agents')

    // Select sort option
    await page.selectOption('select[name="sort"]', 'rating-desc')

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Verify sorting
    const ratings = await page
      .locator('[data-testid="agent-rating"]')
      .allTextContents()

    // Check that ratings are in descending order
    for (let i = 0; i < ratings.length - 1; i++) {
      expect(parseFloat(ratings[i])).toBeGreaterThanOrEqual(parseFloat(ratings[i + 1]))
    }
  })

  test('should sort agents by hourly rate', async ({ page }) => {
    await page.goto('/agents')

    // Select sort option
    await page.selectOption('select[name="sort"]', 'rate-asc')

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Verify sorting
    const rates = await page
      .locator('[data-testid="agent-rate"]')
      .allTextContents()

    // Check that rates are in ascending order
    for (let i = 0; i < rates.length - 1; i++) {
      const rate1 = parseInt(rates[i].replace(/\D/g, ''))
      const rate2 = parseInt(rates[i + 1].replace(/\D/g, ''))
      expect(rate1).toBeLessThanOrEqual(rate2)
    }
  })

  test('should paginate agents list', async ({ page }) => {
    await page.goto('/agents')

    // Check if pagination exists (only if there are enough agents)
    const nextButton = page.getByRole('button', { name: /next/i })

    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click()

      // Wait for page load
      await page.waitForLoadState('networkidle')

      // Verify URL updated
      await expect(page).toHaveURL(/.*page=2.*/)

      // Click previous page
      await page.getByRole('button', { name: /previous/i }).click()

      await page.waitForLoadState('networkidle')

      // Verify URL updated
      await expect(page).toHaveURL(/.*page=1.*/)
    }
  })

  test('should view agent profile', async ({ page }) => {
    await page.goto('/agents')

    // Click on first agent
    const firstAgent = page.locator('[data-testid="agent-card"]').first()
    const agentName = await firstAgent.getByTestId('agent-name').textContent()

    await firstAgent.click()

    // Verify navigation to agent profile
    await expect(page).toHaveURL(/.*\/agents\/[\w]+$/)
    await expect(page.getByText(agentName || '')).toBeVisible()
  })

  test('should clear all filters', async ({ page }) => {
    await page.goto('/agents')

    // Apply some filters
    await page.selectOption('select[name="category"]', 'machine-learning')
    await page.fill('input[name="search"]', 'AI')

    // Clear filters
    await page.click('button:has-text("Clear Filters")')

    // Verify filters cleared
    await expect(page.locator('select[name="category"]')).toHaveValue('')
    await expect(page.locator('input[name="search"]')).toHaveValue('')
    await expect(page).toHaveURL(/.*\/agents$/)
  })

  test('should show agent count', async ({ page }) => {
    await page.goto('/agents')

    // Verify agent count is displayed
    await expect(page.getByText(/\d+\s*agents?/i)).toBeVisible()
  })

  test('should handle no results', async ({ page }) => {
    await page.goto('/agents')

    // Search for non-existent agent
    await page.fill('input[name="search"]', 'xyznonexistentagent123')
    await page.click('button:has-text("Search")')

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Verify no results message
    await expect(page.getByText(/no agents found/i)).toBeVisible()
  })

  test('should save agent to favorites', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'client@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')

    await page.goto('/agents')

    // Click favorite button on first agent
    const favoriteButton = page
      .locator('[data-testid="agent-card"]')
      .first()
      .getByRole('button', { name: /favorite/i })

    await favoriteButton.click()

    // Verify favorite state changed
    await expect(favoriteButton).toHaveClass(/active/)
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/agents')

    // Tab through agent cards
    await page.keyboard.press('Tab')
    const firstCard = page.locator('[data-testid="agent-card"]').first()
    await expect(firstCard).toBeFocused()

    // Press Enter to view profile
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/.*\/agents\/[\w]+$/)
  })

  test('should persist filters when navigating back', async ({ page }) => {
    await page.goto('/agents')

    // Apply filters
    await page.selectOption('select[name="category"]', 'machine-learning')
    await page.fill('input[name="search"]', 'AI')

    // Navigate to agent profile
    await page.locator('[data-testid="agent-card"]').first().click()

    // Navigate back
    await page.goBack()

    // Verify filters are preserved
    await expect(page.locator('select[name="category"]')).toHaveValue(
      'machine-learning'
    )
    await expect(page.locator('input[name="search"]')).toHaveValue('AI')
  })
})
