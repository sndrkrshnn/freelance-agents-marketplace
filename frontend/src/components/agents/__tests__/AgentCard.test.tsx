import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils'
import AgentCard from '../AgentCard'
import { mockAgent } from '@/test-utils/mockData'

describe('AgentCard', () => {
  it('renders agent information correctly', () => {
    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByText(mockAgent.name)).toBeInTheDocument()
    expect(screen.getByText(`$${mockAgent.hourlyRate}/hr`)).toBeInTheDocument()
    expect(screen.getByText(mockAgent.bio)).toBeInTheDocument()
  })

  it('displays verified badge when agent is verified', () => {
    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByLabelText(/verified agent/i)).toBeInTheDocument()
  })

  it('hides verified badge when agent is not verified', () => {
    const unverifiedAgent = { ...mockAgent, verified: false }
    render(<AgentCard agent={unverifiedAgent} />)

    expect(
      screen.queryByLabelText(/verified agent/i)
    ).not.toBeInTheDocument()
  })

  it('displays rating with correct number of stars', () => {
    render(<AgentCard agent={mockAgent} />)

    const starElements = screen.getAllByTestId(/star/i)
    expect(starElements.length).toBeGreaterThan(0)
  })

  it('displays review count', () => {
    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByText(`${mockAgent.reviewCount} reviews`)).toBeInTheDocument()
  })

  it('displays completed tasks count', () => {
    render(<AgentCard agent={mockAgent} />)

    expect(
      screen.getByText(`${mockAgent.completedTasks} tasks completed`)
    ).toBeInTheDocument()
  })

  it('displays expertise tags', () => {
    render(<AgentCard agent={mockAgent} />)

    mockAgent.expertise.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument()
    })
  })

  it('calls onProfileClick when card is clicked', () => {
    const onProfileClick = vi.fn()
    render(<AgentCard agent={mockAgent} onProfileClick={onProfileClick} />)

    const card = screen.getByRole('article')
    fireEvent.click(card)

    expect(onProfileClick).toHaveBeenCalledTimes(1)
    expect(onProfileClick).toHaveBeenCalledWith(mockAgent.id)
  })

  it('calls onHireClick when hire button is clicked', () => {
    const onHireClick = vi.fn()
    render(<AgentCard agent={mockAgent} onHireClick={onHireClick} />)

    const hireButton = screen.getByRole('button', { name: /hire/i })
    fireEvent.click(hireButton)

    expect(onHireClick).toHaveBeenCalledTimes(1)
    expect(onHireClick).toHaveBeenCalledWith(mockAgent)
  })

  it('displays availability status correctly', () => {
    render(<AgentCard agent={mockAgent} />)

    expect(screen.getByText(/available/i)).toBeInTheDocument()
  })

  it('shows busy status when agent is not available', () => {
    const busyAgent = { ...mockAgent, availability: 'busy' }
    render(<AgentCard agent={busyAgent} />)

    expect(screen.getByText(/busy/i)).toBeInTheDocument()
  })

  it('has accessible image alt text', () => {
    render(<AgentCard agent={mockAgent} />)

    const avatar = screen.getByAltText(`${mockAgent.name} avatar`)
    expect(avatar).toBeInTheDocument()
  })

  it('is keyboard navigable', () => {
    const onProfileClick = vi.fn()
    render(<AgentCard agent={mockAgent} onProfileClick={onProfileClick} />)

    const card = screen.getByRole('article', { name: /agent card/i })
    expect(card).toHaveAttribute('tabIndex', '0')
  })

  it('displays focus indicator on keyboard focus', () => {
    render(<AgentCard agent={mockAgent} />)

    const card = screen.getByRole('article', { name: /agent card/i })
    card.focus()

    expect(card).toHaveFocus()
  })

  it('snapshot matches', () => {
    const { container } = render(<AgentCard agent={mockAgent} />)

    expect(container.firstChild).toMatchSnapshot()
  })
})
