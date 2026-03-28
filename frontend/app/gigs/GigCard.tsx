'use client';

import { Gig, GigDetails } from './types';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/config';

interface GigCardProps {
  gig: Gig;
  showActions?: boolean;
  onAccept?: (gigId: number) => void;
  onComplete?: (gigId: number) => void;
  onCancel?: (gigId: number) => void;
  onReset?: (gigId: number) => void;
  onDelete?: (gigId: number) => void;
}

export default function GigCard({ gig, showActions = false, onAccept, onComplete, onCancel, onReset, onDelete }: GigCardProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.id === 1;

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-3 shadow-md">
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-700 text-gray-300">
            {gig.type === 'ride' ? 'Ride' : 'Delivery'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex gap-1">
              {onReset && (
                <button
                  onClick={() => onReset(gig.id)}
                  className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Reset
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this gig?')) {
                      onDelete(gig.id);
                    }
                  }}
                  className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              )}
            </div>
          )}
          <span className="text-lg font-bold text-green-400">₹{gig.price}</span>
        </div>
      </div>
      
      <div className="mb-2">
        <p className="text-gray-300 text-sm"><span className="text-gray-500">From:</span> {gig.pickup_address}</p>
        <p className="text-gray-300 text-sm"><span className="text-gray-500">To:</span> {gig.dropoff_address}</p>
      </div>

      {gig.details && (
        <div className="mb-2 text-sm text-gray-400">
          {gig.type === 'ride' && gig.details.passengers && (
            <p>{gig.details.passengers} passenger(s)</p>
          )}
          {gig.type === 'delivery' && gig.details.packageDescription && (
            <p>{gig.details.packageDescription}</p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 mb-2">
        By {gig.user_username} • {new Date(gig.created_at).toLocaleDateString()}
        {gig.driver_username && ` • Driver: ${gig.driver_username}`}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-2">
          {gig.status === 'open' && gig.user_id !== currentUser?.id && (
            <button
              onClick={() => onAccept?.(gig.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Accept
            </button>
          )}
          {gig.status === 'accepted' && (gig.user_id === currentUser?.id || gig.driver_id === currentUser?.id) && (
            <button
              onClick={() => onComplete?.(gig.id)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              Complete
            </button>
          )}
          {(gig.status === 'open' || gig.status === 'accepted') && (
            <button
              onClick={() => onCancel?.(gig.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}