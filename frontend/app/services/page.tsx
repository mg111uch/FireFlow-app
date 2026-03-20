'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { services } from '@/lib/services-data';
import { GPayPaymentModal } from '@/components/PaymentModal';

// ===== MOCK PAYMENT TEST CONFIG - START =====
// To change test amount: modify TEST_PAYMENT_AMOUNT below
const TEST_PAYMENT_AMOUNT = 10; // Amount in INR
const MOCK_PAYMENT_TEST_ENABLED = true;
// ===== MOCK PAYMENT TEST CONFIG - END =====

export default function ServicesPage() {
  // ===== MOCK PAYMENT TEST CODE - START =====
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  // ===== MOCK PAYMENT TEST CODE - END =====

  // ===== MOCK PAYMENT TEST CODE - START =====
  const handlePaymentSuccess = async (paymentDetails: any) => {
    setShowPayment(false);
    try {
      // Simulate payment submission - in real scenario, submit to API
      console.log('Payment successful:', paymentDetails);
      setPaymentStatus('success');
      alert(`Payment test successful! Amount: ₹${TEST_PAYMENT_AMOUNT}`);
    } catch (error) {
      console.error('Payment test error:', error);
      setPaymentStatus('error');
      alert('Payment test failed!');
    }
  };

  const handlePaymentFailure = (error?: any) => {
    setShowPayment(false);
    setPaymentStatus('failed');
    console.error('Payment failed:', error);
    alert('Payment test failed!');
  };

  const handleTestPayment = () => {
    setShowPayment(true);
  };
  // ===== MOCK PAYMENT TEST CODE - END =====

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-center text-xl text-gray-400 font-bold mb-3">Add your Service to start earning.</h1>

      {services.length === 0 ? (
        <p>No services currently available.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {services.map((service) => (
            <Link href={`/services/${service.slug}`} key={service.id} className="block group">
              <div className="flex items-center justify-center bg-gray-900 rounded-lg shadow-md p-2">
                <h2 className="text-center text-3xm font-semibold mb-2 text-gray-300">{service.name}</h2>
              </div>
            </Link>
          ))}
          
        </div>
        
      )}

      {/* ===== MOCK PAYMENT TEST CODE - START ===== */}
      {MOCK_PAYMENT_TEST_ENABLED && (
        <div className="grid grid-cols-2 gap-2  mt-4 p-4 border-t border-gray-700">
          <button
            onClick={handleTestPayment}
            className="bg-green-600 text-white px-6 py-2 rounded-md font-bold hover:bg-green-700 transition-colors"
          >
            Test Payment Flow (₹{TEST_PAYMENT_AMOUNT})
          </button>
          {paymentStatus && (
            <p className="mt-2 text-gray-400">
              Last test result: <span className={paymentStatus === 'success' ? 'text-green-500' : 'text-red-500'}>{paymentStatus}</span>
            </p>
          )}
        </div>
      )}

      {/* Payment Modal for Testing */}
      <GPayPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={TEST_PAYMENT_AMOUNT}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
      />
      {/* ===== MOCK PAYMENT TEST CODE - END ===== */}
    </div>
  );
}
