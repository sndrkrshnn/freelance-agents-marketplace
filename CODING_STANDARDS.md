# Coding Standards

This document outlines the coding standards, conventions, and best practices for the Freelance AI Agents Marketplace.

## Table of Contents

- [General Principles](#general-principles)
- [File Naming](#file-naming)
- [TypeScript Standards](#typescript-standards)
- [JavaScript Standards (Backend)](#javascript-standards-backend)
- [React Standards](#react-standards)
- [CSS/Styling Standards](#cssstyling-standards)
- [Git Standards](#git-standards)
- [Documentation Standards](#documentation-standards)

## General Principles

### Code Quality

- **Readability over cleverness**: Write code that others can understand
- **KISS (Keep It Simple, Stupid)**: Avoid unnecessary complexity
- **DRY (Don't Repeat Yourself)**: Extract reusable code
- **YAGNI (You Ain't Gonna Need It)**: Don't build features you don't need
- **Early return, early exit**: Return early from functions
- **Composition over inheritance**: Prefer composition
- **Small functions**: Functions should do one thing well

### Errors and Edge Cases

- Always handle errors properly
- Use specific error types
- Provide meaningful error messages
- Log errors with context
- Don't suppress errors silently

### Comments

- **Code should be self-documenting**: Good variable/function names are better than comments
- Comment **why**, not **what**
- Use JSDoc for public APIs
- Keep comments up to date
- Remove commented-out code

## File Naming

### Frontend

- **Components**: PascalCase (e.g., `AgentCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: camelCase (e.g., `userTypes.ts`)
- **Constants**: camelCase (e.g., `apiConstants.ts`)
- **Styles**: camelCase matching component (e.g., `AgentCard.module.css`)
- **Tests**: `*.test.tsx` or `*.test.ts`

### Backend

- **Controllers**: camelCase (e.g., `authController.js`)
- **Models**: PascalCase (e.g., `User.js`)
- **Routes**: camelCase (e.g., `authRoutes.js`)
- **Middleware**: camelCase (e.g., `authMiddleware.js`)
- **Services**: camelCase (e.g., `emailService.js`)
- **Utils**: camelCase (e.g., `helpers.js`)
- **Tests**: `*.test.js` or `*.spec.js`

## TypeScript Standards

### Type Definitions

```typescript
// Use interfaces for object shapes
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'agent' | 'client'
}

// Use types for unions, primitives, and mapped types
type UserRole = 'admin' | 'agent' | 'client'
type ID = string | number
type UserWithProfile = User & { profile: Profile }

// Use generics for reusable components
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}
```

### Enums vs Union Types

```typescript
// ✅ Prefer union types (better for TypeScript)
type Status = 'pending' | 'approved' | 'rejected'

// ❌ Avoid enums unless necessary for runtime values
enum Status {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}
```

### Strict Mode

Always enable strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Type Assertion

Avoid type assertions; use type guards:

```typescript
// ❌ Avoid
const user = data as User

// ✅ Better
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  )
}
```

### Function Parameters

```typescript
// Use object destructuring for multiple parameters
function createTask({ title, description, budget }: CreateTaskInput) {
  // ...
}

// Use optional parameters with default values
function greet(name: string, greeting: string = 'Hello') {
  return `${greeting}, ${name}!`
}
```

## JavaScript Standards (Backend)

### Variable Declarations

```javascript
// Use const by default
const apiKey = process.env.API_KEY

// Use let for variables that need reassignment
let counter = 0
counter++

// Never use var
```

### Functions

```javascript
// Use arrow functions for callbacks
const callback = (err, data) => { /* ... */ }

// Use regular functions for methods
class UserService {
  getUser() { /* ... */ }
}

// Default parameters
function greet(name = 'World') {
  return `Hello, ${name}!`
}

// Destructuring
function createUser({ email, password, name }) {
  // ...
}
```

### Async/Await over Callbacks

```javascript
// ✅ Preferred
async function getUser(id) {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return user.rows[0]
}

// ❌ Avoid
function getUser(id, callback) {
  db.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
    if (err) return callback(err)
    callback(null, result.rows[0])
  })
}
```

### Error Handling

```javascript
// Always handle errors
async function updateUser(id, data) {
  try {
    const user = await db.query('UPDATE users SET ...', [id, data])
    return user.rows[0]
  } catch (error) {
    logger.error('Failed to update user', { id, error })
    throw new Error('Failed to update user')
  }
}

// Use specific error types
class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### Templates

```javascript
// Use template literals
const message = `Hello, ${user.name}!`

// For multi-line strings
const sql = `
  SELECT *
  FROM tasks
  WHERE status = $1
`
```

## React Standards

### Component Structure

```typescript
// 1. Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// 2. Types/Interfaces
interface Props {
  user: User
  onSave: (user: User) => void
}

// 3. Component
export function UserForm({ user, onSave }: Props) {
  // 4. Hooks
  const [formData, setFormData] = useState<User>(user)
  const [errors, setErrors] = useState({})

  // 5. Event handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  // 6. Effects
  useEffect(() => {
    // ...
  }, [user])

  // 7. Render
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  )
}
```

### Hooks

```typescript
// ✅ Custom hooks start with 'use'
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  // ...
  return { user, isAuthenticated: !!user }
}

// ✅ Follow Rules of Hooks
// Only call hooks at the top level
// Only call hooks from React functions
```

### Props

```typescript
// Use interfaces for props
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'small' | 'medium' | 'large'
  onClick: () => void
  children: React.ReactNode
}

// Provide defaults
export function Button({
  variant = 'primary',
  size = 'medium',
  onClick,
  children,
}: ButtonProps) {
  // ...
}
```

### Event Handlers

```typescript
// Use event types
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setInputValue(e.target.value)
}

const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault()
  // ...
}

// Use useCallback for handlers passed to children
const handleClick = useCallback(() => {
  // ...
}, [dependency])
```

### Lists and Keys

```typescript
// ✅ Use stable keys
{users.map(user => (
  <UserItem key={user.id} user={user} />
))}

// ❌ Don't use index as key
{users.map((user, index) => (
  <UserItem key={index} user={user} />
))}
```

### Conditional Rendering

```typescript
// ✅ Short-circuit evaluation
{isLoading && <LoadingSpinner />}
{data && <DataDisplay data={data} />}

// ✅ Inline conditions
<button type={primary ? 'submit' : 'button'}>

// ✅ Ternary for else cases
<div>
  {isLoggedIn ? <UserProfile /> : <LoginButton />}
</div>

// ❌ Avoid complex ternaries in JSX
```

### Styling

```typescript
// Use Tailwind CSS classes
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">

// Use clsx for conditional classes
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function Button({ variant, className, ...props }) {
  return (
    <button
      className={twMerge(
        clsx('px-4 py-2 rounded', {
          'bg-blue-500': variant === 'primary',
          'bg-gray-500': variant === 'secondary',
        }),
        className
      )}
      {...props}
    />
  )
}
```

## CSS/Styling Standards

### Tailwind CSS

```css
/* Use utility classes for styling */
<div class="bg-white rounded-lg shadow-md p-6">

/* Use @apply for repeated patterns */
.btn {
  @apply px-4 py-2 rounded font-medium transition-colors;
}

/* Extend theme for custom values */
@layer utilities {
  .text-shadow {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
```

### CSS Modules (if needed)

```css
/* AgentCard.module.css */
.card {
  @apply bg-white rounded-lg shadow-md p-6;
}

.title {
  @apply text-xl font-semibold mb-2;
}
```

```typescript
import styles from './AgentCard.module.css'

<div className={styles.card}>
  <h2 className={styles.title}>{agent.name}</h2>
</div>
```

## Git Standards

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`

**Examples**:

```
feat(auth): add Google OAuth login support

Implement OAuth flow with Google including:
- Register OAuth credentials
- Handle OAuth callback
- Create user from OAuth profile

Closes #123
```

```
fix(api): resolve timeout issue in task search

Increase timeout from 30s to 60s for slow queries

Fixes #456
```

```
docs(readme): update installation instructions

Add MongoDB installation steps for Linux
```

### Branch Naming

```
feature/add-oauth-login
fix/database-connection-error
refactor/user-service
docs/update-api-docs
test/add-unit-tests
```

### Pull Request Titles

Use same format as commits:

```
feat(auth): add OAuth login support
fix(api): resolve timeout issue
refactor(tasks): improve query performance
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No merge conflicts
- [ ] All tests passing
- [ ] Coverage requirements met
```

## Documentation Standards

### Code Comments

```typescript
/**
 * Fetches agents with optional filters
 *
 * @param filters - Filter options for agent search
 * @param filters.category - Filter by expertise category
 * @param filters.minRate - Minimum hourly rate
 * @param filters.maxRate - Maximum hourly rate
 * @returns Promise resolving to array of agents
 *
 * @example
 * ```typescript
 * const agents = await fetchAgents({
 *   category: 'machine-learning',
 *   minRate: 50,
 *   maxRate: 100
 * })
 * ```
 */
export async function fetchAgents(filters: AgentFilters): Promise<Agent[]> {
  // Implementation
}
```

### README Format

```markdown
# Project Name

Brief description

## Features
- Feature 1
- Feature 2

## Installation
Steps to install

## Usage
How to use

## API Documentation
Link to API docs

## Development
Setup instructions

## Deployment
Deploy instructions

## Contributing
Guidelines for contributors

## License
License type
```

### API Documentation

```javascript
/**
 * @route POST /api/auth/login
 * @description Login user with email and password
 * @access Public
 * @body { email: string, password: string }
 * @returns { token: string, user: object }
 */
router.post('/login', loginHandler)
```

## Best Practices

### Security

- Never commit secrets
- Validate all inputs
- Use parameterized queries
- Sanitize user output
- Keep dependencies updated

### Performance

- Lazy load routes
- Optimize images
- Use caching
- Optimize database queries
- Minimize bundle size

### Accessibility

- Use semantic HTML
- Add ARIA labels
- Support keyboard navigation
- Ensure sufficient color contrast
- Test with screen readers

### Testing

- Write tests for all features
- Aim for 80%+ coverage
- Test edge cases
- Use descriptive test names
- Mock external dependencies

---

## Quick Reference

### Linting and Formatting

```bash
# Frontend
npm run lint          # Check for linting errors
npm run lint:fix      # Fix linting errors automatically
npm run format        # Format code with Prettier

# Backend
npm run lint          # Check for linting errors
npm run lint:fix      # Fix linting errors automatically
```

### Type Checking

```bash
npm run type-check    # TypeScript type check
```

### Pre-commit Checks

Automatically run:
- Linting (frontend & backend)
- Type checking (frontend)
- Unit tests (frontend & backend)

### Pre-push Checks

Run all checks including:
- Tests with coverage
- E2E tests
- Bundle size check

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
