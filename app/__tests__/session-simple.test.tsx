import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('Home Page Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('shows loading state while checking session', async () => {
    // Mock pending fetch
    global.fetch = jest.fn(() => new Promise(() => {}))
    
    render(<Home />)
    
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
  })

  it('shows GitHub login button when no session', async () => {
    // Mock session check returning invalid
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false })
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Connect to GitHub')).toBeInTheDocument()
    })
  })
})
