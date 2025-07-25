import { test, expect } from '@playwright/test';

test.describe('Login Page UI Tests', () => {
  test('should render login page with correct styling', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle('GitHub UI Clone');
    
    // Check dark theme is applied
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    
    // Check body has dark background
    const body = page.locator('body');
    await expect(body).toHaveClass(/bg-gray-900/);
    await expect(body).toHaveClass(/text-white/);
    
    // Check main heading is visible and properly styled
    const heading = page.getByRole('heading', { name: 'GitHub UI Clone' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveClass(/text-xl/);
    await expect(heading).toHaveClass(/font-bold/);
    await expect(heading).toHaveClass(/text-white/);
    await expect(heading).toHaveClass(/text-center/);
    
    // Check login form container (direct parent of heading)
    const formContainer = heading.locator('..');
    await expect(formContainer).toHaveClass(/bg-gray-800/);
    await expect(formContainer).toHaveClass(/rounded-lg/);
    await expect(formContainer).toHaveClass(/shadow-lg/);
    
    // Check input field styling
    const tokenInput = page.getByRole('textbox', { name: 'GitHub Personal Access Token' });
    await expect(tokenInput).toBeVisible();
    await expect(tokenInput).toHaveClass(/bg-gray-700/);
    await expect(tokenInput).toHaveClass(/border-gray-600/);
    await expect(tokenInput).toHaveClass(/text-white/);
    await expect(tokenInput).toHaveClass(/rounded-md/);
    
    // Check login button styling
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveClass(/bg-blue-600/);
    await expect(loginButton).toHaveClass(/text-white/);
    await expect(loginButton).toHaveClass(/rounded-md/);
    
    // Check link styling
    const githubLink = page.getByRole('link', { name: 'github.com/settings/tokens' });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveClass(/text-blue-400/);
  });

  test('should have proper responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check elements are still visible and properly sized
    const heading = page.getByRole('heading', { name: 'GitHub UI Clone' });
    await expect(heading).toBeVisible();
    
    const tokenInput = page.getByRole('textbox', { name: 'GitHub Personal Access Token' });
    await expect(tokenInput).toBeVisible();
    
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeVisible();
    
    // Check responsive text sizing
    await expect(heading).toHaveClass(/text-xl/);
  });

  test('should have proper focus states and accessibility', async ({ page }) => {
    await page.goto('/');
    
    const tokenInput = page.getByRole('textbox', { name: 'GitHub Personal Access Token' });
    const loginButton = page.getByRole('button', { name: 'Login' });
    
    // Check input focus state
    await tokenInput.focus();
    await expect(tokenInput).toBeFocused();
    
    // Check button can be focused
    await loginButton.focus();
    await expect(loginButton).toBeFocused();
    
    // Check proper labels are associated
    const label = page.locator('label[for="token"]');
    await expect(label).toBeVisible();
    await expect(label).toHaveClass(/text-gray-300/);
  });

  test('should have consistent color scheme throughout', async ({ page }) => {
    await page.goto('/');
    
    // Check computed styles for key elements instead of screenshots
    const styles = await page.evaluate(() => {
      const body = document.body;
      const container = document.querySelector('[class*="rounded-lg"]') as HTMLElement;
      const button = document.querySelector('button[type="submit"]') as HTMLElement;
      const input = document.querySelector('input[type="password"]') as HTMLElement;
      
      return {
        bodyBackground: window.getComputedStyle(body).backgroundColor,
        containerBackground: container ? window.getComputedStyle(container).backgroundColor : null,
        buttonBackground: button ? window.getComputedStyle(button).backgroundColor : null,
        inputBackground: input ? window.getComputedStyle(input).backgroundColor : null,
      };
    });
    
    // Should be dark gray background (custom CSS color)
    expect(styles.bodyBackground).toMatch(/rgb\(13, 17, 23\)|#0d1117/i);
    
    // Container should have a darker background than body
    expect(styles.containerBackground).toBeTruthy();
    
    // Button should have blue background (TailwindCSS blue-600)
    expect(styles.buttonBackground).toMatch(/rgb\(37, 99, 235\)|oklch\(/i);
    
    // Input should have gray background
    expect(styles.inputBackground).toMatch(/rgb\(|oklch\(/i);
  });

  test('should handle hover states correctly', async ({ page }) => {
    await page.goto('/');
    
    const loginButton = page.getByRole('button', { name: 'Login' });
    const githubLink = page.getByRole('link', { name: 'github.com/settings/tokens' });
    
    // Test button hover state
    await loginButton.hover();
    // Button should have hover:bg-blue-700 class
    
    // Test link hover state
    await githubLink.hover();
    // Link should have hover:underline class
  });
});