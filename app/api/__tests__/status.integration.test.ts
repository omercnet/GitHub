/**
 * Repository Status Integration Tests
 * Tests repository status API endpoints and real GitHub repository status data
 */

import { getTestConfig, createConditionalDescribe, createGitHubClient } from './utils/test-helpers'

const { TEST_TOKEN, TEST_OWNER, TEST_REPO, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

describe('Repository Status API Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct status API structure', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Verify the status route file exists
    const statusRoutePath = path.join(__dirname, '../repos/[owner]/[repo]/status/route.ts')
    expect(fs.existsSync(statusRoutePath)).toBe(true)
    
    // Verify it contains expected exports
    const statusContent = fs.readFileSync(statusRoutePath, 'utf8')
    expect(statusContent).toMatch(/export\s+async\s+function\s+GET/)
  })

  it('should handle status request structure', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/repos/test/test/status',
      headers: new Map()
    }
    
    expect(mockRequest.url).toContain('/status')
    expect(mockRequest.headers).toBeInstanceOf(Map)
  })
})

describeWithRealToken('Real GitHub API Repository Status Tests', () => {
  let realGitHubClient: any

  beforeAll(async () => {
    console.log(`📊 Testing repository status endpoint against live API`)
    console.log(`   - Target Repository: ${TEST_OWNER}/${TEST_REPO}`)
    
    if (hasRealToken && TEST_TOKEN) {
      realGitHubClient = createGitHubClient(TEST_TOKEN)
    }
  })

  it('should fetch real repository status from omercnet/GitHub', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Get repository basic information
      const repoResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(repoResponse.status).toBe(200)
      expect(repoResponse.data).toHaveProperty('name', TEST_REPO)
      expect(repoResponse.data).toHaveProperty('full_name', `${TEST_OWNER}/${TEST_REPO}`)
      
      const repo = repoResponse.data
      console.log(`✅ Repository: ${repo.full_name}`)
      console.log(`   - Language: ${repo.language || 'Not specified'}`)
      console.log(`   - Stars: ${repo.stargazers_count}`)
      console.log(`   - Forks: ${repo.forks_count}`)
      console.log(`   - Issues: ${repo.open_issues_count}`)
      console.log(`   - Size: ${repo.size} KB`)
      console.log(`   - Created: ${new Date(repo.created_at).toLocaleDateString()}`)
      console.log(`   - Updated: ${new Date(repo.updated_at).toLocaleDateString()}`)
      
      // Validate repository properties
      expect(repo).toHaveProperty('stargazers_count')
      expect(repo).toHaveProperty('forks_count')
      expect(repo).toHaveProperty('open_issues_count')
      expect(repo).toHaveProperty('size')
      expect(repo).toHaveProperty('default_branch')
      expect(repo).toHaveProperty('language')
      expect(repo).toHaveProperty('license')
      
      // Get repository languages
      const languagesResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/languages', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(languagesResponse.status).toBe(200)
      const languages = Object.keys(languagesResponse.data)
      console.log(`✅ Languages: ${languages.join(', ')}`)
      
      // Get repository topics/tags
      const topicsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/topics', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(topicsResponse.status).toBe(200)
      expect(topicsResponse.data).toHaveProperty('names')
      console.log(`✅ Topics: ${topicsResponse.data.names.join(', ') || 'None'}`)
      
    } catch (error) {
      console.error('Repository status fetch failed:', error)
      throw error
    }
  })

  it('should validate repository health and status checks', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Get the default branch
      const repoResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      const defaultBranch = repoResponse.data.default_branch
      console.log(`✅ Default branch: ${defaultBranch}`)
      
      // Get branch protection status
      try {
        const protectionResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/branches/{branch}/protection', {
          owner: TEST_OWNER,
          repo: TEST_REPO,
          branch: defaultBranch
        })
        
        if (protectionResponse.status === 200) {
          console.log(`✅ Branch protection enabled for ${defaultBranch}`)
          expect(protectionResponse.data).toHaveProperty('required_status_checks')
        }
      } catch (protectionError: any) {
        if (protectionError.status === 404) {
          console.log(`ℹ️  No branch protection rules for ${defaultBranch}`)
        } else {
          console.log(`⚠️  Cannot access branch protection (${protectionError.status})`)
        }
      }
      
      // Get recent commits to check activity
      const commitsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/commits', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        per_page: 10
      })
      
      expect(commitsResponse.status).toBe(200)
      expect(Array.isArray(commitsResponse.data)).toBe(true)
      
      if (commitsResponse.data.length > 0) {
        const latestCommit = commitsResponse.data[0]
        const commitDate = new Date(latestCommit.commit.author.date)
        const daysSinceLastCommit = Math.floor((Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24))
        
        console.log(`✅ Latest commit: ${daysSinceLastCommit} days ago`)
        console.log(`   - Author: ${latestCommit.commit.author.name}`)
        console.log(`   - Message: ${latestCommit.commit.message.split('\n')[0]}`)
        
        expect(latestCommit).toHaveProperty('sha')
        expect(latestCommit.commit).toHaveProperty('author')
      }
      
      // Check repository collaborators (if accessible)
      try {
        const collaboratorsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/collaborators', {
          owner: TEST_OWNER,
          repo: TEST_REPO
        })
        
        if (collaboratorsResponse.status === 200) {
          console.log(`✅ Repository has ${collaboratorsResponse.data.length} collaborators`)
        }
      } catch (collabError: any) {
        console.log(`ℹ️  Collaborators list access limited`)
      }
      
    } catch (error) {
      console.error('Repository health check failed:', error)
      throw error
    }
  })

  it('should validate repository statistics and insights', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Get repository statistics
      const statsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/stats/contributors', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      // Stats might take time to generate, so 202 is acceptable
      if (statsResponse.status === 200) {
        expect(Array.isArray(statsResponse.data)).toBe(true)
        console.log(`✅ Contributor statistics available for ${statsResponse.data.length} contributors`)
      } else if (statsResponse.status === 202) {
        console.log(`ℹ️  Contributor statistics are being generated`)
      }
      
      // Get code frequency (if available)
      try {
        const codeFreqResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/stats/code_frequency', {
          owner: TEST_OWNER,
          repo: TEST_REPO
        })
        
        if (codeFreqResponse.status === 200) {
          console.log(`✅ Code frequency statistics available`)
        }
      } catch (freqError) {
        console.log(`ℹ️  Code frequency statistics not available`)
      }
      
      // Get repository events (recent activity)
      const eventsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/events', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        per_page: 10
      })
      
      expect(eventsResponse.status).toBe(200)
      expect(Array.isArray(eventsResponse.data)).toBe(true)
      
      console.log(`✅ Found ${eventsResponse.data.length} recent repository events`)
      
      if (eventsResponse.data.length > 0) {
        const eventTypes = [...new Set(eventsResponse.data.map((event: any) => event.type))]
        console.log(`   - Event types: ${eventTypes.join(', ')}`)
      }
      
      console.log(`✅ Repository statistics validated for ${TEST_OWNER}/${TEST_REPO}`)
    } catch (error) {
      console.error('Repository statistics validation failed:', error)
      throw error
    }
  })
})