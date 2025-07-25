/**
 * Integration tests for configuration and setup
 */

describe('Application Configuration', () => {
  describe('Test Environment Setup', () => {
    it('should be running in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('should have test-specific environment variables', () => {
      expect(process.env.SECRET_COOKIE_PASSWORD).toBe('test_password_at_least_32_characters_long')
    })
  })

  describe('Module Loading', () => {
    it('should be able to import session module', async () => {
      const sessionModule = await import('../session')
      expect(sessionModule).toBeDefined()
      expect(sessionModule.sessionOptions).toBeDefined()
      expect(sessionModule.defaultSession).toBeDefined()
    })

    it('should have consistent exports from session module', async () => {
      const sessionModule = await import('../session')
      expect(typeof sessionModule.sessionOptions).toBe('object')
      expect(typeof sessionModule.defaultSession).toBe('object')
    })
  })

  describe('Configuration Validation', () => {
    it('should have valid session configuration', async () => {
      const { sessionOptions } = await import('../session')
      
      expect(sessionOptions.cookieName).toBe('github-ui-session')
      expect(sessionOptions.password.length).toBeGreaterThanOrEqual(32)
      expect(sessionOptions.cookieOptions).toEqual({
        httpOnly: true,
        secure: false, // test environment
        sameSite: 'lax',
      })
    })

    it('should handle production environment configuration', () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true
      })
      
      // Clear module cache to get fresh import
      jest.resetModules()
      
      return import('../session').then(({ sessionOptions }) => {
        expect(sessionOptions.cookieOptions?.secure).toBe(true)
        
        // Restore original environment
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          configurable: true
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      const originalPassword = process.env.SECRET_COOKIE_PASSWORD
      delete process.env.SECRET_COOKIE_PASSWORD
      
      jest.resetModules()
      
      return import('../session').then(({ sessionOptions }) => {
        expect(sessionOptions.password).toBe('complex_password_at_least_32_characters_long')
        
        // Restore original environment
        process.env.SECRET_COOKIE_PASSWORD = originalPassword
      })
    })
  })
})