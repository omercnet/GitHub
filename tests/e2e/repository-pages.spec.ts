import { test, expect } from '@playwright/test';

// Mock GitHub API responses for testing
const mockRepoData = {
  repos: [
    {
      id: 1,
      name: 'test-repo',
      owner: { login: 'testuser' },
      full_name: 'testuser/test-repo',
      description: 'A test repository',
      private: false,
    }
  ],
  contents: [
    {
      name: 'README.md',
      type: 'file',
      path: 'README.md',
      download_url: 'https://github.com/testuser/test-repo/raw/main/README.md'
    },
    {
      name: 'src',
      type: 'dir',
      path: 'src'
    }
  ],
  pulls: [
    {
      id: 1,
      number: 1,
      title: 'Test PR',
      state: 'open',
      user: { login: 'testuser' },
      head: { ref: 'feature-branch' },
      base: { ref: 'main' }
    }
  ],
  actions: {
    workflow_runs: [
      {
        id: 1,
        name: 'CI',
        status: 'completed',
        conclusion: 'success',
        created_at: '2025-01-01T00:00:00Z'
      }
    ]
  }
};

test.describe('Repository Pages UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/repos', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRepoData.repos)
      });
    });
    
    await page.route('**/api/repos/testuser/test-repo/contents**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRepoData.contents)
      });
    });
    
    await page.route('**/api/repos/testuser/test-repo/pulls', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRepoData.pulls)
      });
    });
    
    await page.route('**/api/repos/testuser/test-repo/actions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRepoData.actions)
      });
    });
    
    // Mock login
    await page.route('**/api/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test('should render repository code page with proper styling', async ({ page }) => {
    // Navigate to repo code page (this will trigger login flow)
    await page.goto('/repos/testuser/test-repo/code');
    
    // Check if we're on login page first
    const currentUrl = page.url();
    if (currentUrl.includes('localhost:3000/') && !currentUrl.includes('/repos/')) {
      // Login first
      await page.fill('input[type="password"]', 'ghp_test_token');
      await page.click('button[type="submit"]');
      
      // Select repository if needed
      const repoSelect = page.locator('select');
      if (await repoSelect.isVisible()) {
        await repoSelect.selectOption('testuser/test-repo');
        await page.click('button:has-text("Continue")');
      }
    }
    
    // Now check the code page styling
    await page.waitForURL('**/repos/testuser/test-repo/code**');
    
    // Check dark theme consistency
    const body = page.locator('body');
    await expect(body).toHaveClass(/bg-gray-900/);
    await expect(body).toHaveClass(/text-white/);
    
    // Check navigation layout if it exists
    const nav = page.locator('nav').first();
    if (await nav.isVisible()) {
      // Nav styling may vary, just ensure it's visible
      await expect(nav).toBeVisible();
    }
    
    // Take screenshot for visual verification
    await expect(page).toHaveScreenshot('code-page.png');
  });

  test('should render pull requests page with proper styling', async ({ page }) => {
    await page.goto('/repos/testuser/test-repo/pulls');
    
    // Handle login flow if needed
    const currentUrl = page.url();
    if (currentUrl.includes('localhost:3000/') && !currentUrl.includes('/repos/')) {
      await page.fill('input[type="password"]', 'ghp_test_token');
      await page.click('button[type="submit"]');
      
      const repoSelect = page.locator('select');
      if (await repoSelect.isVisible()) {
        await repoSelect.selectOption('testuser/test-repo');
        await page.click('button:has-text("Continue")');
      }
    }
    
    await page.waitForURL('**/repos/testuser/test-repo/pulls**');
    
    // Check styling consistency
    const body = page.locator('body');
    await expect(body).toHaveClass(/bg-gray-900/);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('pulls-page.png');
  });

  test('should render actions page with proper styling', async ({ page }) => {
    await page.goto('/repos/testuser/test-repo/actions');
    
    // Handle login flow if needed
    const currentUrl = page.url();
    if (currentUrl.includes('localhost:3000/') && !currentUrl.includes('/repos/')) {
      await page.fill('input[type="password"]', 'ghp_test_token');
      await page.click('button[type="submit"]');
      
      const repoSelect = page.locator('select');
      if (await repoSelect.isVisible()) {
        await repoSelect.selectOption('testuser/test-repo');
        await page.click('button:has-text("Continue")');
      }
    }
    
    await page.waitForURL('**/repos/testuser/test-repo/actions**');
    
    // Check styling consistency
    const body = page.locator('body');
    await expect(body).toHaveClass(/bg-gray-900/);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('actions-page.png');
  });

  test('should maintain responsive design on all pages', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test each page type
    const pages = [
      '/repos/testuser/test-repo/code',
      '/repos/testuser/test-repo/pulls', 
      '/repos/testuser/test-repo/actions'
    ];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Handle login if on home page
      const currentUrl = page.url();
      if (currentUrl.includes('localhost:3000/') && !currentUrl.includes('/repos/')) {
        await page.fill('input[type="password"]', 'ghp_test_token');
        await page.click('button[type="submit"]');
        
        const repoSelect = page.locator('select');
        if (await repoSelect.isVisible()) {
          await repoSelect.selectOption('testuser/test-repo');
          await page.click('button:has-text("Continue")');
        }
      }
      
      // Check that content is visible and doesn't overflow
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Check for horizontal scroll (should not exist)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    }
  });
});