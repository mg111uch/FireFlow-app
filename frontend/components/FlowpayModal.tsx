'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL, APP_URL } from '@/lib/config';

interface PaymentModalProps {
  isOpen: boolean;
  amount: number;
  description: string;
  orderId?: string;
  returnUrl?: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
  onClose: () => void;
}

export default function PaymentModal({
  isOpen,
  amount,
  description,
  orderId: initialOrderId,
  returnUrl,
  onSuccess,
  onFailure,
  onClose,
}: PaymentModalProps) {
  const router = useRouter();
  
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const orderCreatedRef = useRef(false);
  const latestOrderIdRef = useRef('');

  useEffect(() => {
    if (isOpen && !orderCreatedRef.current) {
      orderCreatedRef.current = true;
      createOrder();
    }
  }, [isOpen]);

  const createOrder = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API_URL}/api/payments/create-order`,
        { amount, gateway: 'flowpay' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      latestOrderIdRef.current = data.order_id;
      setOrderId(data.order_id);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to create order';
      setError(message);
      onFailure(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/api/payments/process`,
        { order_id: latestOrderIdRef.current },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("ORDER USED:", latestOrderIdRef.current);

      const { payment_id, signature } = response.data;

      let redirectUrl = `${APP_URL}/payment/callback?payment_id=${payment_id}&order_id=${latestOrderIdRef.current}&signature=${signature}`;
      if (returnUrl) {
        redirectUrl += `&returnUrl=${encodeURIComponent(returnUrl)}`;
      }
      window.location.href = redirectUrl;

    } catch (err: any) {
      const message = err?.response?.data?.error || 'Payment failed. Please try again.';
      setError(message);
      setIsProcessing(false);
      onFailure(message);
    }
  };

  const handleClose = () => {
    orderCreatedRef.current = false;
    setUpiId('');
    setError('');
    setOrderId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Flowpay</h1>
          <div className="flex gap-2">
            <div className="w-8 h-5 bg-red-500 rounded"></div>
            <div className="w-8 h-5 bg-yellow-500 rounded"></div>
            <div className="w-8 h-5 bg-green-500 rounded"></div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Creating order...</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-gray-400 text-sm">Amount</p>
              <p className="text-2xl font-bold text-white">₹{amount}</p>
              <p className="text-gray-500 text-sm mt-1">{description}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-700 text-white py-3 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!orderId || isProcessing}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : `Pay ₹${amount}`}
                </button>
              </div>
            </form>
          </>
        )}

        <p className="text-gray-500 text-xs text-center mt-4">
          🔒 Secured by Flowpay
        </p>
      </div>
    </div>
  );
}