'use client';

import { Suspense } from 'react';
import CallbackInner from './CallbackInner';

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}