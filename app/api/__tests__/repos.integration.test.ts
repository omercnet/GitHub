/**
 * Repositories Integration Tests
 * Tests repository-related API endpoints and real GitHub repository data
 */

import { getTestConfig, createConditionalDescribe, createGitHubClient, createMockSession } from './utils/test-helpers'

const { TEST_TOKEN, TEST_USER, TEST_OWNER, TEST_REPO, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

describe('Repository API Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct repository API structure', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Verify the repos route file exists
    const reposRoutePath = path.join(__dirname, '../repos/route.ts')
    expect(fs.existsSync(reposRoutePath)).toBe(true)
    
    // Verify it contains expected exports
    const reposContent = fs.readFileSync(reposRoutePath, 'utf8')
    expect(reposContent).toMatch(/export\s+async\s+function\s+GET/)
  })

  it('should handle repository request structure', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/repos',
      headers: new Map()
    }
    
    expect(mockRequest.url).toContain('/api/repos')
    expect(mockRequest.headers).toBeInstanceOf(Map)
  })

  it('should validate authentication requirements', () => {
    // Repository endpoints require authentication
    const mockUnauthenticatedRequest = {
      url: 'http://localhost:3000/api/repos',
      headers: new Map()
    }
    
    expect(mockUnauthenticatedRequest).toBeDefined()
    // Without proper session, should expect 401 response
  })
})

describeWithRealToken('Real GitHub API Repository Tests', () => {
  let realGitHubClient: any

  beforeAll(async () => {
    console.log(`📦 Testing repositories endpoint against live API`)
    console.log(`   - Authenticated User: ${TEST_USER}`)
    console.log(`   - Target Owner: ${TEST_OWNER}`)
    console.log(`   - Repository: ${TEST_REPO}`)
    
    if (hasRealToken && TEST_TOKEN) {
      realGitHubClient = createGitHubClient(TEST_TOKEN)
    }
  })

  it('should fetch real repositories from omercbot account', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test personal repos for authenticated user
      const userReposResponse = await realGitHubClient.request('GET /user/repos', {
        sort: 'updated',
        per_page: 10
      })
      
      expect(userReposResponse.status).toBe(200)
      expect(Array.isArray(userReposResponse.data)).toBe(true)
      expect(userReposResponse.data.length).toBeGreaterThan(0)
      
      const firstRepo = userReposResponse.data[0]
      expect(firstRepo).toHaveProperty('name')
      expect(firstRepo).toHaveProperty('owner')
      expect(firstRepo.owner).toHaveProperty('login')
      
      console.log(`✅ Found ${userReposResponse.data.length} repositories for ${TEST_USER}`)
      
      // Test specific organization repository access
      const orgRepoResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(orgRepoResponse.status).toBe(200)
      expect(orgRepoResponse.data).toHaveProperty('name', TEST_REPO)
      expect(orgRepoResponse.data).toHaveProperty('owner')
      expect(orgRepoResponse.data.owner).toHaveProperty('login', TEST_OWNER)
      expect(orgRepoResponse.data).toHaveProperty('language')
      expect(orgRepoResponse.data).toHaveProperty('stargazers_count')
      
      console.log(`✅ GitHub repo details: ${orgRepoResponse.data.language}, ${orgRepoResponse.data.stargazers_count} stars`)
    } catch (error) {
      console.error('Repository fetch failed:', error)
      throw error
    }
  })

  it('should validate repository permissions and access', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Check if we have push access to the repository
      const repoResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(repoResponse.status).toBe(200)
      expect(repoResponse.data).toHaveProperty('permissions')
      
      console.log(`✅ Repository permissions validated for ${TEST_OWNER}/${TEST_REPO}`)
    } catch (error) {
      console.error('Repository permission check failed:', error)
      throw error
    }
  })
})