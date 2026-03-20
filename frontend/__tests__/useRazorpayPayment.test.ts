/**
 * frontend/__tests__/useRazorpayPayment.test.ts
 *
 * Tests every step of the payment hook:
 *   1. SDK script loading (success + failure)
 *   2. Order creation (success, network error, auth error)
 *   3. Razorpay checkout options built correctly
 *   4. verifyAndComplete (success + failure)
 *   5. Modal dismiss (cancel)
 *   6. No token guard
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AuthContext — default: authenticated with a token
const mockToken = 'test-jwt-token';
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ token: mockToken, currentUser: { id: 1 } })),
}));
import { useAuth } from '@/context/AuthContext';
const mockedUseAuth = useAuth as jest.Mock;

// Track what Razorpay was instantiated with
let capturedRazorpayOptions: any = null;
const mockRzpOpen = jest.fn();
const mockRzpOn = jest.fn();

beforeEach(() => {
  capturedRazorpayOptions = null;
  mockRzpOpen.mockClear();

  // Mock window.Razorpay constructor
  (window as any).Razorpay = jest.fn((options: any) => {
    capturedRazorpayOptions = options;
    return { open: mockRzpOpen, on: mockRzpOn };
  });

  // Reset DOM scripts between tests
  document.querySelectorAll('#razorpay-checkout-script').forEach(el => el.remove());

  mockedUseAuth.mockReturnValue({ token: mockToken, currentUser: { id: 1 } });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

let appendChildMock: jest.SpyInstance | null = null;

/** Simulates the Razorpay SDK script loading successfully */
function mockScriptLoad() {
  appendChildMock = jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
    // Immediately fire onload so the promise resolves
    setTimeout(() => node.onload?.(), 0);
    return node;
  });
}

/** Simulates the Razorpay SDK script failing to load */
function mockScriptError() {
  appendChildMock = jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
    setTimeout(() => node.onerror?.(), 0);
    return node;
  });
}

afterEach(() => {
  if (appendChildMock) {
    appendChildMock.mockRestore();
    appendChildMock = null;
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useRazorpayPayment — SDK loading', () => {
  it('starts with isLoading false and no error', () => {
    const { result } = renderHook(() => useRazorpayPayment());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error and calls onFailure when SDK script fails to load', async () => {
    mockScriptError();
    const onFailure = jest.fn();
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({ amount: 499, onFailure });
    });

    expect(result.current.error).toMatch(/Failed to load Razorpay SDK/i);
    expect(onFailure).toHaveBeenCalledWith(expect.stringMatching(/Failed to load Razorpay SDK/i));
    expect(result.current.isLoading).toBe(false);
  });

  it('does not append a second script tag if one already exists', async () => {
    // Pre-insert the script tag (simulates it already loaded)
    const existing = document.createElement('script');
    existing.id = 'razorpay-checkout-script';
    document.body.appendChild(existing);

    mockedAxios.post.mockResolvedValueOnce({
      data: { orderId: 'order_test', keyId: 'rzp_test_key' },
    });

    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({ amount: 499 });
    });

    const scriptAppends = appendSpy.mock.calls.filter(
      ([node]: any) => node?.id === 'razorpay-checkout-script'
    );
    expect(scriptAppends.length).toBe(0);
  });
});

describe('useRazorpayPayment — order creation', () => {
  beforeEach(() => mockScriptLoad());

  it('calls /api/payments/create-order with correct amount and Authorization header', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { orderId: 'order_abc', keyId: 'rzp_test_key' },
    });

    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({ amount: 499 });
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/create-order'),
      { amount: 499 },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );
  });

  it('sets isLoading true during the call and false after', async () => {
    let resolveOrder!: (v: any) => void;
    mockedAxios.post.mockReturnValueOnce(
      new Promise(res => { resolveOrder = res; })
    );

    const { result } = renderHook(() => useRazorpayPayment());

    act(() => { result.current.initiatePayment({ amount: 499 }); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveOrder({ data: { orderId: 'order_abc', keyId: 'rzp_test_key' } });
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error and calls onFailure on network error from create-order', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { error: 'Failed to create payment order.' } },
    });

    const onFailure = jest.fn();
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({ amount: 499, onFailure });
    });

    expect(result.current.error).toBe('Failed to create payment order.');
    expect(onFailure).toHaveBeenCalledWith('Failed to create payment order.');
  });

  it('sets error when no token is available', async () => {
    // This test documents the behaviour when token is null.
    // The hook will still attempt the call but the backend will 401.
    // The Authorization header value will be "Bearer null".
    mockedUseAuth.mockReturnValueOnce({ token: null, currentUser: null });
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { error: 'Access denied' } },
    });

    const onFailure = jest.fn();
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({ amount: 499, onFailure });
    });

    expect(onFailure).toHaveBeenCalled();
  });
});

