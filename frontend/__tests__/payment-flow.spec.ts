/**
 * e2e/payment-flow.spec.ts
 *
 * End-to-end tests for the full Razorpay UPI payment flow.
 * Requires both frontend (localhost:3000) and backend (localhost:5000) running.
 *
 * Run: npx playwright test e2e/payment-flow.spec.ts
 *
 * These tests mock the Razorpay SDK at the window level and intercept the
 * /api/payments/* backend calls via Playwright route interception — so no
 * real Razorpay API calls are made and tests run deterministically.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES_URL = '/services';
const CALLBACK_URL = '/payment/callback';
const MOCK_ORDER_ID = 'order_e2e_test_001';
const MOCK_PAYMENT_ID = 'pay_e2e_test_001';
const MOCK_SIGNATURE = 'sig_e2e_test_001';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Logs in via the UI and returns once the token is in localStorage */
async function loginAsTestUser(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[name="username"], input[placeholder*="username" i]', 'testuser');
  await page.fill('input[name="password"], input[type="password"]', 'testpassword');
  await page.click('button[type="submit"]');
  // Wait until we are redirected away from /auth/login
  await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 5000 });
}

/**
 * Intercepts backend payment API calls and returns mock responses.
 * This avoids hitting the real Razorpay API in tests.
 */
async function interceptPaymentAPIs(page: Page, {
  createOrderFails = false,
  verifyFails = false,
} = {}) {
  await page.route('**/api/payments/create-order', route => {
    if (createOrderFails) {
      return route.fulfill({ status: 500, json: { error: 'Failed to create payment order.' } });
    }
    return route.fulfill({
      status: 200,
      json: {
        orderId: MOCK_ORDER_ID,
        amount: 49900,
        currency: 'INR',
        keyId: 'rzp_test_key',
      },
    });
  });

  await page.route('**/api/payments/verify', route => {
    if (verifyFails) {
      return route.fulfill({ status: 400, json: { error: 'Payment signature verification failed.' } });
    }
    return route.fulfill({
      status: 200,
      json: { success: true, paymentId: MOCK_PAYMENT_ID },
    });
  });
}

/**
 * Injects a mock window.Razorpay that immediately fires the handler callback —
 * simulating the user completing payment in the UPI app (desktop flow).
 */
