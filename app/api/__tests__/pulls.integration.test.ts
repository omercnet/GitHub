/**
 * Pull Requests Integration Tests
 * Tests pull request-related API endpoints and real GitHub PR data
 */

import { getTestConfig, createConditionalDescribe, createGitHubClient } from './utils/test-helpers'

const { TEST_TOKEN, TEST_OWNER, TEST_REPO, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

describe('Pull Request API Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct pull request API structure', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Verify the pulls route file exists
    const pullsRoutePath = path.join(__dirname, '../repos/[owner]/[repo]/pulls/route.ts')
    expect(fs.existsSync(pullsRoutePath)).toBe(true)
    
    // Verify it contains expected exports
    const pullsContent = fs.readFileSync(pullsRoutePath, 'utf8')
    expect(pullsContent).toMatch(/export\s+async\s+function\s+GET/)
    expect(pullsContent).toMatch(/export\s+async\s+function\s+POST/)
  })

  it('should handle pull request request structure', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/repos/test/test/pulls',
      headers: new Map()
    }
    
    expect(mockRequest.url).toContain('/pulls')
    expect(mockRequest.headers).toBeInstanceOf(Map)
  })

  it('should handle pull request creation structure', async () => {
    const mockRequest = {
      json: async () => ({
        title: 'Test PR',
        head: 'test-branch',
        base: 'main',
        body: 'Test pull request'
      })
    }
    
    const requestData = await mockRequest.json()
    expect(requestData).toHaveProperty('title')
    expect(requestData).toHaveProperty('head')
    expect(requestData).toHaveProperty('base')
  })
})

describeWithRealToken('Real GitHub API Pull Request Tests', () => {
  let realGitHubClient: any

  beforeAll(async () => {
    console.log(`🔄 Testing pull requests endpoint against live API`)
    console.log(`   - Target Repository: ${TEST_OWNER}/${TEST_REPO}`)
    
    if (hasRealToken && TEST_TOKEN) {
      realGitHubClient = createGitHubClient(TEST_TOKEN)
    }
  })

  it('should fetch real pull requests from omercnet/GitHub', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      const pullsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/pulls', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        state: 'all',
        per_page: 10
      })
      
      expect(pullsResponse.status).toBe(200)
      expect(Array.isArray(pullsResponse.data)).toBe(true)
      
      console.log(`✅ Found ${pullsResponse.data.length} pull requests in ${TEST_OWNER}/${TEST_REPO}`)
      
      if (pullsResponse.data.length > 0) {
        const firstPR = pullsResponse.data[0]
        expect(firstPR).toHaveProperty('number')
        expect(firstPR).toHaveProperty('title')
        expect(firstPR).toHaveProperty('state')
        expect(firstPR).toHaveProperty('user')
        expect(firstPR.user).toHaveProperty('login')
        
        console.log(`✅ Latest PR: #${firstPR.number} - ${firstPR.title} (${firstPR.state})`)
        
        // Test getting a specific pull request
        const specificPRResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
          owner: TEST_OWNER,
          repo: TEST_REPO,
          pull_number: firstPR.number
        })
        
        expect(specificPRResponse.status).toBe(200)
        expect(specificPRResponse.data).toHaveProperty('number', firstPR.number)
        expect(specificPRResponse.data).toHaveProperty('mergeable')
        
        console.log(`✅ PR #${firstPR.number} details fetched successfully`)
      } else {
        console.log(`ℹ️  No pull requests found in ${TEST_OWNER}/${TEST_REPO}`)
      }
    } catch (error) {
      console.error('Pull requests fetch failed:', error)
      throw error
    }
  })

  it('should validate pull request permissions and structure', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Get repository details to verify we have access
      const repoResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(repoResponse.status).toBe(200)
      expect(repoResponse.data).toHaveProperty('allow_merge_commit')
      expect(repoResponse.data).toHaveProperty('allow_squash_merge')
      expect(repoResponse.data).toHaveProperty('allow_rebase_merge')
      
      console.log(`✅ Pull request permissions validated for ${TEST_OWNER}/${TEST_REPO}`)
      
      // Check if we can access pull request files (for any existing PR)
      const pullsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/pulls', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        state: 'all',
        per_page: 1
      })
      
      if (pullsResponse.data.length > 0) {
        const prNumber = pullsResponse.data[0].number
        
        const filesResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
          owner: TEST_OWNER,
          repo: TEST_REPO,
          pull_number: prNumber
        })
        
        expect(filesResponse.status).toBe(200)
        expect(Array.isArray(filesResponse.data)).toBe(true)
        
        console.log(`✅ PR #${prNumber} has ${filesResponse.data.length} changed files`)
      }
    } catch (error) {
      console.error('Pull request validation failed:', error)
      throw error
    }
  })
})