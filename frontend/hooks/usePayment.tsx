'use client';

/**
 * usePayment — unified payment hook
 *
 * Usage (same API everywhere in the app):
 *
 *   const { openPayment, GatewayModal, FlowPayModal } = usePayment();
 *
 *   // Render both modals once in your JSX:
 *   {GatewayModal}
 *   {FlowPayModal}
 *
 *   // Trigger from any button:
 *   openPayment({
 *     amount: 299,
 *     description: 'Premium subscription',
 *     onSuccess: (paymentId) => { ... },
 *     onFailure: (err) => { ... },
 *   });
 *
 * The hook shows a gateway-selection modal first, then delegates to the
 * appropriate payment handler (Razorpay redirect or FlowPay inline modal).
 *
 * For form submissions where the page is destroyed by a Razorpay redirect,
 * pass `pendingSubmission` — it is persisted in sessionStorage and submitted
 * from CallbackInner after successful verification.
 */

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { APP_URL, API_URL } from '@/lib/config';
import PaymentGatewayModal from '@/components/PaymentModal';
import FlowpayModal from '@/components/FlowpayModal';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface PendingSubmission {
  /** The backend URL to POST to after payment, e.g. /api/forms/42/submit */
  url: string;
  /** The JSON body to send */
  body: Record<string, unknown>;
  /** JWT token to attach as Authorization header */
  token: string | null;
  /** Where to redirect after the whole flow succeeds */
  returnUrl?: string;
}

interface OpenPaymentOptions {
  amount: number;
  description?: string;
  /** If provided, this form submission will be saved and completed after payment verification */
  pendingSubmission?: PendingSubmission;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

interface UsePaymentReturn {
  openPayment: (options: OpenPaymentOptions) => void;
  isLoading: boolean;
  /** Render this in your JSX — it's the gateway selection modal */
  GatewayModal: ReactNode;
  /** Render this in your JSX — it's the FlowPay inline modal */
  FlowPayModal: ReactNode;
}

export function usePayment(): UsePaymentReturn {
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isFlowpayLoading, setIsFlowpayLoading] = useState(false);

  // Gateway selection modal state
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<OpenPaymentOptions | null>(null);

  // FlowPay inline modal state
  const [flowpayOpen, setFlowpayOpen] = useState(false);

  // Razorpay instance reference for cleanup
  const rzpRef = useRef<any>(null);

  // Debounce flag to prevent rapid clicks
  const isProcessingRef = useRef(false);

  // Helper to validate returnUrl (allow only relative URLs)
  const isValidReturnUrl = (url: string | undefined): boolean => {
    if (!url) return true;
    // Disallow absolute URLs (http://, https://, //) - only relative paths allowed
    return !/^(https?:)?\/\//i.test(url);
  };

  // Clear pending submission from sessionStorage
  const clearPendingSubmission = useCallback(() => {
    sessionStorage.removeItem('pendingSubmission');
  }, []);

  // ─── Open gateway selection ───────────────────────────────────────────────
  const openPayment = useCallback((options: OpenPaymentOptions) => {
    if (isProcessingRef.current) {
      console.warn('Payment already in progress, ignoring duplicate request');
      return;
    }
    if (!token) {
      options.onFailure?.('Authentication required. Please sign in.');
      return;
    }
    isProcessingRef.current = true;
    setCurrentOptions(options);
    setGatewayModalOpen(true);
  }, [token]);

