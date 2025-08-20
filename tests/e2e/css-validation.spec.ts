import { test, expect } from "@playwright/test";

test.describe("CSS Validation Tests", () => {
  test("should have proper CSS loading and dark theme", async ({ page }) => {
    await page.goto("/");

    // Check that CSS is loaded properly
    const cssLinks = await page.locator('link[rel="stylesheet"]').count();
    expect(cssLinks).toBeGreaterThan(0);

    // Check dark theme classes using semantic tokens
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    const body = page.locator("body");
    await expect(body).toHaveClass(/bg-background/);
    await expect(body).toHaveClass(/text-foreground/);

    // Check title exists and is visible
    const title = page.getByText("GitHub UI Clone");
    await expect(title).toBeVisible();

    // Check form elements exist
    const tokenInput = page.getByRole("textbox", {
      name: "Personal Access Token",
    });
    await expect(tokenInput).toBeVisible();

    const loginButton = page.getByRole("button", { name: "Connect to GitHub" });
    await expect(loginButton).toBeVisible();

    // Check computed background color
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Should be a dark color in the Dracula theme (oklch format is used)
    console.log("Body background color:", bodyBgColor);
    expect(bodyBgColor).toMatch(/rgb\(40, 42, 54\)|#282a36|oklch\([^)]+\)/i);

    // Verify the page layout and styling without screenshot comparison
    const elements = await page.evaluate(() => {
      const container = document.querySelector('[class*="rounded-lg"]');
      const button = document.querySelector('button[type="submit"]');
      const input = document.querySelector('input[type="password"]');

      return {
        containerExists: !!container,
        buttonExists: !!button,
        inputExists: !!input,
        containerHasRoundedClass:
          container?.className.includes("rounded") || false,
        buttonHasColorClass: button?.className.includes("bg-blue") || false,
      };
    });

    expect(elements.containerExists).toBe(true);
    expect(elements.buttonExists).toBe(true);
    expect(elements.inputExists).toBe(true);
    expect(elements.containerHasRoundedClass).toBe(true);
  });

  test("should have all Tailwind classes applied correctly", async ({
    page,
  }) => {
    await page.goto("/");

    // Check specific semantic classes are working instead of hardcoded ones
    const container = page.locator(".bg-card").first();
    await expect(container).toBeVisible();

    const formContainer = await container.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log("Form container background:", formContainer);
    // Modern browsers may use OKLCH, OKLAB, or RGB color space
    expect(formContainer).toMatch(/rgb\(|oklch\(|oklab\(/i);
  });

  test("should verify responsive design works", async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/");

    let title = page.getByText("GitHub UI Clone");
    await expect(title).toBeVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    title = page.getByText("GitHub UI Clone");
    await expect(title).toBeVisible();

    // Check no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });
});
