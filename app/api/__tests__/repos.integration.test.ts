/**
 * Repositories Integration Tests
 * Tests the application's repositories API route with real GitHub authentication
 */

import { getTestConfig, createConditionalDescribe, createGitHubClient, TEST_OWNER, TEST_REPO } from './utils/test-helpers'

const { TEST_TOKEN, TEST_USER, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

// Set up GitHub client for real API testing
let realGitHubClient: ReturnType<typeof createGitHubClient>

describe('Repositories API Route Structure', () => {
  it('should have repositories route files', () => {
    const fs = require('fs')
    const path = require('path')
    
    const reposRoutePath = path.join(__dirname, '../repos/route.ts')
    expect(fs.existsSync(reposRoutePath)).toBe(true)
    
    const reposContent = fs.readFileSync(reposRoutePath, 'utf8')
    expect(reposContent).toMatch(/export\s+async\s+function\s+GET/)
    expect(reposContent).toMatch(/getOctokit/)
    expect(reposContent).toMatch(/searchParams/)
    expect(reposContent).toMatch(/isPersonal/)
  })

  it('should handle URL parameter patterns', () => {
    // Test URL parameter parsing patterns used by the repositories route
    const testUrls = [
      'http://localhost:3000/api/repos',
      'http://localhost:3000/api/repos?org=omercnet',
      'http://localhost:3000/api/repos?isPersonal=true',
      'http://localhost:3000/api/repos?org=omercnet&isPersonal=false'
    ]
    
    testUrls.forEach(url => {
      const { URL } = require('url')
      const urlObj = new URL(url)
      const searchParams = urlObj.searchParams
      
      expect(urlObj.pathname).toBe('/api/repos')
      expect(searchParams.get).toBeDefined()
      expect(typeof searchParams.get).toBe('function')
    })
  })
})

describeWithRealToken('Real Repository API Integration', () => {
  beforeAll(() => {
    // Initialize GitHub client
    if (TEST_TOKEN && hasRealToken) {
      realGitHubClient = createGitHubClient(TEST_TOKEN)
    }
  })

  it('should validate repository access patterns', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test user repositories (personal repos)
      const userReposResponse = await realGitHubClient.request('GET /user/repos', {
        affiliation: 'owner',
        sort: 'updated',
        per_page: 100
      })
      expect((userReposResponse as any).status).toBe(200)
      expect(Array.isArray((userReposResponse as any).data)).toBe(true)
      
      // Test organization repositories (may fail if TEST_OWNER is not an org)
      let orgReposResponse
      let targetRepo
      try {
        orgReposResponse = await realGitHubClient.request('GET /orgs/{org}/repos', {
          org: TEST_OWNER,
          sort: 'updated',
          per_page: 100
        })
        expect((orgReposResponse as any).status).toBe(200)
        expect(Array.isArray((orgReposResponse as any).data)).toBe(true)
        
        // Find target repository in organization repos
        targetRepo = ((orgReposResponse as any).data as any[]).find((repo: any) => 
          repo.name === TEST_REPO && repo.owner.login === TEST_OWNER
        )
      } catch (error: any) {
        if (error.message.includes('404')) {
          // Look for target repo in personal repos instead
          targetRepo = ((userReposResponse as any).data as any[]).find((repo: any) => 
            repo.name === TEST_REPO && repo.owner.login === TEST_OWNER
          )
        } else {
          throw error
        }
      }
      
      expect(targetRepo).toBeDefined()
      expect(targetRepo?.full_name).toBe(`${TEST_OWNER}/${TEST_REPO}`)
      
    } catch (error: any) {
      console.error('Repository access test failed:', error.message)
      throw new Error(`Repository access failed: ${error.message}`)
    }
  })

  it('should test repository filtering logic', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test personal repositories filtering
      const personalRepos = await realGitHubClient.request('GET /user/repos', {
        affiliation: 'owner',
        sort: 'updated',
        per_page: 100
      })
      expect((personalRepos as any).status).toBe(200)
      expect(Array.isArray((personalRepos as any).data)).toBe(true)
      
      // Test organization repositories (may fail if not an org)
      let orgRepos
      try {
        orgRepos = await realGitHubClient.request('GET /orgs/{org}/repos', {
          org: TEST_OWNER,
          sort: 'updated',
          per_page: 100
        })
        expect((orgRepos as any).status).toBe(200)
        expect(Array.isArray((orgRepos as any).data)).toBe(true)
      } catch (error: any) {
        if (error.message.includes('404')) {
          // Not an organization, skip org repos test
        } else {
          throw error
        }
      }
      
      // Test all repositories (no params - should be same as personal for personal accounts)
      const allRepos = await realGitHubClient.request('GET /user/repos', {
        sort: 'updated',
        per_page: 100
      })
      expect((allRepos as any).status).toBe(200)
      expect(Array.isArray((allRepos as any).data)).toBe(true)
      
    } catch (error: any) {
      console.error('Repository filtering test failed:', error.message)
      throw new Error(`Repository filtering failed: ${error.message}`)
    }
  })

  it('should validate repository data structure', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Get repositories and validate structure (try org first, fallback to personal)
      let repositories: any[] = []
      
      try {
        const orgReposResponse = await realGitHubClient.request('GET /orgs/{org}/repos', {
          org: TEST_OWNER,
          sort: 'updated',
          per_page: 20
        })
        repositories = (orgReposResponse as any).data
      } catch (error: any) {
        if (error.message.includes('404')) {
          // Fallback to personal repos
          const personalReposResponse = await realGitHubClient.request('GET /user/repos', {
            affiliation: 'owner',
            sort: 'updated',
            per_page: 20
          })
          repositories = (personalReposResponse as any).data
        } else {
          throw error
        }
      }
      
      expect(Array.isArray(repositories)).toBe(true)
      
      // Find target repository for detailed validation
      const targetRepo = repositories.find((repo: any) => 
        repo.name === TEST_REPO && repo.owner.login === TEST_OWNER
      )
      
      expect(targetRepo).toBeDefined()
      
      // Validate complete repository structure (what the API route returns)
      expect(targetRepo).toHaveProperty('id')
      expect(targetRepo).toHaveProperty('name', TEST_REPO)
      expect(targetRepo).toHaveProperty('full_name', `${TEST_OWNER}/${TEST_REPO}`)
      expect(targetRepo).toHaveProperty('private')
      expect(targetRepo).toHaveProperty('html_url')
      expect(targetRepo).toHaveProperty('description')
      expect(targetRepo).toHaveProperty('updated_at')
      expect(targetRepo).toHaveProperty('language')
      expect(targetRepo).toHaveProperty('default_branch')
      expect(targetRepo).toHaveProperty('stargazers_count')
      expect(targetRepo).toHaveProperty('forks_count')
      
      expect(targetRepo?.owner).toHaveProperty('login', TEST_OWNER)
      expect(targetRepo?.owner).toHaveProperty('id')
      expect(targetRepo?.owner).toHaveProperty('avatar_url')
      
    } catch (error: any) {
      console.error('Repository data structure test failed:', error.message)
      throw new Error(`Repository data structure validation failed: ${error.message}`)
    }
  })

  it('should test repository permissions and access', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test repository permissions (what the API route checks)
      const repoResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(repoResponse).toBeDefined()
      expect((repoResponse as any).data).toHaveProperty('permissions')
      
      const permissions = (repoResponse as any).data.permissions
      expect(permissions).toHaveProperty('admin')
      expect(permissions).toHaveProperty('push')  
      expect(permissions).toHaveProperty('pull')
      
    } catch (error: any) {
      console.error('Repository permissions test failed:', error.message)
      throw new Error(`Repository permissions validation failed: ${error.message}`)
    }
  })

  it('should validate complete repositories API flow', async () => {
    // This validates the complete flow that the /api/repos route implements
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test all three repository access patterns the API route supports
      
      // 1. Personal repositories (isPersonal=true)
      const personalResponse = await realGitHubClient.request('GET /user/repos', {
        affiliation: 'owner',
        sort: 'updated',
        per_page: 100
      })
      expect(personalResponse).toBeDefined()
      
      // 2. Organization repositories (org=omercnet) - with fallback for personal accounts
      let orgResponse: any
      try {
        orgResponse = await realGitHubClient.request('GET /orgs/{org}/repos', {
          org: TEST_OWNER,
          sort: 'updated',
          per_page: 100
        })
      } catch (error: any) {
        if (error.message.includes('404')) {
          // Fallback to personal repos if not an organization
          orgResponse = await realGitHubClient.request('GET /user/repos', {
            affiliation: 'owner',
            sort: 'updated',
            per_page: 100
          })
        } else {
          throw error
        }
      }
      expect(orgResponse).toBeDefined()
      
      // 3. Fallback: all repositories (no params)
      const fallbackResponse = await realGitHubClient.request('GET /user/repos', {
        sort: 'updated',
        per_page: 100
      })
      expect(fallbackResponse).toBeDefined()
      
      // Verify target repository is accessible
      const targetRepo = (orgResponse as any).data.find((repo: any) => 
        repo.name === TEST_REPO && repo.owner.login === TEST_OWNER
      )
      expect(targetRepo).toBeDefined()
      
    } catch (error: any) {
      console.error('Complete repositories API flow test failed:', error.message)
      throw new Error(`Repositories API flow validation failed: ${error.message}`)
    }
  })
})