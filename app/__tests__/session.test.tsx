import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from '@/app/page'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Home Page Session Management', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockPush.mockClear()
  })

  it('shows loading state while checking session', async () => {
    render(<Home />)
    
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
  })

  it('automatically logs in user with valid session', async () => {
    // Mock successful session check
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: { login: 'testuser' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 1, login: 'testuser', avatar_url: 'http://test.com/avatar.jpg', name: 'Test User', isPersonal: true }])
      })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Select Organization')).toBeInTheDocument()
    })

    // Should have called session endpoint
    expect(mockFetch).toHaveBeenCalledWith('/api/session')
    // Should have fetched organizations
    expect(mockFetch).toHaveBeenCalledWith('/api/orgs')
  })

  it('shows login form when no valid session', async () => {
    // Mock failed session check
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('GitHub UI Clone')).toBeInTheDocument()
      expect(screen.getByLabelText('Personal Access Token')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /connect to github/i })).toBeInTheDocument()
    })
  })

  it('handles logout correctly', async () => {
    // Mock successful session check then logout
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          user: { login: 'testuser', avatar_url: 'http://test.com/avatar.jpg' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    const pushMock = jest.fn()
    const routerMock = {
      push: pushMock
    }
    jest.doMock('next/navigation', () => ({
      useRouter: () => routerMock
    }))

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Select Organization')).toBeInTheDocument()
    })

    // Click logout
    const logoutButton = screen.getByRole('button', { name: /logout/i })
    fireEvent.click(logoutButton)

    // Verify redirect to login page
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/')
    })
  })

  it('handles login form submission', async () => {
    // Mock failed session, then successful login and org fetch
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 }) // session check
      .mockResolvedValueOnce({ ok: true }) // login
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // orgs

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('Personal Access Token')).toBeInTheDocument()
    })

    const tokenInput = screen.getByLabelText('Personal Access Token')
    const loginButton = screen.getByRole('button', { name: /connect to github/i })

    fireEvent.change(tokenInput, { target: { value: 'ghp_test_token' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'ghp_test_token' })
      })
    })
  })
})
