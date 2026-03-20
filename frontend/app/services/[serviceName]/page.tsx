'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { getServiceBySlug, Service } from '@/lib/services-data';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';

const SUBSCRIPTION_AMOUNT = 11; 

interface ServicePageProps {
  params: Promise<{
    serviceName: string;
  }>;
}

export default function ServicePage({ params }: ServicePageProps) {
  const router = useRouter();
  // Unwrap params using React.use() for Next.js 15+ compatibility
  const { serviceName } = use(params);
  const service = getServiceBySlug(serviceName);
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
 
  const { initiatePayment, isLoading, error } = useRazorpayPayment();

  // Show success toast when redirected back from /payment/callback
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setToast({ type: 'success', message: 'Payment successful! Your subscription is now active.' });
      // Remove query param from URL without reloading
      window.history.replaceState({}, '', '/services');
    }
  }, [searchParams]);
 
  // Show error toast if hook reports an error
  useEffect(() => {
    if (error) {
      setToast({ type: 'error', message: error });
    }
  }, [error]);
 
  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
 
  const handleSubscribe = () => {
    initiatePayment({
      amount: SUBSCRIPTION_AMOUNT,
      description: 'PostShare Subscription',
      onSuccess: (paymentId) => {
        // This fires on desktop flow (non-redirect)
        setToast({ type: 'success', message: `Payment successful! ID: ${paymentId}` });
      },
      onFailure: (errMessage) => {
        setToast({ type: 'error', message: errMessage });
      },
    });
  };

  const handleSubserviceClick = (subservice: Service['subservices'][0]) => {
    // Navigate to the subservice page using the subservice name
    const slugName = encodeURIComponent(subservice.name.toLowerCase().replace(/\s+/g, '-'));
    router.push(`/services/${serviceName}/${slugName}`);
  };


  if (!service) {
    return (
      <div className="container mx-auto p-2">
        <h1 className="text-center text-xl font-bold">Service not found</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2">

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all
            ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.message}
        </div>
      )}

      <h1 className="text-center text-xl font-bold mb-4">{service.name}</h1>

      {service.subservices.length === 0 ? (
        <p className="text-center text-gray-500">No subservices currently listed.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {service.subservices.map((subservice, index) => (
            <div
              key={index}
              className="flex items-center justify-center bg-gray-900 rounded-lg shadow-md p-3 cursor-pointer hover:bg-gray-700"
              onClick={() => handleSubserviceClick(subservice)}
            >
              <div className="text-center">
                <h2 className="text-3xm font-semibold mb-2 text-gray-300">{subservice.name}</h2>
                {subservice.description && (
                  <p className="text-sm text-gray-400">{subservice.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscribe CTA */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Opening payment...' : `Subscribe — ₹${SUBSCRIPTION_AMOUNT}`}
        </button>
        <p className="text-xs text-gray-500">
          Secure UPI payment via Razorpay · No card required
        </p>
      </div>
      
    </div>
  );
}
