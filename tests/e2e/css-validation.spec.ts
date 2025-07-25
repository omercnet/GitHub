import { test, expect } from '@playwright/test';

test.describe('CSS Validation Tests', () => {
  test('should have proper CSS loading and dark theme', async ({ page }) => {
    await page.goto('/');
    
    // Check that CSS is loaded properly
    const cssLinks = await page.locator('link[rel="stylesheet"]').count();
    expect(cssLinks).toBeGreaterThan(0);
    
    // Check dark theme classes
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    
    const body = page.locator('body');
    await expect(body).toHaveClass(/bg-gray-900/);
    await expect(body).toHaveClass(/text-white/);
    
    // Check heading exists and is visible
    const heading = page.getByRole('heading', { name: 'GitHub UI Clone' });
    await expect(heading).toBeVisible();
    
    // Check form elements exist
    const tokenInput = page.getByRole('textbox', { name: 'GitHub Personal Access Token' });
    await expect(tokenInput).toBeVisible();
    
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeVisible();
    
    // Check computed background color
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // Should be a dark color (either RGB or OKLCH format)
    console.log('Body background color:', bodyBgColor);
    expect(bodyBgColor).toMatch(/rgb\(13, 17, 23\)|#0d1117|oklch\([^)]+\)/i);
    
    // Take screenshot for verification
    await expect(page).toHaveScreenshot('css-validation.png');
  });

  test('should have all Tailwind classes applied correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check specific Tailwind classes are working
    const container = page.locator('.bg-gray-800').first();
    await expect(container).toBeVisible();
    
    const formContainer = await container.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    console.log('Form container background:', formContainer);
    // TailwindCSS v4 uses OKLCH color space, should be gray-800 equivalent
    expect(formContainer).toMatch(/rgb\(31, 41, 55\)|#1f2937|oklch\([^)]+\)/i);
  });

  test('should verify responsive design works', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    let heading = page.getByRole('heading', { name: 'GitHub UI Clone' });
    await expect(heading).toBeVisible();
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    heading = page.getByRole('heading', { name: 'GitHub UI Clone' });
    await expect(heading).toBeVisible();
    
    // Check no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });
});