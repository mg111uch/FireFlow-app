'use client';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  amount: number;
  description?: string;
  onSelect: (gateway: 'razorpay' | 'flowpay') => void;
  onClose: () => void;
}

export default function PaymentGatewayModal({
  isOpen,
  amount,
  description = 'Payment',
  onSelect,
  onClose,
}: PaymentGatewayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Choose payment method</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 mb-5 text-center">
          <p className="text-gray-400 text-xs mb-1">{description}</p>
          <p className="text-2xl font-bold text-white">₹{amount}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSelect('razorpay')}
            className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-indigo-500 text-white rounded-lg px-4 py-4 transition-all"
          >
            <div className="text-left">
              <p className="font-semibold text-sm">Razorpay</p>
              <p className="text-xs text-gray-400 mt-0.5">UPI, Cards, Net banking</p>
            </div>
            <span className="text-xl">→</span>
          </button>

          <button
            onClick={() => onSelect('flowpay')}
            className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 text-white rounded-lg px-4 py-4 transition-all"
          >
            <div className="text-left">
              <p className="font-semibold text-sm">FlowPay</p>
              <p className="text-xs text-gray-400 mt-0.5">UPI via FlowPay gateway</p>
            </div>
            <span className="text-xl">→</span>
          </button>
        </div>

        <p className="text-gray-500 text-xs text-center mt-4">
          🔒 All payments are encrypted and secure
        </p>
      </div>
    </div>
  );
}