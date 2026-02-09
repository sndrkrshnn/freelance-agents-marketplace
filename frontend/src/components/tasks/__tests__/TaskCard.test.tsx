import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils'
import TaskCard from '../TaskCard'
import { mockTask } from '@/test-utils/mockData'

describe('TaskCard', () => {
  it('renders task information correctly', () => {
    render(<TaskCard task={mockTask} />)

    expect(screen.getByText(mockTask.title)).toBeInTheDocument()
    expect(screen.getByText(mockTask.description)).toBeInTheDocument()
  })

  it('displays task budget', () => {
    render(<TaskCard task={mockTask} />)

    expect(screen.getByText(`$${mockTask.budget}`)).toBeInTheDocument()
  })

  it('displays task category', () => {
    render(<TaskCard task={mockTask} />)

    expect(
      screen.getByText(mockTask.category.replace(/-/g, ' '))
    ).toBeInTheDocument()
  })

  it('displays task status', () => {
    render(<TaskCard task={mockTask} />)

    expect(screen.getByText(/open/i)).toBeInTheDocument()
  })

  it('shows proposal count', () => {
    const taskWithProposals = {
      ...mockTask,
      proposals: [{ agentId: 'agent-1', message: 'I can do this' }],
    }
    render(<TaskCard task={taskWithProposals} />)

    expect(screen.getByText(/1 proposal/i)).toBeInTheDocument()
  })

  it('shows no proposals message when no proposals', () => {
    render(<TaskCard task={mockTask} />)

    expect(screen.getByText(/no proposals yet/i)).toBeInTheDocument()
  })

  it('displays required skills as tags', () => {
    render(<TaskCard task={mockTask} />)

    mockTask.requiredSkills.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument()
    })
  })

  it('calls onTaskClick when card is clicked', () => {
    const onTaskClick = vi.fn()
    render(<TaskCard task={mockTask} onTaskClick={onTaskClick} />)

    const card = screen.getByRole('article')
    fireEvent.click(card)

    expect(onTaskClick).toHaveBeenCalledTimes(1)
    expect(onTaskClick).toHaveBeenCalledWith(mockTask.id)
  })

  it('calls onApplyClick when apply button is clicked', () => {
    const onApplyClick = vi.fn()
    render(<TaskCard task={mockTask} onApplyClick={onApplyClick} />)

    const applyButton = screen.getByRole('button', { name: /apply/i })
    fireEvent.click(applyButton)

    expect(onApplyClick).toHaveBeenCalledTimes(1)
    expect(onApplyClick).toHaveBeenCalledWith(mockTask)
  })

  it('hides apply button for own tasks', () => {
    const ownTask = { ...mockTask, clientId: 'user-1' }
    render(<TaskCard task={ownTask} currentUserId="user-1" />)

    expect(
      screen.queryByRole('button', { name: /apply/i })
    ).not.toBeInTheDocument()
  })

  it('displays deadline information', () => {
    render(<TaskCard task={mockTask} />)

    expect(screen.getByText(/deadline/i)).toBeInTheDocument()
  })

  it('shows date with correct format', () => {
    render(<TaskCard task={mockTask} />)

    // Check that date is displayed in expected format
    const dateString = mockTask.deadline.toLocaleDateString()
    expect(screen.getByText(dateString)).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    const onTaskClick = vi.fn()
    render(<TaskCard task={mockTask} onTaskClick={onTaskClick} />)

    const card = screen.getByRole('article', { name: /task card/i })
    expect(card).toHaveAttribute('tabIndex', '0')
  })

  it('handles keyboard enter key', () => {
    const onTaskClick = vi.fn()
    render(<TaskCard task={mockTask} onTaskClick={onTaskClick} />)

    const card = screen.getByRole('article')
    fireEvent.keyDown(card, { key: 'Enter' })

    expect(onTaskClick).toHaveBeenCalledTimes(1)
  })

  it('handles keyboard space key', () => {
    const onTaskClick = vi.fn()
    render(<TaskCard task={mockTask} onTaskClick={onTaskClick} />)

    const card = screen.getByRole('article')
    fireEvent.keyDown(card, { key: ' ' })

    expect(onTaskClick).toHaveBeenCalledTimes(1)
  })

  it('has proper ARIA attributes', () => {
    render(<TaskCard task={mockTask} />)

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label', expect.stringContaining(mockTask.title))
  })

  it('snapshot matches', () => {
    const { container } = render(<TaskCard task={mockTask} />)

    expect(container.firstChild).toMatchSnapshot()
  })
})
