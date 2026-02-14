import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'
import { server } from './msw'

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())

// Mock IntersectionObserver
global.StructuredClone = vi.fn()

const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { return null }
  unobserve() { return null }
  disconnect() { return null }
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() { return Object.keys(store).length },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() { return Object.keys(store).length },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock WebSocket
class WebSocketMock {
  readyState: number = 0
  url: string = ''
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      if (this.onopen) this.onopen(new Event('open'))
    }, 100)
  }

  send(data: string) {
    return
  }

  close() {
    this.readyState = 3
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
}

global.WebSocket = WebSocketMock as any

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock crypto.randomUUID if not available
if (!crypto.randomUUID) {
  crypto.randomUUID = vi.fn(() => '00000000-0000-4000-8000-000000000000')
}
