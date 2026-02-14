# Testing Guide

This guide covers the testing strategy, tools, and best practices for the Freelance AI Agents Marketplace.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Frontend Testing](#frontend-testing)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
  - [E2E Tests](#e2e-tests)
- [Backend Testing](#backend-testing)
  - [Unit Tests](#unit-tests-1)
  - [Integration Tests](#integration-tests-1)
  - [API Tests](#api-tests)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD](#cicd)

## Overview

Our testing strategy follows the testing pyramid:

```
        /\
       /E2E\       Few tests, slow, expensive
      /------\
     /Integration\  Medium tests
    /------------\
   /   Unit Tests \ Many tests, fast, cheap
  /________________\
```

## Testing Stack

### Frontend

- **Unit/Integration Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **API Mocking**: MSW (Mock Service Worker)
- **Coverage**: Vitest Coverage (V8)

### Backend

- **Unit/Integration Tests**: Jest + Supertest
- **Database Testing**: Testcontainers (PostgreSQL)
- **Coverage**: Jest Coverage

## Frontend Testing

### Unit Tests

Unit tests isolate individual components, hooks, or utilities.

#### Component Tests

Located in: `frontend/src/components/**/__tests__/*.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import AgentCard from '../AgentCard'
import { mockAgent } from '@/test-utils/mockData'

describe('AgentCard', () => {
  it('renders agent information correctly', () => {
    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByText(mockAgent.name)).toBeInTheDocument()
    expect(screen.getByText(`$${mockAgent.hourlyRate}/hr`)).toBeInTheDocument()
  })
})
```

#### Hook Tests

Located in: `frontend/src/hooks/__tests__/*.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'

describe('useAuth', () => {
  it('logs in user with valid credentials', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    waitFor(() => {
      expect(result.current.user).toBeDefined()
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
```

### Integration Tests

Integration tests verify interactions between multiple components.

Located in: `frontend/src/integration/__tests__/*.test.tsx`

```typescript
describe('Registration to Dashboard Flow', () => {
  it('completes registration and navigates to dashboard', async () => {
    render(<App />)

    // Fill registration form
    await userEvent.type(screen.getByLabelText('Name'), 'Test User')
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))

    // Verify navigation to dashboard
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })
  })
})
```

### E2E Tests

E2E tests simulate real user scenarios in a browser.

Located in: `frontend/e2e/tests/*.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test('user can create and post a new task', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  await page.goto('/tasks/new')
  await page.fill('input[name="title"]', 'Build a React App')
  await page.fill('textarea[name="description"]', 'Need a single-page React app...')
  await page.fill('input[name="budget"]', '500')
  await page.selectOption('select[name="category"]', 'web-development')

  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/tasks\/[\w]+$/)
})
```

## Backend Testing

### Unit Tests

Unit tests test individual functions, services, or utilities in isolation.

Located in: `backend/src/**/__tests__/*.test.js`

```javascript
const { validateEmail } = require('../utils/helpers')

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

### Integration Tests

Integration tests verify different parts of the backend work together.

Located in: `backend/src/**/__tests__/*.integration.test.js`

```javascript
const request = require('supertest')
const app = require('../server')
const db = require('../config/database')

describe('Auth Integration', () => {
  beforeAll(async () => {
    await db.migrate.rollback()
    await db.migrate.latest()
    await db.seed.run()
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('should register and login a user', async () => {
    // Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      })

    expect(registerRes.status).toBe(201)
    expect(registerRes.body.user).toBeDefined()

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.token).toBeDefined()
  })
})
```

### API Tests

API tests verify endpoints with proper request/response handling.

```javascript
describe('Task API', () => {
  let authToken

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' })
    authToken = res.body.token
  })

  it('should create a new task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Task',
        description: 'Test description',
        budget: 100,
        category: 'web-development',
      })

    expect(res.status).toBe(201)
    expect(res.body.task).toBeDefined()
  })
})
```

## Running Tests

### Frontend

```bash
# Install dependencies
cd frontend
npm ci

# Run unit tests (watch mode)
npm run test

# Run unit tests (single run)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (show browser)
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### Backend

```bash
# Install dependencies
cd backend
npm ci

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Writing Tests

### Best Practices

1. **Test behavior, not implementation**
   - Test what the code does, not how it does it

2. **Use descriptive test names**
   - `it('should log in user with valid credentials')` ✅
   - `it('logs in')` ❌

3. **Arrange, Act, Assert (AAA)**
   ```typescript
   // Arrange
   const agent = mockAgent

   // Act
   render(<AgentCard agent={agent} />)

   // Assert
   expect(screen.getByText(agent.name)).toBeInTheDocument()
   ```

4. **Use data-test-id attributes** for selecting elements
   ```jsx
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   screen.getByTestId('submit-button')
   ```

5. **Mock external dependencies**
   - Use MSW for API mocking
   - Mock local storage, WebSocket, etc.

6. **Test happy path and error paths**
   - Verify both success and failure scenarios

7. **Keep tests isolated**
   - Don't rely on order of execution
   - Clean up after each test

8. **Avoid test flakiness**
   - Use waitFor for async operations
   - Don't use hardcoded timeouts

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('should have no accessibility violations', async () => {
  const { container } = render(<Component />)

  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Coverage Requirements

### Minimum Coverage

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Generating Coverage Reports

```bash
# Frontend
cd frontend
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Badges

Coverage is tracked via Codecov and displayed in the README.

## CI/CD

### GitHub Actions

Tests run automatically on:

- **Push** to main/develop branches
- **Pull Requests** to main/develop branches
- **Daily schedule** (security scans)

### Test Flows

1. **Frontend Tests**
   - Type check
   - Linter
   - Unit tests with coverage
   - Upload to Codecov

2. **Backend Tests**
   - Linter
   - Unit tests with coverage
   - Integration tests
   - Upload to Codecov

3. **E2E Tests**
   - Full user flow tests
   - Screenshot/video on failure
   - Upload artifacts

### Quality Gates

- All tests must pass ⚠️
- Minimum 80% coverage ⚠️
- No linting errors ⚠️
- No high/critical vulnerabilities ⚠️

## Test Data

### Mock Data

Use `frontend/src/test-utils/mockData.ts` for consistent test data:

```typescript
import { mockAgent, mockTask, mockUser } from '@/test-utils/mockData'

render(<AgentCard agent={mockAgent} />)
```

### Test Factories

Create multiple test items:

```typescript
import { createMockAgents, createMockTasks } from '@/test-utils/mockData'

const agents = createMockAgents(10)
const tasks = createMockTasks(5)
```

### MSW Handlers

Mock API responses in `frontend/src/test-utils/msw.ts`:

```typescript
http.get('/api/agents', () => {
  return HttpResponse.json(mockAgentsResponse)
})
```

## Troubleshooting

### Common Issues

#### Test failures in CI but not locally

- Check environment variables
- Verify database migrations ran
- Check for timezone differences

#### Flaky tests

- Add proper `waitFor` for async operations
- Use `screen.findBy*` instead of `screen.getBy*` for async elements
- Ensure test isolation

#### Coverage not updated

- Clear cache: `npm run test:coverage -- --clearCache`
- Check coverage paths in vitest config

#### E2E timing issues

- Increase timeout: `await expect(...).toBeVisible({ timeout: 10000 })`
- Use `waitForResponse` for API calls
- Add assertions between steps

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
