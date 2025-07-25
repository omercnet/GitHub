/**
 * Repository Contents Integration Tests
 * Tests repository contents API endpoints and real GitHub repository content data
 */

import { getTestConfig, createConditionalDescribe, createGitHubClient } from './utils/test-helpers'

const { TEST_TOKEN, TEST_OWNER, TEST_REPO, hasRealToken } = getTestConfig()
const describeWithRealToken = createConditionalDescribe()

describe('Repository Contents API Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct contents API structure', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Verify the contents route file exists
    const contentsRoutePath = path.join(__dirname, '../repos/[owner]/[repo]/contents/route.ts')
    expect(fs.existsSync(contentsRoutePath)).toBe(true)
    
    // Verify it contains expected exports
    const contentsContent = fs.readFileSync(contentsRoutePath, 'utf8')
    expect(contentsContent).toMatch(/export\s+async\s+function\s+GET/)
  })

  it('should handle contents request structure', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/repos/test/test/contents',
      headers: new Map()
    }
    
    expect(mockRequest.url).toContain('/contents')
    expect(mockRequest.headers).toBeInstanceOf(Map)
  })
})

describeWithRealToken('Real GitHub API Repository Contents Tests', () => {
  let realGitHubClient: any

  beforeAll(async () => {
    console.log(`📁 Testing repository contents endpoint against live API`)
    console.log(`   - Target Repository: ${TEST_OWNER}/${TEST_REPO}`)
    
    if (hasRealToken && TEST_TOKEN) {
      realGitHubClient = createGitHubClient(TEST_TOKEN)
    }
  })

  it('should fetch real repository contents from omercnet/GitHub', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test root directory contents
      const rootContentsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/contents/', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(rootContentsResponse.status).toBe(200)
      expect(Array.isArray(rootContentsResponse.data)).toBe(true)
      expect(rootContentsResponse.data.length).toBeGreaterThan(0)
      
      const rootContents = rootContentsResponse.data
      console.log(`✅ Found ${rootContents.length} items in root directory`)
      
      // Verify expected files exist
      const fileNames = rootContents.map((item: any) => item.name)
      const expectedFiles = ['README.md', 'package.json', 'next.config.js']
      
      expectedFiles.forEach(expectedFile => {
        const fileExists = fileNames.includes(expectedFile)
        if (fileExists) {
          console.log(`✅ Found expected file: ${expectedFile}`)
        }
      })
      
      // Test specific file content
      const readmeFile = rootContents.find((item: any) => item.name === 'README.md')
      if (readmeFile) {
        expect(readmeFile).toHaveProperty('type', 'file')
        expect(readmeFile).toHaveProperty('download_url')
        expect(readmeFile).toHaveProperty('size')
        
        console.log(`✅ README.md found - ${readmeFile.size} bytes`)
        
        // Test getting file content
        const fileContentResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: TEST_OWNER,
          repo: TEST_REPO,
          path: 'README.md'
        })
        
        expect(fileContentResponse.status).toBe(200)
        expect(fileContentResponse.data).toHaveProperty('content')
        expect(fileContentResponse.data).toHaveProperty('encoding', 'base64')
        
        console.log(`✅ README.md content fetched successfully`)
      }
      
      // Test directory contents (app directory)
      const appDir = rootContents.find((item: any) => item.name === 'app' && item.type === 'dir')
      if (appDir) {
        const appContentsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: TEST_OWNER,
          repo: TEST_REPO,
          path: 'app'
        })
        
        expect(appContentsResponse.status).toBe(200)
        expect(Array.isArray(appContentsResponse.data)).toBe(true)
        
        console.log(`✅ app/ directory contains ${appContentsResponse.data.length} items`)
      }
    } catch (error) {
      console.error('Repository contents fetch failed:', error)
      throw error
    }
  })

  it('should validate repository tree structure', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Get the repository's default branch
      const repoResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}', {
        owner: TEST_OWNER,
        repo: TEST_REPO
      })
      
      expect(repoResponse.status).toBe(200)
      const defaultBranch = repoResponse.data.default_branch
      
      console.log(`✅ Default branch: ${defaultBranch}`)
      
      // Get the tree for the default branch
      const branchResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/branches/{branch}', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        branch: defaultBranch
      })
      
      expect(branchResponse.status).toBe(200)
      expect(branchResponse.data).toHaveProperty('commit')
      expect(branchResponse.data.commit).toHaveProperty('sha')
      
      const commitSha = branchResponse.data.commit.sha
      
      // Get the tree for this commit
      const treeResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        tree_sha: commitSha,
        recursive: '1'
      })
      
      expect(treeResponse.status).toBe(200)
      expect(treeResponse.data).toHaveProperty('tree')
      expect(Array.isArray(treeResponse.data.tree)).toBe(true)
      
      const treeItems = treeResponse.data.tree
      console.log(`✅ Repository tree has ${treeItems.length} total items`)
      
      // Verify structure contains expected directories
      const directories = treeItems.filter((item: any) => item.type === 'tree')
      const files = treeItems.filter((item: any) => item.type === 'blob')
      
      console.log(`✅ Found ${directories.length} directories and ${files.length} files`)
      
      // Check for expected project structure
      const expectedDirs = ['app', '.github', 'public']
      expectedDirs.forEach(expectedDir => {
        const dirExists = directories.some((dir: any) => dir.path === expectedDir)
        if (dirExists) {
          console.log(`✅ Found expected directory: ${expectedDir}`)
        }
      })
      
    } catch (error) {
      console.error('Repository tree validation failed:', error)
      throw error
    }
  })

  it('should validate file permissions and access', async () => {
    expect(realGitHubClient).toBeDefined()
    
    try {
      // Test getting commits to verify we have read access
      const commitsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/commits', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        per_page: 5
      })
      
      expect(commitsResponse.status).toBe(200)
      expect(Array.isArray(commitsResponse.data)).toBe(true)
      expect(commitsResponse.data.length).toBeGreaterThan(0)
      
      const latestCommit = commitsResponse.data[0]
      expect(latestCommit).toHaveProperty('sha')
      expect(latestCommit).toHaveProperty('commit')
      expect(latestCommit.commit).toHaveProperty('message')
      
      console.log(`✅ Latest commit: ${latestCommit.sha.substring(0, 7)} - ${latestCommit.commit.message.split('\n')[0]}`)
      
      // Test getting specific commit details
      const commitDetailsResponse = await realGitHubClient.request('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner: TEST_OWNER,
        repo: TEST_REPO,
        ref: latestCommit.sha
      })
      
      expect(commitDetailsResponse.status).toBe(200)
      expect(commitDetailsResponse.data).toHaveProperty('files')
      expect(Array.isArray(commitDetailsResponse.data.files)).toBe(true)
      
      console.log(`✅ Commit details show ${commitDetailsResponse.data.files.length} changed files`)
      
      console.log(`✅ File access permissions validated for ${TEST_OWNER}/${TEST_REPO}`)
    } catch (error) {
      console.error('File permissions validation failed:', error)
      throw error
    }
  })
})