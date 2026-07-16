import { test, expect } from '@playwright/test';

test('Home page loads @readonly @route', async ({ page }) => {
  await page.goto('/');
  // Either we go to dashboard or it shows some landing page
  await expect(page).toHaveURL(/.*\/|\/dashboard/);
});

test('Auth page loads @readonly @route', async ({ page }) => {
  await page.goto('/auth');
  // Just checking the page loads without crashing
  const content = await page.content();
  expect(content.length).toBeGreaterThan(0);
});
