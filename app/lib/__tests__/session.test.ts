import { SessionData, sessionOptions, defaultSession } from '../session'

describe('Session Configuration', () => {
  describe('SessionData interface', () => {
    it('should allow optional token property', () => {
      const sessionWithToken: SessionData = { token: 'test-token' }
      const sessionWithoutToken: SessionData = {}
      
      expect(sessionWithToken.token).toBe('test-token')
      expect(sessionWithoutToken.token).toBeUndefined()
    })
  })

  describe('sessionOptions', () => {
    it('should have correct cookie name', () => {
      expect(sessionOptions.cookieName).toBe('github-ui-session')
    })

    it('should use environment password or fallback', () => {
      expect(sessionOptions.password).toBe('test_password_at_least_32_characters_long')
    })

    it('should have secure cookie options', () => {
      expect(sessionOptions.cookieOptions).toEqual({
        httpOnly: true,
        secure: false, // false in test environment
        sameSite: 'lax',
      })
    })

    it('should set secure to true in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      // Re-require the module to get updated env
      jest.resetModules()
      const { sessionOptions: prodSessionOptions } = require('../session')
      
      expect(prodSessionOptions.cookieOptions.secure).toBe(true)
      
      // Restore original env
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('defaultSession', () => {
    it('should be an empty object', () => {
      expect(defaultSession).toEqual({})
    })

    it('should not have a token property', () => {
      expect(defaultSession.token).toBeUndefined()
    })
  })
})