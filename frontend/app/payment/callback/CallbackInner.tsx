'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/config';
import axios from 'axios';

type Status = 'verifying' | 'success' | 'failed';

export default function CallbackInner() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (loading) return;  // wait for AuthContext to read localStorage

    if (!token) {
      setStatus('failed');
      setMessage('You are not logged in. Please log in and try again.');
      return;
    }

    const paymentId  = searchParams.get('razorpay_payment_id');
    const orderId    = searchParams.get('razorpay_order_id');
    const signature  = searchParams.get('razorpay_signature');

    // Persist on fresh redirect, recover on refresh
    if (paymentId && orderId && signature) {
      sessionStorage.setItem('rzp_cb', JSON.stringify({ paymentId, orderId, signature }));
    }

    const saved = sessionStorage.getItem('rzp_cb');
    const params = paymentId && orderId && signature
      ? { paymentId, orderId, signature }
      : saved ? JSON.parse(saved) : null;

    if (!params) {
      setStatus('failed');
      setMessage('Payment details missing. Please contact support.');
      return;
    }

    axios
      .post(
        `${API_URL}/api/payments/verify`,
        {
          razorpay_payment_id: params.paymentId,
          razorpay_order_id:   params.orderId,
          razorpay_signature:  params.signature,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        sessionStorage.removeItem('rzp_cb');
        setStatus('success');
        setMessage('Payment verified! Activating your subscription...');
        setTimeout(() => router.replace('/services?payment=success'), 2000);
      })
      .catch((err) => {
        const errMsg = err?.response?.data?.error || 'Payment verification failed.';
        setStatus('failed');
        setMessage(errMsg);
      });
  }, [token, loading, searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm text-center">
        {status === 'verifying' && (
          <>
            <Spinner />
            <p className="text-gray-400 text-sm">Verifying your payment, please wait...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckIcon />
            <h1 className="text-xl font-semibold text-green-400">Payment Successful</h1>
            <p className="text-gray-400 text-sm">{message}</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <CrossIcon />
            <h1 className="text-xl font-semibold text-red-400">Payment Failed</h1>
            <p className="text-gray-400 text-sm">{message}</p>
            <button
              onClick={() => router.replace('/services')}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium transition-colors"
            >
              Back to Services
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-10 w-10 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}