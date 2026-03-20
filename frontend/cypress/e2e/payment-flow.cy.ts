/**
 * e2e/payment-flow.cy.ts
 *
 * End-to-end tests for the full Razorpay UPI payment flow.
 * Requires both frontend (localhost:3000) and backend (localhost:5000) running.
 *
 * Run: npx cypress run or npx cypress open
 *
 * These tests mock the Razorpay SDK at the window level and intercept the
 * /api/payments/* backend calls via Cypress route interception — so no
 * real Razorpay API calls are made and tests run deterministically.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES_URL = '/services/rent-buy';
const CALLBACK_URL = '/payment/callback';
const MOCK_ORDER_ID = 'order_e2e_test_001';
const MOCK_PAYMENT_ID = 'pay_e2e_test_001';
const MOCK_SIGNATURE = 'sig_e2e_test_001';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Logs in via the UI and returns once the token is in localStorage */
function loginAsTestUser() {
  cy.visit('/auth/login');
  cy.get('input[placeholder="Enter your User Name"]').type('testuser');
  cy.get('input[placeholder="Enter your Password"]').type('password');
  cy.get('button[type="submit"]').click();
  // Wait until we are redirected away from /auth/login
  cy.url({ timeout: 5000 }).should('not.include', '/auth/login');
}

/**
 * Intercepts backend payment API calls and returns mock responses.
 * This avoids hitting the real Razorpay API in tests.
 */
function interceptPaymentAPIs(options: { createOrderFails?: boolean; verifyFails?: boolean } = {}) {
  const createOrderFails = options.createOrderFails ?? false;
  const verifyFails = options.verifyFails ?? false;

  cy.intercept('POST', '**/api/payments/create-order', (req) => {
    if (createOrderFails) {
      req.reply({ statusCode: 500, body: { error: 'Failed to create payment order.' } });
    } else {
      req.reply({
        statusCode: 200,
        body: {
          orderId: MOCK_ORDER_ID,
          amount: 49900,
          currency: 'INR',
          keyId: 'rzp_test_key',
        },
      });
    }
  });

  cy.intercept('POST', '**/api/payments/verify', (req) => {
    if (verifyFails) {
      req.reply({ statusCode: 400, body: { error: 'Payment signature verification failed.' } });
    } else {
      req.reply({
        statusCode: 200,
        body: { success: true, paymentId: MOCK_PAYMENT_ID },
      });
    }
  });
}

/**
 * Injects a mock window.Razorpay that immediately fires the handler callback —
 * simulating the user completing payment in the UPI app (desktop flow).
 */
