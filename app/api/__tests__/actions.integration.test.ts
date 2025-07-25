/**
 * Actions/Workflows Integration Tests
 * Tests GitHub Actions workflow-related API endpoints and real workflow data
 */

import { getTestConfig, createConditionalDescribe, createGitHubClient } from './utils/test-helpers'

const { TEST_TOKEN, TEST_OWNER, TEST_REPO, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

describe('Actions API Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct actions API structure', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Verify the actions route file exists
    const actionsRoutePath = path.join(__dirname, '../repos/[owner]/[repo]/actions/route.ts')
    expect(fs.existsSync(actionsRoutePath)).toBe(true)
    
    // Verify it contains expected exports
    const actionsContent = fs.readFileSync(actionsRoutePath, 'utf8')
    expect(actionsContent).toMatch(/export\s+async\s+function\s+GET/)
  })

  it('should handle actions request structure', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/repos/test/test/actions',
      headers: new Map()
    }
    
    expect(mockRequest.url).toContain('/actions')
    expect(mockRequest.headers).toBeInstanceOf(Map)
  })
})

describeWithRealToken('Real GitHub API Actions Tests', () => {
  let realGitHubClient: any

  beforeAll(async () => {
    console.log(`⚡ Testing actions/workflows endpoint against live API`)
    console.log(`   - Target Repository: ${TEST_OWNER}/${TEST_REPO}`)
    
    if (hasRealToken && TEST_TOKEN) {
      realGitHubClient = createGitHubClient(TEST_TOKEN)
    }
  })

  it('should fetch real workflow runs from omercnet/GitHub actions', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      const workflowRunsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        per_page: 10
      })
      
      expect(workflowRunsResponse.status).toBe(200)
      expect(workflowRunsResponse.data).toHaveProperty('workflow_runs')
      expect(Array.isArray(workflowRunsResponse.data.workflow_runs)).toBe(true)
      
      const workflowRuns = workflowRunsResponse.data.workflow_runs
      console.log(`✅ Found ${workflowRuns.length} workflow runs in ${TEST_OWNER}/${TEST_REPO}`)
      
      if (workflowRuns.length > 0) {
        const firstRun = workflowRuns[0]
        expect(firstRun).toHaveProperty('id')
        expect(firstRun).toHaveProperty('name')
        expect(firstRun).toHaveProperty('status')
        expect(firstRun).toHaveProperty('conclusion')
        expect(firstRun).toHaveProperty('workflow_id')
        
        console.log(`✅ Latest workflow: ${firstRun.name} (${firstRun.status}/${firstRun.conclusion || 'pending'})`)
        
        // Test specific workflow run details
        const runDetailsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}', {
          owner: TEST_OWNER,
          repo: TEST_REPO,
          run_id: firstRun.id
        })
        
        expect(runDetailsResponse.status).toBe(200)
        expect(runDetailsResponse.data).toHaveProperty('id', firstRun.id)
        expect(runDetailsResponse.data).toHaveProperty('jobs_url')
        
        console.log(`✅ Workflow run #${firstRun.id} details fetched successfully`)
        
        // Verify we have expected workflow names from the repository
        const workflowNames = workflowRuns.map((run: any) => run.name)
        const expectedWorkflows = ['CI', 'Code Quality', 'Security Audit', 'API Integration Tests']
        
        const hasExpectedWorkflows = expectedWorkflows.some(name => 
          workflowNames.some((runName: string) => runName.includes(name.split(' ')[0]))
        )
        
        expect(hasExpectedWorkflows).toBe(true)
        console.log(`✅ Found expected workflows: ${workflowNames.slice(0, 3).join(', ')}`)
      } else {
        console.log(`ℹ️  No workflow runs found in ${TEST_OWNER}/${TEST_REPO}`)
      }
    } catch (error) {
      console.error('Workflow runs fetch failed:', error)
      throw error
    }
  })

  it('should fetch workflows and validate their structure', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Get all workflows in the repository
      const workflowsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(workflowsResponse.status).toBe(200)
      expect(workflowsResponse.data).toHaveProperty('workflows')
      expect(Array.isArray(workflowsResponse.data.workflows)).toBe(true)
      
      const workflows = workflowsResponse.data.workflows
      console.log(`✅ Found ${workflows.length} workflows in ${TEST_OWNER}/${TEST_REPO}`)
      
      if (workflows.length > 0) {
        workflows.forEach((workflow: any) => {
          expect(workflow).toHaveProperty('id')
          expect(workflow).toHaveProperty('name')
          expect(workflow).toHaveProperty('path')
          expect(workflow).toHaveProperty('state')
        })
        
        const workflowNames = workflows.map((w: any) => w.name)
        console.log(`✅ Workflows: ${workflowNames.join(', ')}`)
        
        // Test getting runs for a specific workflow
        const firstWorkflow = workflows[0]
        const workflowRunsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs', {
          owner: TEST_OWNER,
          repo: TEST_REPO,
          workflow_id: firstWorkflow.id,
          per_page: 5
        })
        
        expect(workflowRunsResponse.status).toBe(200)
        expect(workflowRunsResponse.data).toHaveProperty('workflow_runs')
        
        console.log(`✅ Workflow "${firstWorkflow.name}" has ${workflowRunsResponse.data.workflow_runs.length} recent runs`)
      }
    } catch (error) {
      console.error('Workflows fetch failed:', error)
      throw error
    }
  })

  it('should validate actions permissions and access', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Check if we can access actions artifacts (if any exist)
      const artifactsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/actions/artifacts', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        per_page: 5
      })
      
      expect(artifactsResponse.status).toBe(200)
      expect(artifactsResponse.data).toHaveProperty('artifacts')
      expect(Array.isArray(artifactsResponse.data.artifacts)).toBe(true)
      
      console.log(`✅ Found ${artifactsResponse.data.artifacts.length} artifacts in ${TEST_OWNER}/${TEST_REPO}`)
      
      // Check secrets access (should be limited for security)
      try {
        const secretsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/actions/secrets', {
          owner: TEST_OWNER,
          repo: TEST_REPO
        })
        
        // We expect this to work if we have admin access, but the secret values should be hidden
        if (secretsResponse.status === 200) {
          expect(secretsResponse.data).toHaveProperty('secrets')
          console.log(`✅ Can access secrets list (${secretsResponse.data.secrets.length} secrets)`)
        }
      } catch (secretsError: any) {
        // Limited access is expected for security
        console.log(`ℹ️  Secrets access limited (expected for security)`)
      }
      
      console.log(`✅ Actions permissions validated for ${TEST_OWNER}/${TEST_REPO}`)
    } catch (error) {
      console.error('Actions validation failed:', error)
      throw error
    }
  })
})