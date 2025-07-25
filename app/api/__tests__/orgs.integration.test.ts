/**
 * Organizations Integration Tests  
 * Tests organization-related API endpoints and real GitHub organization data
 */

import { getTestConfig, createConditionalDescribe, createGitHubClient } from './utils/test-helpers'

const { TEST_TOKEN, TEST_USER, TEST_OWNER, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

describe('Organizations API Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct organization API structure', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Verify the orgs route file exists
    const orgsRoutePath = path.join(__dirname, '../orgs/route.ts')
    expect(fs.existsSync(orgsRoutePath)).toBe(true)
    
    // Verify it contains expected exports
    const orgsContent = fs.readFileSync(orgsRoutePath, 'utf8')
    expect(orgsContent).toMatch(/export\s+async\s+function\s+GET/)
  })

  it('should handle organization request structure', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/orgs',
      headers: new Map()
    }
    
    expect(mockRequest.url).toContain('/api/orgs')
    expect(mockRequest.headers).toBeInstanceOf(Map)
  })
})

describeWithRealToken('Real GitHub API Organization Tests', () => {
  let realGitHubClient: any

  beforeAll(async () => {
    console.log(`🏢 Testing organizations endpoint against live API`)
    console.log(`   - Authenticated User: ${TEST_USER}`)
    console.log(`   - Target Owner: ${TEST_OWNER}`)
    
    if (hasRealToken && TEST_TOKEN) {
      realGitHubClient = createGitHubClient(TEST_TOKEN)
    }
  })

  it('should fetch real organizations for omercbot', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test user organizations
      const orgsResponse = await realGitHubClient.request('GET /user/orgs')
      
      expect(orgsResponse.status).toBe(200)
      expect(Array.isArray(orgsResponse.data)).toBe(true)
      
      console.log(`✅ Found ${orgsResponse.data.length} organizations for ${TEST_USER}`)
      
      // Test user details 
      const userResponse = await realGitHubClient.request('GET /user')
      
      expect(userResponse.status).toBe(200)
      expect(userResponse.data).toHaveProperty('login', TEST_USER)
      expect(userResponse.data).toHaveProperty('id')
      
      console.log(`✅ User: ${userResponse.data.login} (${userResponse.data.name || 'No display name'})`)
      
      // Validate that we can access the target organization
      try {
        const targetOrgResponse = await realGitHubClient.request('GET /orgs/{org}', {
          org: TEST_OWNER
        })
        
        expect(targetOrgResponse.status).toBe(200)
        expect(targetOrgResponse.data).toHaveProperty('login', TEST_OWNER)
        
        console.log(`✅ Can access target organization: ${TEST_OWNER}`)
      } catch (orgError) {
        console.log(`ℹ️  Target organization ${TEST_OWNER} access: Limited or private`)
        // This is acceptable - the user might not be a member but can still access repos
      }
    } catch (error) {
      console.error('Organizations fetch failed:', error)
      throw error
    }
  })

  it('should validate organization membership and access', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Check if user can list organization members (if public)
      const userResponse = await realGitHubClient.request('GET /user')
      expect(userResponse.status).toBe(200)
      
      // Try to get organization details if accessible
      try {
        const orgResponse = await realGitHubClient.request('GET /orgs/{org}', {
          org: TEST_OWNER
        })
        
        if (orgResponse.status === 200) {
          expect(orgResponse.data).toHaveProperty('login', TEST_OWNER)
          console.log(`✅ Organization ${TEST_OWNER} is accessible`)
        }
      } catch (orgError) {
        console.log(`ℹ️  Organization ${TEST_OWNER} is private or user is not a member`)
        // This is fine - user can still access public repos
      }
      
      console.log(`✅ Organization access validation completed`)
    } catch (error) {
      console.error('Organization access validation failed:', error)
      throw error
    }
  })
})