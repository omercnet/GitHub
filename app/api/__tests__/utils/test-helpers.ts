/**
 * Shared utilities for integration tests of Next.js API routes
 */

export const TEST_USER = 'omercbot' // The authenticated user (token holder)
export const TEST_OWNER = 'omercnet' // The repository owner
export const TEST_REPO = 'omercnet/GitHub' // Full repository name

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

/**
 * Create a GitHub client for real API testing
 * Uses Node.js built-in https module to avoid ES module issues
 */
export function createGitHubClient(token?: string) {
  const https = require('https')
  
  if (!token) {
    throw new Error('GitHub token is required for API client')
  }
  
  return {
    async request(method: string, path: string, data?: any) {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.github.com',
          port: 443,
          path,
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Clone-Integration-Tests/1.0',
            'Content-Type': 'application/json'
          }
        }
        
        const req = https.request(options, (res: any) => {
          let body = ''
          res.on('data', (chunk: any) => body += chunk)
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(body)
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(jsonData)
              } else {
                reject(new Error(`GitHub API error: ${res.statusCode} ${jsonData.message || body}`))
              }
            } catch (e) {
              reject(new Error(`Failed to parse response: ${body}`))
            }
          })
        })
        
        req.on('error', reject)
        
        if (data) {
          req.write(JSON.stringify(data))
        }
        
        req.end()
      })
    }
  }
}