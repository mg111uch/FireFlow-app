'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '@/lib/config';
import FlowpayModal from '@/components/FlowpayModal';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly Premium',
    price: 240,
    interval: 'month',
    features: [
      'Ad-free experience',
      'Exclusive badge',
      'Priority customer support',
      'Premium-only communities',
      'Advanced analytics',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly Premium',
    price: 2400,
    interval: 'year',
    features: [
      'All Monthly features',
      'Save 33% vs monthly',
      'Early access to new features',
      'Exclusive yearly badge',
      'Custom profile themes',
    ],
  },
];

export default function PremiumPage() {
  const router = useRouter();
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handleSubscribe = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    console.log('Payment successful:', paymentId);
    setShowPayment(false);
    alert('Payment successful! Your premium is now active.');
  };

  const handlePaymentFailure = (error: string) => {
    console.error('Payment failed:', error);
    setShowPayment(false);
  };

  return (
    <div className="container mx-auto p-2">

      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold mb-2">Upgrade to Premium</h1>
        <p className="text-gray-400">Unlock exclusive features and enhance your {APP_NAME} experience</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto p-2">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-gray-900 border border-yellow-500/30 rounded-lg p-6 hover:border-yellow-500 transition-colors">
            <h2 className="text-xl font-bold text-yellow-500 mb-2">{plan.name}</h2>
            <div className="mb-4">
              <span className="text-3xl font-bold">₹ {plan.price}</span>
              <span className="text-gray-400">/{plan.interval}</span>
            </div>
            <ul className="space-y-1 mb-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-300">
                  <span className="text-yellow-500 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.id)}
              className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-md hover:bg-yellow-400 transition-colors"
            >
              Subscribe for ₹ {plan.price}
            </button>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <FlowpayModal
          isOpen={showPayment}
          amount={selectedPlan.price}
          description={`${selectedPlan.name} Subscription`}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onClose={() => setShowPayment(false)}
        />
      )}

      <p className="text-center text-gray-500 text-sm mt-8">
        Cancel anytime. No questions asked.
      </p>
    </div>
  );
}