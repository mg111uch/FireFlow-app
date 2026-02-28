// y
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Market } from '../../lib/types';
import { formatTimeAgo } from '../../lib/utils';
import { io, Socket } from 'socket.io-client';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function MarketsPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // We fetch markets even if not logged in, but token is needed for specific actions
    fetchMarkets(token);

    // Setup WebSocket connection
    socketRef.current = io(APP_URL as string, {
      auth: { token: token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to market WebSocket:', socketRef.current?.id);
      socketRef.current?.emit('joinGlobalMarkets'); // Join a global room for all market updates
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from market WebSocket');
    });

    socketRef.current.on('marketUpdate', (data: { marketId: number; options: Market['options'] }) => {
      console.log('Market update received:', data);
      setMarkets(prevMarkets => prevMarkets.map(market =>
        market.id === data.marketId ? { ...market, options: data.options } : market
      ));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [router]);

  const fetchMarkets = async (token: string | null) => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${APP_URL}/api/markets`, { headers });
      setMarkets(res.data);
    } catch (err: any) {
      console.error('Error fetching markets:', err);
      setError(err.response?.data?.error || 'Failed to load markets.');
      // No redirect for 401/403 here, as it's an optional auth route
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading markets...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-4">Prediction Markets</h1>
      <Link href="/markets/create" className="w-full bg-green-500 text-white px-4 py-2 rounded-md mb-4 inline-block text-center">
        + Create New Market
      </Link>

      {markets.length === 0 ? (
        <p className="text-center text-gray-500 mt-4">No prediction markets available yet. Be the first to create one!</p>
      ) : (
        <div className="space-y-4 mt-4">
          {markets.map((market) => (
            <div key={market.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
              <Link href={`/markets/${market.id}`} className="block">
                <h2 className="text-xl font-semibold text-blue-400 mb-2">{market.question}</h2>
                <p className="text-gray-300 mb-2">{market.description}</p>
                <p className="text-sm text-gray-500 mb-4">Created: {formatTimeAgo(market.created_at)} by {market.creator_username}</p>
                
                <div className="mt-4">
                  {market.options.map(option => (
                    <div key={option.id} className="flex items-center justify-between text-gray-200 mb-1">
                      <span>{option.option_text}</span>
                      <span className="font-semibold">{option.probability?.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}