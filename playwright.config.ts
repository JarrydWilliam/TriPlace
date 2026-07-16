import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db', // isolated database
      VITE_FIREBASE_PROJECT_ID: 'test-project', // isolated firebase
      USE_FIREBASE_EMULATOR: 'true'
    }
  },
});
