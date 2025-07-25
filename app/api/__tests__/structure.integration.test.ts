/**
 * API Route Structure Validation Tests
 * Tests that all required API route files exist and have correct exports
 */

describe('API Route Structure Validation', () => {
  it('should have all required API route files', () => {
    const fs = require('fs')
    const path = require('path')
    
    const requiredRoutes = [
      'login/route.ts',
      'repos/route.ts', 
      'orgs/route.ts',
      'repos/[owner]/[repo]/pulls/route.ts',
      'repos/[owner]/[repo]/actions/route.ts',
      'repos/[owner]/[repo]/contents/route.ts',
      'repos/[owner]/[repo]/status/route.ts',
      'repos/[owner]/[repo]/actions/[runId]/route.ts',
      'repos/[owner]/[repo]/pulls/[number]/merge/route.ts'
    ]
    
    requiredRoutes.forEach(route => {
      const routePath = path.join(__dirname, '..', route)
      expect(fs.existsSync(routePath)).toBe(true)
    })
  })

  it('should export correct HTTP methods', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Check login route exports POST
    const loginContent = fs.readFileSync(path.join(__dirname, '../login/route.ts'), 'utf8')
    expect(loginContent).toMatch(/export\s+async\s+function\s+POST/)
    
    // Check repos route exports GET
    const reposContent = fs.readFileSync(path.join(__dirname, '../repos/route.ts'), 'utf8')
    expect(reposContent).toMatch(/export\s+async\s+function\s+GET/)
    
    // Check orgs route exports GET
    const orgsContent = fs.readFileSync(path.join(__dirname, '../orgs/route.ts'), 'utf8')
    expect(orgsContent).toMatch(/export\s+async\s+function\s+GET/)
  })

  it('should import required dependencies', () => {
    const fs = require('fs')
    const path = require('path')
    
    // Check that routes import NextResponse
    const routeFiles = [
      'login/route.ts',
      'repos/route.ts',
      'orgs/route.ts'
    ]
    
    routeFiles.forEach(routeFile => {
      const content = fs.readFileSync(path.join(__dirname, '..', routeFile), 'utf8')
      expect(content).toMatch(/import.*NextResponse.*from.*next\/server/)
    })
  })
})