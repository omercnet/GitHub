/**
 * GitHub API test helper utilities
 * Provides HTTP-based GitHub API testing without ES module dependencies
 */

export interface GitHubApiResponse {
  status: number
  data?: any
  body?: string
  headers?: any
}

/**
 * Make a request to GitHub API using Node.js built-in https module
 * Avoids ES module import issues with @octokit/core
 */
export function makeGitHubRequest(
  path: string, 
  token: string, 
  method: string = 'GET'
): Promise<GitHubApiResponse> {
  const https = require('https')
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'GitHub-Integration-Test',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res: any) => {
      let body = ''
      res.on('data', (chunk: any) => body += chunk)
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body)
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers })
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers })
        }
      })
    })
    
    req.on('error', reject)
    req.end()
  })
}

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  USER: 'omercbot',
  OWNER: 'omercnet', 
  REPO: 'omercnet/GitHub',
  REPO_NAME: 'GitHub'
}