function injectMockRazorpay(options = { triggerDismiss: false }) {
  const { triggerDismiss } = options;

  cy.window().then((win) => {
    (win as any).Razorpay = function (options: any) {
      return {
        open() {
          if (triggerDismiss) {
            setTimeout(() => {
              if (options.modal && options.modal.ondismiss) {
                options.modal.ondismiss();
              }
            }, 100);
          } else {
            setTimeout(() => {
              options.handler?.({
                razorpay_order_id: MOCK_ORDER_ID,
                razorpay_payment_id: MOCK_PAYMENT_ID,
                razorpay_signature: MOCK_SIGNATURE,
              });
            }, 100);
          }
        },
        on() {},
      };
    };
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Payment flow — Subscribe button', () => {
  beforeEach(() => {
    loginAsTestUser();
  });

  it('Subscribe button is visible and enabled on services page', () => {
    cy.visit(SERVICES_URL);
    cy.get('button').contains(/subscribe/i).should('be.visible').should('be.enabled');
  });

  it('Subscribe button shows "Opening payment..." while loading', () => {
    interceptPaymentAPIs();
    // Delay the create-order response so we can observe the loading state
    cy.intercept('POST', '**/api/payments/create-order', {
      statusCode: 200,
      body: { orderId: MOCK_ORDER_ID, amount: 49900, currency: 'INR', keyId: 'rzp_test_key' },
      delay: 500,
    });
    injectMockRazorpay();

    cy.visit(SERVICES_URL);
    cy.get('button').contains(/subscribe/i).click();
    cy.get('button').contains(/opening payment/i).should('be.visible');
  });

  it('shows error toast when create-order API fails', () => {
    interceptPaymentAPIs({ createOrderFails: true });
    injectMockRazorpay();

    cy.visit(SERVICES_URL);
    cy.get('button').contains(/subscribe/i).click();

    cy.contains(/failed to create payment order/i, { timeout: 5000 }).should('be.visible');
  });
});

describe('Payment flow — desktop handler success', () => {
  beforeEach(() => {
    loginAsTestUser();
    interceptPaymentAPIs();
    injectMockRazorpay();
  });

  it('shows success toast on services page after desktop payment completes', () => {
    cy.visit(SERVICES_URL);
    cy.get('button').contains(/subscribe/i).click();

    cy.contains(/payment successful/i, { timeout: 8000 }).should('be.visible');
  });

  it('toast disappears after ~4 seconds', () => {
    cy.visit(SERVICES_URL);
    cy.get('button').contains(/subscribe/i).click();

    cy.contains(/payment successful/i, { timeout: 8000 }).should('be.visible');
    cy.contains(/payment successful/i, { timeout: 6000 }).should('not.exist');
  });
});

describe('Payment flow — modal dismiss / cancel', () => {
  it('shows cancellation error when user dismisses Razorpay modal', () => {
    loginAsTestUser();
    interceptPaymentAPIs();
    injectMockRazorpay({ triggerDismiss: true });

    cy.visit(SERVICES_URL);
    cy.get('button').contains(/subscribe/i).click();

    cy.contains(/payment was cancelled/i, { timeout: 5000 }).should('be.visible');
  });
});

describe('Payment flow — callback page (mobile UPI redirect)', () => {
  beforeEach(() => {
    loginAsTestUser();
    interceptPaymentAPIs();
  });

  it('shows verifying spinner immediately on load', () => {
    // Hang the verify call so we can see the intermediate state
    cy.intercept('POST', '**/api/payments/verify', (req) => {
      // Never resolve - hang the request
      req.on('response', (res) => {
        // Don't send response
      });
    });
    cy.visit(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    cy.contains(/verifying your payment/i).should('be.visible');
  });

  it('shows Payment Successful after verification succeeds', () => {
    cy.visit(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    cy.get('h1, h2, h3').contains(/payment successful/i, { timeout: 5000 }).should('be.visible');
  });

  it('redirects to /services?payment=success after 2 seconds', () => {
    cy.visit(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    cy.get('h1, h2, h3').contains(/payment successful/i, { timeout: 5000 }).should('be.visible');
    cy.url({ timeout: 5000 }).should('include', '/services?payment=success');
  });

  it('shows success toast on /services after redirect', () => {
    cy.visit(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    cy.url({ timeout: 5000 }).should('include', '/services?payment=success');
    cy.contains(/subscription is now active/i, { timeout: 3000 }).should('be.visible');
  });

  it('shows Payment Failed when query params are missing', () => {
    cy.visit(CALLBACK_URL); // no query params
    cy.get('h1, h2, h3').contains(/payment failed/i, { timeout: 3000 }).should('be.visible');
    cy.contains(/payment details missing/i).should('be.visible');
  });

  it('shows Payment Failed when verify API returns 400', () => {
    cy.intercept('POST', '**/api/payments/verify', {
      statusCode: 400,
      body: { error: 'Payment signature verification failed.' },
    });
    cy.visit(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=badsig`
    );
    cy.get('h1, h2, h3').contains(/payment failed/i, { timeout: 5000 }).should('be.visible');
    cy.contains(/signature verification failed/i).should('be.visible');
  });

  it('"Back to Services" navigates to /services on failure', () => {
    cy.intercept('POST', '**/api/payments/verify', {
      statusCode: 400,
      body: { error: 'Signature mismatch.' },
    });
    cy.visit(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=badsig`
    );
    cy.get('button').contains(/back to services/i).click();
    cy.url().should('match', /\/services$/);
  });
});

describe('Payment flow — unauthenticated user', () => {
  it('callback page shows "not logged in" when no token in localStorage', () => {
    // Do NOT login — localStorage has no token
    cy.visit(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    cy.contains(/not logged in/i, { timeout: 3000 }).should('be.visible');
  });
});