describe('useRazorpayPayment — Razorpay checkout options', () => {
  beforeEach(() => {
    mockScriptLoad();
    mockedAxios.post.mockResolvedValueOnce({
      data: { orderId: 'order_xyz', keyId: 'rzp_test_key' },
    });
  });

  it('opens Razorpay with correct key, amount in paise, order_id', async () => {
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({ amount: 499, description: 'Test sub' });
    });

    expect(mockRzpOpen).toHaveBeenCalledTimes(1);
    expect(capturedRazorpayOptions.key).toBe('rzp_test_key');
    expect(capturedRazorpayOptions.amount).toBe(499 * 100);  // paise
    expect(capturedRazorpayOptions.order_id).toBe('order_xyz');
    expect(capturedRazorpayOptions.currency).toBe('INR');
  });

  it('sets callback_url using window.location.origin (not APP_URL)', async () => {
    // KEY TEST: callback_url must use window.location.origin (the frontend
    // origin, e.g. http://localhost:3000) NOT process.env.NEXT_PUBLIC_URL
    // (which is the backend, http://localhost:5000).
    // A wrong callback_url causes the "invalid URL" type error after payment.
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({ amount: 499 });
    });

    expect(capturedRazorpayOptions.callback_url).toBe(
      `${window.location.origin}/payment/callback`
    );
    // Explicitly confirm it does NOT contain the backend port
    expect(capturedRazorpayOptions.callback_url).not.toContain('5000');
  });

  it('sets redirect: true for UPI intent flow', async () => {
    const { result } = renderHook(() => useRazorpayPayment());
    await act(async () => { await result.current.initiatePayment({ amount: 499 }); });
    expect(capturedRazorpayOptions.redirect).toBe(true);
  });

  it('prefills user details when provided', async () => {
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => {
      await result.current.initiatePayment({
        amount: 499,
        userName: 'Test User',
        userEmail: 'test@example.com',
        userPhone: '9999999999',
      });
    });

    expect(capturedRazorpayOptions.prefill).toEqual({
      name: 'Test User',
      email: 'test@example.com',
      contact: '9999999999',
    });
  });

  it('prefills empty strings when user details are omitted', async () => {
    const { result } = renderHook(() => useRazorpayPayment());
    await act(async () => { await result.current.initiatePayment({ amount: 499 }); });
    expect(capturedRazorpayOptions.prefill).toEqual({ name: '', email: '', contact: '' });
  });
});

describe('useRazorpayPayment — verifyAndComplete (desktop handler)', () => {
  beforeEach(() => {
    mockScriptLoad();
    mockedAxios.post.mockResolvedValueOnce({
      data: { orderId: 'order_xyz', keyId: 'rzp_test_key' },
    });
  });

  it('calls /api/payments/verify with correct fields and Bearer token on handler fire', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => { await result.current.initiatePayment({ amount: 499, onSuccess }); });

    // Simulate Razorpay desktop handler firing
    await act(async () => {
      await capturedRazorpayOptions.handler({
        razorpay_order_id: 'order_xyz',
        razorpay_payment_id: 'pay_abc123',
        razorpay_signature: 'sig_xyz',
      });
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/verify'),
      {
        razorpay_order_id: 'order_xyz',
        razorpay_payment_id: 'pay_abc123',
        razorpay_signature: 'sig_xyz',
      },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );
    expect(onSuccess).toHaveBeenCalledWith('pay_abc123');
  });

  it('calls onFailure when /verify returns an error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Verification failed'));

    const onFailure = jest.fn();
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => { await result.current.initiatePayment({ amount: 499, onFailure }); });

    await act(async () => {
      await capturedRazorpayOptions.handler({
        razorpay_order_id: 'order_xyz',
        razorpay_payment_id: 'pay_abc123',
        razorpay_signature: 'bad_sig',
      });
    });

    expect(onFailure).toHaveBeenCalledWith('Signature verification failed. Contact support.');
  });
});

describe('useRazorpayPayment — modal dismiss', () => {
  beforeEach(() => {
    mockScriptLoad();
    mockedAxios.post.mockResolvedValueOnce({
      data: { orderId: 'order_xyz', keyId: 'rzp_test_key' },
    });
  });

  it('calls onFailure with cancellation message when modal is dismissed', async () => {
    const onFailure = jest.fn();
    const { result } = renderHook(() => useRazorpayPayment());

    await act(async () => { await result.current.initiatePayment({ amount: 499, onFailure }); });

    act(() => { capturedRazorpayOptions.modal.ondismiss(); });

    expect(onFailure).toHaveBeenCalledWith('Payment was cancelled.');
    expect(result.current.isLoading).toBe(false);
  });
});