/**
 * frontend/__tests__/PaymentCallbackPage.test.tsx
 *
 * Tests every branch of /payment/callback/page.tsx:
 *   1. Shows "verifying" spinner on mount
 *   2. Missing query params → failed state
 *   3. No token → failed state
 *   4. Successful verification → success state → redirect
 *   5. Verification API error → failed state with error message
 *   6. APP_URL is backend URL (5000) — verify axios call uses it, not window.origin
 *   7. "Back to Services" button navigates correctly
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import PaymentCallbackPage from '@/app/payment/callback/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockRouterReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: jest.fn(),
}));
import { useSearchParams } from 'next/navigation';
const mockedUseSearchParams = useSearchParams as jest.Mock;

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));
import { useAuth } from '@/context/AuthContext';
const mockedUseAuth = useAuth as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a mock searchParams with all 3 Razorpay params populated */
function validSearchParams() {
  return {
    get: (key: string) => ({
      razorpay_payment_id: 'pay_test123',
      razorpay_order_id: 'order_test456',
      razorpay_signature: 'sig_test789',
    }[key] ?? null),
  };
}

/** Returns a mock searchParams with all params missing */
function emptySearchParams() {
  return { get: () => null };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Use real timers by default - only use fake timers in specific tests
  mockedUseAuth.mockReturnValue({ token: 'valid-test-token' });
  mockedUseSearchParams.mockReturnValue(validSearchParams());
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentCallbackPage — initial render', () => {
  it('shows verifying spinner and text on mount before API responds', () => {
    // Hang the axios call so we can inspect the intermediate state
    mockedAxios.post.mockReturnValueOnce(new Promise(() => {}));

    render(<PaymentCallbackPage />);

    expect(screen.getByText(/verifying your payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment successful/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();
  });
});

describe('PaymentCallbackPage — missing query params', () => {
  it('shows failed state immediately when query params are missing', async () => {
    mockedUseSearchParams.mockReturnValue(emptySearchParams());

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/payment details missing/i)).toBeInTheDocument();
    // Should not have called the API at all
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('shows failed state when only some params are present', async () => {
    mockedUseSearchParams.mockReturnValue({
      get: (key: string) => key === 'razorpay_payment_id' ? 'pay_123' : null,
    });

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

describe('PaymentCallbackPage — no auth token', () => {
  it('shows failed state with login message when token is null', async () => {
    mockedUseAuth.mockReturnValue({ token: null });

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/not logged in/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

describe('PaymentCallbackPage — successful verification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls /api/payments/verify with correct body and Authorization header', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/payments/verify'),
        {
          razorpay_payment_id: 'pay_test123',
          razorpay_order_id: 'order_test456',
          razorpay_signature: 'sig_test789',
        },
        { headers: { Authorization: 'Bearer valid-test-token' } }
      );
    });
  });

  it('uses NEXT_PUBLIC_URL (backend port 5000) as the base URL for verify call', async () => {
    // This test documents the critical URL split:
    //   - axios.post → NEXT_PUBLIC_URL (http://localhost:5000) for API calls
    //   - callback_url in hook → window.location.origin (http://localhost:3000)
    // Mixing these up causes the "invalid URL" TypeError.
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      const [calledUrl] = mockedAxios.post.mock.calls[0];
      expect(calledUrl).toMatch(/^http:\/\/localhost:5000/);
    });
  });

  it('shows success heading and message after successful verification', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      expect(screen.getByText(/activating your subscription/i)).toBeInTheDocument();
    });
  });

  it('redirects to /services?payment=success after 2 second delay', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<PaymentCallbackPage />);

    await waitFor(() => screen.getByText(/payment successful/i));

    // Before timer fires — no redirect yet
    expect(mockRouterReplace).not.toHaveBeenCalled();

    // Advance the 2s setTimeout
    jest.advanceTimersByTime(2000);

    expect(mockRouterReplace).toHaveBeenCalledWith('/services?payment=success');
  });

  it('does NOT redirect before 2 seconds have elapsed', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<PaymentCallbackPage />);
    await waitFor(() => screen.getByText(/payment successful/i));

    jest.advanceTimersByTime(1999);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});

describe('PaymentCallbackPage — verification failure', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows failed state with API error message on verify rejection', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: 'Payment signature verification failed.' } },
    });

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      expect(screen.getByText(/payment signature verification failed/i)).toBeInTheDocument();
    });
  });

  it('shows generic fallback message when error has no response body', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network Error'));

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment verification failed/i)).toBeInTheDocument();
    });
  });

  it('does not redirect on failure', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: 'Signature mismatch.' } },
    });

    render(<PaymentCallbackPage />);
    await waitFor(() => screen.getByText(/payment failed/i));

    jest.advanceTimersByTime(5000);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});

describe('PaymentCallbackPage — failed state UI', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows "Back to Services" button on failure', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: 'Signature mismatch.' } },
    });

    render(<PaymentCallbackPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to services/i })).toBeInTheDocument();
    });
  });

  it('"Back to Services" button navigates to /services', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: 'Signature mismatch.' } },
    });

    render(<PaymentCallbackPage />);
    await waitFor(() => screen.getByRole('button', { name: /back to services/i }));

    fireEvent.click(screen.getByRole('button', { name: /back to services/i }));
    expect(mockRouterReplace).toHaveBeenCalledWith('/services');
  });
});