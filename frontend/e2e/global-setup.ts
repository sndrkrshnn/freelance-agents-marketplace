import { FullConfig, chromium } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const baseURL = config.webServer?.url || 'http://localhost:5173'

  // Setup test database or environment
  console.log('Setting up test environment...')

  // Wait for server to be ready
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Health check
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    console.log('Server is ready')
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup
