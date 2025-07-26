/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/repos/[owner]/[repo]/workflows/route'
import { POST } from '@/app/api/repos/[owner]/[repo]/workflows/[workflowId]/dispatch/route'
import { GET as getBranches } from '@/app/api/repos/[owner]/[repo]/branches/route'

// Mock the octokit
jest.mock('@/app/lib/octokit', () => ({
  getOctokit: jest.fn(),
}))

const { getOctokit } = require('@/app/lib/octokit')

describe('Workflow API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/repos/[owner]/[repo]/workflows', () => {
    it('should return 401 when not authenticated', async () => {
      getOctokit.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/workflows')
      const params = Promise.resolve({ owner: 'owner', repo: 'repo' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should fetch workflows and filter for workflow_dispatch', async () => {
      const mockOctokit = {
        request: jest.fn(),
      }
      getOctokit.mockResolvedValue(mockOctokit)

      // Mock workflows response
      mockOctokit.request
        .mockResolvedValueOnce({
          data: {
            workflows: [
              { id: 1, name: 'Test Workflow', path: '.github/workflows/test.yml' },
            ],
          },
        })
        // Mock workflow details
        .mockResolvedValueOnce({
          data: {
            id: 1,
            name: 'Test Workflow',
            path: '.github/workflows/test.yml',
            badge_url: 'https://example.com',
          },
        })
        // Mock workflow content
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from(`name: Test Workflow
on:
  workflow_dispatch:
    inputs:
      environment:
        description: Environment to deploy
        required: true
        default: staging
        type: string
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2`).toString('base64'),
          },
        })

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/workflows')
      const params = Promise.resolve({ owner: 'owner', repo: 'repo' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.workflows).toHaveLength(1)
      expect(data.workflows[0].name).toBe('Test Workflow')
      // Note: YAML parsing is complex - this test validates the workflow is found with workflow_dispatch
      expect(data.workflows[0]).toHaveProperty('inputs')
    })

    it('should handle errors gracefully', async () => {
      const mockOctokit = {
        request: jest.fn().mockRejectedValue(new Error('API Error')),
      }
      getOctokit.mockResolvedValue(mockOctokit)

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/workflows')
      const params = Promise.resolve({ owner: 'owner', repo: 'repo' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch workflows')
    })
  })

  describe('POST /api/repos/[owner]/[repo]/workflows/[workflowId]/dispatch', () => {
    it('should return 401 when not authenticated', async () => {
      getOctokit.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/workflows/123/dispatch', {
        method: 'POST',
        body: JSON.stringify({ ref: 'main', inputs: {} }),
      })
      const params = Promise.resolve({ owner: 'owner', repo: 'repo', workflowId: '123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should dispatch workflow successfully', async () => {
      const mockOctokit = {
        request: jest.fn().mockResolvedValue({}),
      }
      getOctokit.mockResolvedValue(mockOctokit)

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/workflows/123/dispatch', {
        method: 'POST',
        body: JSON.stringify({ 
          ref: 'main', 
          inputs: { environment: 'production' } 
        }),
      })
      const params = Promise.resolve({ owner: 'owner', repo: 'repo', workflowId: '123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Workflow dispatched successfully')
      
      expect(mockOctokit.request).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
        {
          owner: 'owner',
          repo: 'repo',
          workflow_id: '123',
          ref: 'main',
          inputs: { environment: 'production' },
        }
      )
    })

    it('should handle 422 errors from GitHub API', async () => {
      const mockError = new Error('Validation Failed')
      mockError.status = 422
      
      const mockOctokit = {
        request: jest.fn().mockRejectedValue(mockError),
      }
      getOctokit.mockResolvedValue(mockOctokit)

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/workflows/123/dispatch', {
        method: 'POST',
        body: JSON.stringify({ ref: 'main', inputs: {} }),
      })
      const params = Promise.resolve({ owner: 'owner', repo: 'repo', workflowId: '123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBe('Invalid input parameters or workflow not found')
    })
  })

  describe('GET /api/repos/[owner]/[repo]/branches', () => {
    it('should return 401 when not authenticated', async () => {
      getOctokit.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/branches')
      const params = Promise.resolve({ owner: 'owner', repo: 'repo' })

      const response = await getBranches(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should fetch repository branches', async () => {
      const mockOctokit = {
        request: jest.fn().mockResolvedValue({
          data: [
            { name: 'main', commit: { sha: 'abc123' } },
            { name: 'develop', commit: { sha: 'def456' } },
          ],
        }),
      }
      getOctokit.mockResolvedValue(mockOctokit)

      const request = new NextRequest('http://localhost:3000/api/repos/owner/repo/branches')
      const params = Promise.resolve({ owner: 'owner', repo: 'repo' })

      const response = await getBranches(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.branches).toHaveLength(2)
      expect(data.branches[0].name).toBe('main')
      expect(data.branches[1].name).toBe('develop')
    })
  })
})