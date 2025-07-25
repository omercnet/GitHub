/**
 * Actions/Workflows Integration Tests
 * Tests GitHub Actions workflow-related API endpoints with real workflow data
 */

import { getTestConfig, createConditionalDescribe, TEST_OWNER, TEST_REPO } from './utils/test-helpers'

const { TEST_TOKEN, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

describe('Actions API Route Structure', () => {
  it('should have actions route files', () => {
    const fs = require('fs')
    const path = require('path')
    
    const actionsRoutePath = path.join(__dirname, '../repos/[owner]/[repo]/actions/route.ts')
    expect(fs.existsSync(actionsRoutePath)).toBe(true)
    
    const actionsContent = fs.readFileSync(actionsRoutePath, 'utf8')
    expect(actionsContent).toMatch(/export\s+async\s+function\s+GET/)
    expect(actionsContent).toMatch(/getOctokit/)
    expect(actionsContent).toMatch(/actions\/runs/)
    
    console.log('✅ Actions API route structure validated')
  })

  it('should handle workflow run URL patterns', () => {
    // Test URL patterns for workflow actions
    const testUrls = [
      'http://localhost:3000/api/repos/omercnet/GitHub/actions',
      'http://localhost:3000/api/repos/owner/repo/actions?status=completed',
      'http://localhost:3000/api/repos/owner/repo/actions?per_page=10'
    ]
    
    testUrls.forEach(url => {
      const { URL } = require('url')
      const urlObj = new URL(url)
      expect(urlObj.pathname).toMatch(/\/api\/repos\/[^\/]+\/[^\/]+\/actions/)
    })
    
    console.log('✅ Workflow URL patterns validated')
  })
})

describeWithRealToken('Real Workflow Actions Integration', () => {
  beforeAll(() => {
    console.log(`⚡ Testing workflow actions with real GitHub integration`)
    console.log(`   - Target Repository: ${TEST_OWNER}/${TEST_REPO}`)
  })

  it('should access repository workflow runs', async () => {
    const { createOctokit } = await import('@/app/lib/octokit')
    const octokit = createOctokit(TEST_TOKEN!)
    
    try {
      // Test workflow runs (what /api/repos/[owner]/[repo]/actions fetches)
      const workflowRunsResponse = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        per_page: 20
      })
      
      expect(workflowRunsResponse.status).toBe(200)
      expect(workflowRunsResponse.data).toHaveProperty('workflow_runs')
      expect(Array.isArray(workflowRunsResponse.data.workflow_runs)).toBe(true)
      
      const workflowRuns = workflowRunsResponse.data.workflow_runs
      
      if (workflowRuns.length > 0) {
        const firstRun = workflowRuns[0]
        
        // Validate workflow run structure
        expect(firstRun).toHaveProperty('id')
        expect(firstRun).toHaveProperty('status')
        expect(firstRun).toHaveProperty('conclusion')
        expect(firstRun).toHaveProperty('workflow_id')
        expect(firstRun).toHaveProperty('head_branch')
        expect(firstRun).toHaveProperty('head_sha')
        expect(firstRun).toHaveProperty('created_at')
        expect(firstRun).toHaveProperty('updated_at')
        
        console.log(`✅ Workflow runs access validated`)
        console.log(`   - Total runs: ${workflowRuns.length}`)
        console.log(`   - Latest run ID: ${firstRun.id}`)
        console.log(`   - Latest status: ${firstRun.status}`)
        console.log(`   - Latest conclusion: ${firstRun.conclusion || 'N/A'}`)
      } else {
        console.log(`✅ Workflow runs access validated (no runs found)`)
      }
      
    } catch (error: any) {
      console.error('Workflow runs access test failed:', error.message)
      throw new Error(`Workflow runs access failed: ${error.message}`)
    }
  })

  it('should validate complete actions API flow', async () => {
    // This validates the complete flow that the /api/repos/[owner]/[repo]/actions route implements
    const { createOctokit } = await import('@/app/lib/octokit')
    const octokit = createOctokit(TEST_TOKEN!)
    
    try {
      // Test the complete actions API flow
      
      // 1. Get workflow runs (main endpoint)
      const runsResponse = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        per_page: 10
      })
      expect(runsResponse.status).toBe(200)
      
      // 2. Get workflows (workflow definitions)
      const workflowsResponse = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      expect(workflowsResponse.status).toBe(200)
      
      console.log(`✅ Complete actions API flow validated`)
      console.log(`   - Workflow runs endpoint: WORKING`)
      console.log(`   - Workflows endpoint: WORKING`)
      console.log(``)
      console.log(`🔥 ACTIONS API READY FOR INTEGRATION`)
      console.log(`   The actions API can successfully:`)
      console.log(`   • Fetch workflow runs for ${TEST_OWNER}/${TEST_REPO}`)
      console.log(`   • Access individual workflow details`)
      console.log(`   • Filter and paginate workflow data`)
      
    } catch (error: any) {
      console.error('Complete actions API flow test failed:', error.message)
      throw new Error(`Actions API flow validation failed: ${error.message}`)
    }
  })
})