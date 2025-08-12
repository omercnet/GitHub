import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
    // Mock successful session check and organization fetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: { login: 'testuser' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 1, login: 'testuser', avatar_url: 'http://test.com/avatar.jpg', name: 'Test User', isPersonal: true }])
      })

    await act(async () => {
      render(<Home />)
    })

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

    await act(async () => {
      render(<Home />)
    })

    await waitFor(() => {
      expect(screen.getByText('GitHub UI Clone')).toBeInTheDocument()
      expect(screen.getByLabelText('Personal Access Token')).toBeInTheDocument()
    })
  })

  it('handles logout correctly', async () => {
    // First mock the initial session check and org fetch for login state
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: { login: 'testuser' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 1, login: 'testuser', avatar_url: 'http://test.com/avatar.jpg', name: 'Test User', isPersonal: true }])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    await act(async () => {
      render(<Home />)
    })

    // Wait for component to load with organizations
    await waitFor(() => {
      expect(screen.getByText('Select Organization')).toBeInTheDocument()
    })

    // Find and click logout button - it's labeled "Sign Out"
    await waitFor(() => {
      const logoutButton = screen.getByRole('button', { name: /sign out/i })
      expect(logoutButton).toBeInTheDocument()
    })

    const logoutButton = screen.getByRole('button', { name: /sign out/i })
    
    await act(async () => {
      fireEvent.click(logoutButton)
    })

    // Should call logout API and return to login form
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/session', { method: 'DELETE' })
      expect(screen.getByLabelText('Personal Access Token')).toBeInTheDocument()
    })
  })

  it('handles login form submission', async () => {
    // Mock failed session, then successful login and org fetch
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 }) // session check
      .mockResolvedValueOnce({ ok: true }) // login
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // orgs

    await act(async () => {
      render(<Home />)
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Personal Access Token')).toBeInTheDocument()
    })

    const tokenInput = screen.getByLabelText('Personal Access Token')
    const loginButton = screen.getByRole('button', { name: /connect to github/i })

    await act(async () => {
      fireEvent.change(tokenInput, { target: { value: 'ghp_test_token' } })
      fireEvent.click(loginButton)
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'ghp_test_token' })
      })
    })
  })
})
