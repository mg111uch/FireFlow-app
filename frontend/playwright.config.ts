import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Capture screenshots on failure — useful for debugging payment redirects
    screenshot: 'only-on-failure',
  },
 
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Test the UPI intent mobile flow on a real mobile viewport
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
 
  // Start both servers before running tests.
  // Remove / adjust if you prefer starting them manually.
  webServer: [
    {
      command: 'npm run dev',
      cwd: './frontend',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
    },
    {
      command: 'npm start',
      cwd: './backend',
      url: 'http://localhost:5000',
      reuseExistingServer: true,
    },
  ],
});