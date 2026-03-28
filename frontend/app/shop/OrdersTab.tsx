'use client';

import { Order } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface OrdersTabProps {
  orders: Order[];
  updateStatus: (id: string, status: string) => Promise<boolean>;
  resetStatus: (id: string) => Promise<boolean>;
}

export default function OrdersTab({ orders, updateStatus, resetStatus }: OrdersTabProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.id === 1;
  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'ready': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const statusLabels = ['Pending', 'Ready', 'Shipped', 'Delivered'];

  return (
    <div className="space-y-3">
      {orders.length === 0 ? <p className="text-gray-400">No orders yet</p> : orders.map(o => {
        const currentStep = getStatusStep(o.status);
        return (
        <div key={o.id} className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Order #{String(o.id).slice(-6)}</span>
            {isAdmin && (
              <button
                onClick={() => resetStatus(String(o.id))}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
              >
                Reset
              </button>
            )}
          </div>
          <p className="text-gray-400 text-sm">Customer: {o.customer_username || 'User ' + o.customer_id}</p>
          <div className="text-gray-400 text-sm">
            {o.items?.map((item, i) => (
              <div key={i}>{item.product?.name || 'Product'} x{item.quantity}</div>
            ))}
            <div>Total: ₹{o.total}</div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-xs mb-2">
              {statusLabels.map((label, idx) => {
                const isClickable = idx > currentStep && idx < 3;
                const isCompleted = idx <= currentStep;
                const isCurrent = idx === currentStep;
                const isNext = idx === currentStep + 1;
                const displayLabel = isCompleted && !isCurrent && idx === 0 ? 'Processed' : label;
                const btnText = isCompleted ? displayLabel : <><span className="block">Mark</span><span className="block">{label}</span></>;
                return idx < 3 ? (
                  <button
                    key={idx}
                    disabled={!isClickable}
                    onClick={() => {
                      const statuses = ['pending', 'ready', 'shipped', 'delivered'];
                      updateStatus(String(o.id), statuses[idx]);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded text-center text-xs leading-tight h-10 ${isCurrent ? 'bg-transparent text-green-400' : isCompleted ? 'bg-transparent text-gray-400' : isNext ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-700 text-gray-500'} disabled:cursor-default transition-colors`}
                  >
                    {btnText}
                  </button>
                ) : (
                  <div key={idx} className="flex-1 py-1.5 px-2 rounded text-center text-xs text-gray-400">
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full">
              <div 
                className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}