/**
 * Shared utilities for integration tests
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

/**
 * Create a simple HTTP client for GitHub API calls
 * Uses Node.js built-in https module to avoid ES module issues
 */
export function createGitHubClient(token: string) {
  return {
    request: async (endpoint: string, params?: any) => {
      const https = require('https')
      const { URL } = require('url')
      
      // Parse endpoint
      const [method, path] = endpoint.split(' ')
      let urlPath = path || endpoint
      
      // Replace path parameters
      if (params) {
        Object.keys(params).forEach(key => {
          urlPath = urlPath.replace(`{${key}}`, params[key])
        })
      }
      
      // Build query string for GET requests
      let queryString = ''
      if (method === 'GET' && params) {
        const queryParams = new URLSearchParams()
        Object.keys(params).forEach(key => {
          if (!path?.includes(`{${key}}`)) {
            queryParams.append(key, params[key])
          }
        })
        if (queryParams.toString()) {
          queryString = `?${queryParams.toString()}`
        }
      }
      
      const url = new URL(`https://api.github.com${urlPath}${queryString}`)
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: url.hostname,
          port: 443,
          path: url.pathname + url.search,
          method: method || 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Integration-Tests',
            ...(method === 'POST' && params ? { 'Content-Type': 'application/json' } : {})
          }
        }
        
        const req = https.request(options, (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data)
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ status: res.statusCode, data: jsonData })
              } else {
                reject({ status: res.statusCode, message: res.statusMessage, data: jsonData })
              }
            } catch (error) {
              reject({ status: res.statusCode, message: 'Invalid JSON response' })
            }
          })
        })
        
        req.on('error', (error) => {
          reject({ status: 500, message: error.message })
        })
        
        if (method === 'POST' && params) {
          req.write(JSON.stringify(params))
        }
        
        req.end()
      })
    }
  }
}

/**
 * Mock session for testing
 */
export function createMockSession(isAuthenticated = true) {
  return {
    user: isAuthenticated ? {
      login: TEST_USER,
      id: 12345,
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      name: 'Test User'
    } : null,
    accessToken: isAuthenticated ? 'mock_token_12345' : null
  }
}

/**
 * Create mock Next.js request with session
 */
export function createMockRequest(session: any = null, body: any = {}) {
  return {
    json: async () => body,
    headers: new Map(),
    url: 'http://localhost:3000/api/test',
    method: 'GET'
  }
}