  // ─── User picked a gateway ────────────────────────────────────────────────
  const handleGatewaySelect = useCallback(
    async (gateway: 'razorpay' | 'flowpay') => {
      setGatewayModalOpen(false);
      const options = currentOptions;
      if (!options) return;

      // Store pending submission for both gateways (for recovery after page reload)
      if (options.pendingSubmission) {
        const { returnUrl, ...rest } = options.pendingSubmission;
        // Validate returnUrl to prevent open redirect
        if (!isValidReturnUrl(returnUrl)) {
          options.onFailure?.('Invalid return URL');
          isProcessingRef.current = false;
          return;
        }
        sessionStorage.setItem(
          'pendingSubmission',
          JSON.stringify({ ...rest, returnUrl })
        );
      }

      if (gateway === 'flowpay') {
        // FlowPay opens its own inline modal — just show it
        setFlowpayOpen(true);
        setIsFlowpayLoading(false);
        return;
      }

      // ── Razorpay ──────────────────────────────────────────────────────────
      setIsLoading(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) throw new Error('Failed to load Razorpay SDK.');

        const { data: orderData } = await axios.post(
          `${API_URL}/api/payments/create-order`,
          { amount: options.amount, gateway: 'razorpay' },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { order_id, key_id } = orderData;

        const returnUrl = options.pendingSubmission?.returnUrl;

        const rzpOptions: any = {
          key: key_id,
          amount: options.amount * 100,
          currency: 'INR',
          name: 'Flow Services',
          description: options.description || 'Payment',
          order_id,
          prefill: {},
          config: {
            display: {
              blocks: { utib: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] } },
              sequence: ['block.utib'],
              preferences: { show_default_blocks: true },
            },
          },
          theme: { color: '#4F46E5' },
          handler: (response: any) => {
            const callbackUrl = `${APP_URL}/payment/callback` +
              `?razorpay_payment_id=${response.razorpay_payment_id}` +
              `&razorpay_order_id=${response.razorpay_order_id}` +
              `&razorpay_signature=${response.razorpay_signature}` +
              (returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '');
            window.location.href = callbackUrl;
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              isProcessingRef.current = false;
              clearPendingSubmission();
              options.onFailure?.('Payment was cancelled.');
            },
          },
        };

        const rzp = new (window as any).Razorpay(rzpOptions);
        rzpRef.current = rzp;
        rzp.open();
      } catch (err: any) {
        const message =
          err?.response?.data?.error || err?.message || 'Payment failed. Please try again.';
        options.onFailure?.(message);
        isProcessingRef.current = false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentOptions, token, clearPendingSubmission]
  );

  // ─── FlowPay success ──────────────────────────────────────────────────────
  const handleFlowPaySuccess = useCallback(
    async (paymentId: string) => {
      setFlowpayOpen(false);
      setIsFlowpayLoading(false);
      const options = currentOptions;
      if (!options) {
        isProcessingRef.current = false;
        return;
      }

       // If there's a pending form submission, complete it now (FlowPay stays inline)
       if (options.pendingSubmission) {
         const { url, body, token: subToken, returnUrl } = options.pendingSubmission;
         try {
           await axios.post(`${API_URL}${url}`, body, {
             headers: subToken ? { Authorization: `Bearer ${subToken}` } : {},
           });
           clearPendingSubmission();
           options.onSuccess?.(paymentId);
           // Redirect to the original service page with success flag
           if (returnUrl) {
             const redirectUrl = returnUrl.includes('?')
               ? `${returnUrl}&formSubmitted=1`
               : `${returnUrl}?formSubmitted=1`;
             window.location.href = redirectUrl;
           }
         } catch {
           options.onFailure?.('Payment succeeded but form submission failed.');
         } finally {
           isProcessingRef.current = false;
         }
         return;
       }

      clearPendingSubmission();
      options.onSuccess?.(paymentId);
      isProcessingRef.current = false;
    },
    [currentOptions, clearPendingSubmission]
  );

  const handleFlowPayFailure = useCallback(
    (error: string) => {
      setFlowpayOpen(false);
      setIsFlowpayLoading(false);
      clearPendingSubmission();
      currentOptions?.onFailure?.(error);
      isProcessingRef.current = false;
    },
    [currentOptions, clearPendingSubmission]
  );

  // ─── Rendered modals (caller must include these in JSX) ───────────────────
  const GatewayModal = (
    <PaymentGatewayModal
      isOpen={gatewayModalOpen}
      amount={currentOptions?.amount ?? 0}
      description={currentOptions?.description}
      onSelect={handleGatewaySelect}
      onClose={() => {
        setGatewayModalOpen(false);
        clearPendingSubmission();
        isProcessingRef.current = false;
      }}
    />
  );

  const FlowPayModal = currentOptions ? (
    <FlowpayModal
      isOpen={flowpayOpen}
      amount={currentOptions.amount}
      description={currentOptions.description ?? 'Payment'}
      onSuccess={handleFlowPaySuccess}
      onFailure={handleFlowPayFailure}
      onClose={() => {
        setFlowpayOpen(false);
        setIsFlowpayLoading(false);
        clearPendingSubmission();
        isProcessingRef.current = false;
      }}
    />
  ) : null;

  // Clear pending submission on unmount
  useEffect(() => {
    return () => {
      if (rzpRef.current) {
        rzpRef.current.destroy();
      }
      clearPendingSubmission();
    };
  }, [clearPendingSubmission]);

  return { openPayment, isLoading, GatewayModal, FlowPayModal };
}