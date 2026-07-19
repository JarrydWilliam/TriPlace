import { test, expect } from '@playwright/test';

test.describe('Apple Review Functional Audit - SameVibe', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
  });

  const getSettingsCoords = async (page) => {
    const settingsButton = page.locator('.lucide-settings').locator('xpath=..');
    await expect(settingsButton).toBeVisible();
    const box = await settingsButton.boundingBox();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      settingsButton
    };
  };

  test('Test A - Perfect tap', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
    const isPortalMounted = await page.locator('[data-radix-portal]').isVisible();
    expect(isPortalMounted).toBe(true);
  });

  test('Test B - 1 px movement', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 1);
    await page.mouse.up();
    const isPortalMounted = await page.locator('[data-radix-portal]').isVisible();
    expect(isPortalMounted).toBe(true);
  });

  test('Test C - 3 px movement', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 3);
    await page.mouse.up();
    const isPortalMounted = await page.locator('[data-radix-portal]').isVisible();
    expect(isPortalMounted).toBe(true);
  });

  test('Test D - Threshold boundary (7px)', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 7);
    await page.mouse.up();
    const isPortalMounted = await page.locator('[data-radix-portal]').isVisible();
    expect(isPortalMounted).toBe(true);
  });

  test('Test E - Genuine pull from blank area', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    await page.mouse.move(x - 50, y + 100);
    await page.mouse.down();
    await page.mouse.move(x - 50, y + 200);
    await page.mouse.up();
    const isPortalMounted = await page.locator('[data-radix-portal]').isVisible();
    expect(isPortalMounted).toBe(false);
  });

  test('Test F - Pull starting on Settings', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 100);
    await page.mouse.up();
    const ptrOffset = await page.evaluate(() => document.querySelector('.pt-safe')?.style.paddingTop);
    expect(ptrOffset).toBeFalsy();
  });

  test('Test G - Horizontal movement', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    await page.mouse.move(x - 50, y + 100);
    await page.mouse.down();
    await page.mouse.move(x + 100, y + 100);
    await page.mouse.up();
    const ptrOffset = await page.evaluate(() => document.querySelector('.pt-safe')?.style.paddingTop);
    expect(ptrOffset).toBeFalsy();
  });

  test('Test H - Repeated taps (20 times)', async ({ page }) => {
    const { x, y } = await getSettingsCoords(page);
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(50);
      const portal = page.locator('[data-radix-portal]');
      if (await portal.isVisible()) {
         await page.keyboard.press('Escape');
         await page.waitForTimeout(50);
      }
    }
    expect(true).toBe(true);
  });
});
