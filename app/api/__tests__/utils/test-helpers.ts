/**
 * Simple utilities for integration tests
 */

export const TEST_USER = "omercnet"
export const TEST_OWNER = "omercnet" 
export const TEST_REPO = "GitHub"

/**
 * Get test configuration
 */
export function getTestConfig() {
  const isTestingMode = process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH_FOR_TESTING === 'true'

  return {
    TEST_USER,
    TEST_OWNER,
    TEST_REPO,
    isTestingMode,
  }
}
