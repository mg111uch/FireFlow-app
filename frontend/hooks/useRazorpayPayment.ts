'use client';

/**
 * Handles the full Razorpay UPI intent payment flow:
 *  1. Dynamically loads the Razorpay checkout SDK script
 *  2. Creates an order via your Express backend
 *  3. Opens Razorpay checkout — on mobile, UPI intent deep-links to installed UPI apps
 *  4. On success, verifies the payment signature via your backend
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { APP_URL, API_URL } from '@/lib/config';

// Load Razorpay SDK
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

interface InitiatePaymentOptions {
  amount: number;        
  description?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function useRazorpayPayment() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
 * Verifies the payment signature on the backend.
 * Called after desktop checkout handler fires.
 * (For mobile/redirect flow, verification happens in /payment/callback page.)
 */
  const verifyAndComplete = useCallback(async (
    response: { 
      razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string 
    },
    onSuccess?: (paymentId: string) => void,
    onFailure?: (error: string) => void,
  ) => {
    try {
      await axios.post(
        `${API_URL}/api/payments/verify`,
        {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess?.(response.razorpay_payment_id);
    } catch {
      onFailure?.('Signature verification failed. Contact support.');
    }
  }, [token]);

  const initiatePayment = useCallback(async ({
    amount,
    description = 'Subscription Fee',
    userName,
    userEmail,
    userPhone,
    onSuccess,
    onFailure,
  }: InitiatePaymentOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK.');
      }

      // Step 2: Create order on backend
      const { data: orderData } = await axios.post(
        `${API_URL}/api/payments/create-order`,
        { amount },
        { headers: 
          { Authorization: `Bearer ${token}` },
        }
      );

      const { orderId, keyId } = orderData;

      // Step 3: Open Razorpay checkout
      // On mobile browsers, Razorpay automatically triggers UPI intent
      // deep-links — the user is taken to their UPI app (PhonePe, GPay, Paytm etc.)
      // and brought back here after payment via the callback_url redirect.
      const options: any = {
        key: keyId,
        amount: amount * 100,       // paise
        currency: 'INR',
        name: 'PostShare',
        description,
        order_id: orderId,

        // ─── UPI Intent flow ──────────────────────────────────────────
        // callback_url: Razorpay redirects here after UPI payment on mobile.
        // The URL receives razorpay_payment_id, razorpay_order_id, razorpay_signature
        // as query params, which your /payment/callback page picks up and verifies.
        callback_url: `${APP_URL}/payment/callback/verify`,  // ✅ IMPORTANT: must point to FRONTEND (handled by route.ts now)
        redirect: true,  // required for UPI intent deep-link redirect flow
        // ─────────────────────────────────────────────────────────────

        prefill: {
          name: userName || '',
          email: userEmail || '',
          contact: userPhone || '',
        },

        config: {
          display: {
            // On mobile, show UPI apps (intent) first
            // On desktop, Razorpay falls back to UPI ID / QR automatically
            blocks: {
              utib: {
                name: 'Pay via UPI',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.utib'],
            preferences: { show_default_blocks: true },
          },
        },

        theme: { color: '#4F46E5' },

        // handler is called on desktop / non-redirect flows
        handler: async (response: any) => {
          await verifyAndComplete(response, onSuccess, onFailure);
        },

        modal: {
          ondismiss: () => {
            setIsLoading(false);
            onFailure?.('Payment was cancelled.');
          },
        },
      };

      console.log("Callback URL:", options.callback_url);

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Payment failed. Please try again.';
      setError(message);
      onFailure?.(message);

    } finally {
      setIsLoading(false);
    }
  }, [token, verifyAndComplete]);

  return { initiatePayment, isLoading, error };
}