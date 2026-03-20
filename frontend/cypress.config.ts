import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    
    // Setup Node events before tests run
    setupNodeEvents(on, config) {
      // Implement node events if needed
      return config;
    },
  },
  
  // Configure component testing (optional, for future use)
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
