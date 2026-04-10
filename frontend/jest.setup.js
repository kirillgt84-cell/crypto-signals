import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
    resolvedTheme: 'light',
  }),
  ThemeProvider: ({ children }) => children,
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() { }
  unobserve() { }
  disconnect() { }
}
global.IntersectionObserver = MockIntersectionObserver

// Mock ResizeObserver
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() { }
  unobserve() { }
  disconnect() { }
}
global.ResizeObserver = MockResizeObserver
