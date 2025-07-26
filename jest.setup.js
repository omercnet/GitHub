import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => null
  DynamicComponent.displayName = 'LoadableComponent'
  DynamicComponent.preload = jest.fn()
  return DynamicComponent
})

// Mock Next.js headers function for API routes
// We'll override this in individual tests when we need real session handling
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}))

// Mock NextResponse for API route testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => ({
      status: init?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map(),
      ...init
    }))
  },
  NextRequest: jest.fn()
}))

// Mock environment variables
process.env.SECRET_COOKIE_PASSWORD = 'test_password_at_least_32_characters_long'
process.env.NODE_ENV = 'test'

// Add Web API globals for Next.js compatibility
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock fetch for Node.js environment
global.fetch = jest.fn()

// Mock URL constructor for API route testing
global.URL = jest.fn().mockImplementation((url) => {
  const urlObj = new (require('url').URL)(url)
  return {
    ...urlObj,
    searchParams: {
      get: jest.fn().mockImplementation((key) => {
        const params = new URLSearchParams(urlObj.search)
        return params.get(key)
      })
    }
  }
})