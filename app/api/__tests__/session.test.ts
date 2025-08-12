/**
 * @jest-environment node
 */

import { GET, DELETE } from '@/app/api/session/route'
import { getIronSession } from 'iron-session'

// Mock iron-session
jest.mock('iron-session')
const mockGetIronSession = getIronSession as jest.MockedFunction<typeof getIronSession>

// Mock octokit
jest.mock('@/app/lib/octokit', () => ({
  createOctokit: jest.fn(() => ({
    request: jest.fn()
  }))
}))

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

describe('/api/session', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns unauthenticated when no token in session', async () => {
      mockGetIronSession.mockResolvedValueOnce({
        token: undefined
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.authenticated).toBe(false)
    })

    it('validates token and returns user data when authenticated', async () => {
      const mockOctokit = {
        request: jest.fn().mockResolvedValue({
          data: {
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://github.com/testuser.png'
          }
        })
      }

      const { createOctokit } = require('@/app/lib/octokit')
      createOctokit.mockReturnValueOnce(mockOctokit)

      mockGetIronSession.mockResolvedValueOnce({
        token: 'ghp_valid_token'
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authenticated).toBe(true)
      expect(data.user.login).toBe('testuser')
      expect(mockOctokit.request).toHaveBeenCalledWith('GET /user')
    })

    it('destroys session when token is invalid', async () => {
      const mockOctokit = {
        request: jest.fn().mockRejectedValue(new Error('Unauthorized'))
      }

      const mockSession = {
        token: 'ghp_invalid_token',
        destroy: jest.fn()
      }

      const { createOctokit } = require('@/app/lib/octokit')
      createOctokit.mockReturnValueOnce(mockOctokit)

      mockGetIronSession.mockResolvedValueOnce(mockSession as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.authenticated).toBe(false)
      expect(mockSession.destroy).toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('destroys session on logout', async () => {
      const mockSession = {
        destroy: jest.fn()
      }

      mockGetIronSession.mockResolvedValueOnce(mockSession as any)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSession.destroy).toHaveBeenCalled()
    })

    it('handles logout errors gracefully', async () => {
      mockGetIronSession.mockRejectedValueOnce(new Error('Session error'))

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Logout failed')
    })
  })
})
