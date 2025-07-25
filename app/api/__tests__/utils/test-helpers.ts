/**
 * Shared utilities for integration tests of Next.js API routes
 */

export const TEST_USER = 'omercbot' // The authenticated user (token holder)
export const TEST_OWNER = 'omercnet' // The repository owner
export const TEST_REPO = 'GitHub'

/**
 * Check if provided token appears to be a real GitHub token
 * Real GitHub tokens start with specific prefixes
 */
export function isRealGitHubToken(token?: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }
  
  // Check for known GitHub token prefixes
  const validPrefixes = ['ghp_', 'github_pat_', 'gho_', 'ghu_', 'ghs_', 'ghr_']
  return validPrefixes.some(prefix => token.startsWith(prefix)) && token.length > 20
}

/**
 * Get test configuration
 */
export function getTestConfig() {
  const TEST_TOKEN = process.env.TEST_TOKEN
  const hasRealToken = isRealGitHubToken(TEST_TOKEN)
  
  return {
    TEST_TOKEN,
    TEST_USER,
    TEST_OWNER,
    TEST_REPO,
    hasRealToken,
    shouldRunRealApiTests: hasRealToken
  }
}

/**
 * Create a conditional describe function that runs only with real tokens
 */
export function createConditionalDescribe() {
  const { hasRealToken } = getTestConfig()
  return hasRealToken ? describe : describe.skip
}