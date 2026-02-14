import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import ChatMessage from '../ChatMessage'
import { mockMessage, mockUser } from '@/test-utils/mockData'

describe('ChatMessage', () => {
  it('renders message content', () => {
    render(<ChatMessage message={mockMessage} currentUser={mockUser} />)

    expect(screen.getByText(mockMessage.content)).toBeInTheDocument()
  })

  it('styles sent messages differently from received messages', () => {
    const sentMessage = { ...mockMessage, senderId: mockUser.id }
    const receivedMessage = { ...mockMessage, senderId: 'other-user' }

    const { rerender } = render(
      <ChatMessage message={sentMessage} currentUser={mockUser} />
    )

    const sentContainer = screen.getByRole('listitem')
    expect(sentContainer).toHaveClass('sent')

    rerender(<ChatMessage message={receivedMessage} currentUser={mockUser} />)

    const receivedContainer = screen.getByRole('listitem')
    expect(receivedContainer).toHaveClass('received')
  })

  it('displays message timestamp', () => {
    render(<ChatMessage message={mockMessage} currentUser={mockUser} />)

    const timeString = mockMessage.timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    expect(screen.getByText(timeString)).toBeInTheDocument()
  })

  it('displays read receipt for sent messages', () => {
    const sentMessage = { ...mockMessage, senderId: mockUser.id, read: true }
    render(<ChatMessage message={sentMessage} currentUser={mockUser} />)

    expect(screen.getByLabelText(/read receipt/i)).toBeInTheDocument()
  })

  it('does not display read receipt for unread sent messages', () => {
    const sentMessage = { ...mockMessage, senderId: mockUser.id, read: false }
    render(<ChatMessage message={sentMessage} currentUser={mockUser} />)

    expect(
      screen.queryByLabelText(/read receipt/i)
    ).not.toBeInTheDocument()
  })

  it('displays sender name for received messages', () => {
    const receivedMessage = {
      ...mockMessage,
      senderId: 'other-user',
      senderName: 'John Doe',
    }
    render(<ChatMessage message={receivedMessage} currentUser={mockUser} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('does not display sender name for sent messages', () => {
    const sentMessage = { ...mockMessage, senderId: mockUser.id }
    render(<ChatMessage message={sentMessage} currentUser={mockUser} />)

    expect(screen.queryByText(mockUser.name)).not.toBeInTheDocument()
  })

  it('has proper ARIA attributes', () => {
    render(<ChatMessage message={mockMessage} currentUser={mockUser} />)

    const messageElement = screen.getByRole('listitem')
    expect(messageElement).toHaveAttribute('data-message-id', mockMessage.id)
  })

  it('is keyboard navigable', () => {
    render(<ChatMessage message={mockMessage} currentUser={mockUser} />)

    const messageElement = screen.getByRole('listitem')
    expect(messageElement).toHaveAttribute('tabIndex', '0')
  })

  it('has focus indicator', () => {
    render(<ChatMessage message={mockMessage} currentUser={mockUser} />)

    const messageElement = screen.getByRole('listitem')
    messageElement.focus()

    expect(messageElement).toHaveFocus()
  })

  it('snapshot matches for sent message', () => {
    const sentMessage = { ...mockMessage, senderId: mockUser.id }
    const { container } = render(
      <ChatMessage message={sentMessage} currentUser={mockUser} />
    )

    expect(container.firstChild).toMatchSnapshot()
  })

  it('snapshot matches for received message', () => {
    const receivedMessage = { ...mockMessage, senderId: 'other-user' }
    const { container } = render(
      <ChatMessage message={receivedMessage} currentUser={mockUser} />
    )

    expect(container.firstChild).toMatchSnapshot()
  })
})