async function injectMockRazorpay(page: Page, { triggerDismiss = false } = {}) {
  await page.addInitScript(({ orderId, paymentId, signature, dismiss }) => {
    (window as any).Razorpay = function(options: any) {
      return {
        open() {
          if (dismiss) {
            setTimeout(() => options.modal?.ondismiss?.(), 100);
          } else {
            setTimeout(() => {
              options.handler?.({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
              });
            }, 100);
          }
        },
        on() {},
      };
    };
  }, { orderId: MOCK_ORDER_ID, paymentId: MOCK_PAYMENT_ID, signature: MOCK_SIGNATURE, dismiss: triggerDismiss });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Payment flow — Subscribe button', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Subscribe button is visible and enabled on services page', async ({ page }) => {
    await page.goto(SERVICES_URL);
    const btn = page.getByRole('button', { name: /subscribe/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('Subscribe button shows "Opening payment..." while loading', async ({ page }) => {
    await interceptPaymentAPIs(page);
    // Delay the create-order response so we can observe the loading state
    await page.route('**/api/payments/create-order', async route => {
      await new Promise(r => setTimeout(r, 500));
      await route.fulfill({ status: 200, json: { orderId: MOCK_ORDER_ID, amount: 49900, currency: 'INR', keyId: 'rzp_test_key' } });
    });
    await injectMockRazorpay(page);

    await page.goto(SERVICES_URL);
    await page.getByRole('button', { name: /subscribe/i }).click();
    await expect(page.getByRole('button', { name: /opening payment/i })).toBeVisible();
  });

  test('shows error toast when create-order API fails', async ({ page }) => {
    await interceptPaymentAPIs(page, { createOrderFails: true });
    await injectMockRazorpay(page);

    await page.goto(SERVICES_URL);
    await page.getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByText(/failed to create payment order/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Payment flow — desktop handler success', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await interceptPaymentAPIs(page);
    await injectMockRazorpay(page);
  });

  test('shows success toast on services page after desktop payment completes', async ({ page }) => {
    await page.goto(SERVICES_URL);
    await page.getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByText(/payment successful/i)).toBeVisible({ timeout: 8000 });
  });

  test('toast disappears after ~4 seconds', async ({ page }) => {
    await page.goto(SERVICES_URL);
    await page.getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByText(/payment successful/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/payment successful/i)).not.toBeVisible({ timeout: 6000 });
  });
});

test.describe('Payment flow — modal dismiss / cancel', () => {
  test('shows cancellation error when user dismisses Razorpay modal', async ({ page }) => {
    await loginAsTestUser(page);
    await interceptPaymentAPIs(page);
    await injectMockRazorpay(page, { triggerDismiss: true });

    await page.goto(SERVICES_URL);
    await page.getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByText(/payment was cancelled/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Payment flow — callback page (mobile UPI redirect)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await interceptPaymentAPIs(page);
  });

  test('shows verifying spinner immediately on load', async ({ page }) => {
    // Hang the verify call so we can see the intermediate state
    await page.route('**/api/payments/verify', () => {}); // never resolves
    await page.goto(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    await expect(page.getByText(/verifying your payment/i)).toBeVisible();
  });

  test('shows Payment Successful after verification succeeds', async ({ page }) => {
    await page.goto(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    await expect(page.getByRole('heading', { name: /payment successful/i })).toBeVisible({ timeout: 5000 });
  });

  test('redirects to /services?payment=success after 2 seconds', async ({ page }) => {
    await page.goto(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    await expect(page.getByRole('heading', { name: /payment successful/i })).toBeVisible({ timeout: 5000 });
    await page.waitForURL('**/services?payment=success', { timeout: 5000 });
    expect(page.url()).toContain('/services?payment=success');
  });

  test('shows success toast on /services after redirect', async ({ page }) => {
    await page.goto(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    await page.waitForURL('**/services?payment=success', { timeout: 5000 });
    await expect(page.getByText(/subscription is now active/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows Payment Failed when query params are missing', async ({ page }) => {
    await page.goto(CALLBACK_URL); // no query params
    await expect(page.getByRole('heading', { name: /payment failed/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/payment details missing/i)).toBeVisible();
  });

  test('shows Payment Failed when verify API returns 400', async ({ page }) => {
    await page.route('**/api/payments/verify', route =>
      route.fulfill({ status: 400, json: { error: 'Payment signature verification failed.' } })
    );
    await page.goto(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=badsig`
    );
    await expect(page.getByRole('heading', { name: /payment failed/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/signature verification failed/i)).toBeVisible();
  });

  test('"Back to Services" navigates to /services on failure', async ({ page }) => {
    await page.route('**/api/payments/verify', route =>
      route.fulfill({ status: 400, json: { error: 'Signature mismatch.' } })
    );
    await page.goto(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=badsig`
    );
    await page.getByRole('button', { name: /back to services/i }).click();
    await expect(page).toHaveURL(/\/services$/);
  });
});

test.describe('Payment flow — unauthenticated user', () => {
  test('callback page shows "not logged in" when no token in localStorage', async ({ page }) => {
    // Do NOT login — localStorage has no token
    await page.goto(
      `${CALLBACK_URL}?razorpay_payment_id=${MOCK_PAYMENT_ID}&razorpay_order_id=${MOCK_ORDER_ID}&razorpay_signature=${MOCK_SIGNATURE}`
    );
    await expect(page.getByText(/not logged in/i)).toBeVisible({ timeout: 3000 });
  });
});