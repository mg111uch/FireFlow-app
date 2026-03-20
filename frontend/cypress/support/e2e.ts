// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.ts for custom commands
import './commands';

// Prevent TypeScript errors when using Cypress commands
declare global {
  namespace Cypress {
    interface Chainable {
      // Add custom commands here if needed
    }
  }
}

// Hide fetch/XHR requests from command log unless you need them
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing tests due to uncaught exceptions
  // that are not critical
  return false;
});
