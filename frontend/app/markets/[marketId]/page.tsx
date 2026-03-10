'use client';

import { useState, useEffect, use, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Market, MarketOption, MarketTrade } from '../../../lib/types';
import { formatTimeAgo } from '../../../lib/utils';
import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function MarketDetailPage({ params }: { params: Promise<{ marketId: string }> }) {
  const router = useRouter();
  const { marketId } = use(params);
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [tradeAmount, setTradeAmount] = useState<number>(1); // Default trade amount
  const [submittingTrade, setSubmittingTrade] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setCurrentUser(jwtDecode(token));
      } catch (err) {
        console.error("Failed to decode token:", err);
        localStorage.removeItem('token');
      }
    }

    fetchMarketDetails(token);

    // Setup WebSocket connection
    socketRef.current = io(APP_URL as string, {
      auth: { token: token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to market detail WebSocket:', socketRef.current?.id);
      socketRef.current?.emit('joinMarketRoom', parseInt(marketId)); // Join room for this specific market
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from market detail WebSocket');
    });

    socketRef.current.on('connect_error', (err: any) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current.on('marketUpdate', (data: { marketId: number; options: MarketOption[] }) => {
      if (data.marketId === parseInt(marketId)) {
        console.log('Specific market update received:', data);
        setMarket(prevMarket => prevMarket ? { ...prevMarket, options: data.options } : null);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [marketId, router]);

  const fetchMarketDetails = async (token: string | null) => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${APP_URL}/api/markets/${marketId}`, { headers });
      setMarket(res.data);
    } catch (err: any) {
      console.error('Error fetching market details:', err);
      setError(err.response?.data?.error || 'Failed to load market.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTrade(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to place a trade.');
      router.push('/login');
      setSubmittingTrade(false);
      return;
    }

    if (selectedOptionId === null || tradeAmount <= 0) {
      setError('Please select an option and enter a positive amount.');
      setSubmittingTrade(false);
      return;
    }

    try {
      await axios.post(
        `${APP_URL}/api/markets/${marketId}/trade`,
        { option_id: selectedOptionId, amount: tradeAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Trade placed successfully!');
      setTradeAmount(1); // Reset amount
      setSelectedOptionId(null); // Reset selection
      fetchMarketDetails(token); // Re-fetch to update user_trades and ensure consistency
    } catch (err: any) {
      console.error('Error placing trade:', err);
      setError(err.response?.data?.error || 'Failed to place trade.');
    } finally {
      setSubmittingTrade(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading market details...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  if (!market) {
    return <div className="container mx-auto p-4 text-center">Market not found.</div>;
  }

  // Calculate total amount from user's trades for this market
  const totalUserAmount = market.user_trades?.reduce((sum, trade) => sum + trade.amount, 0) || 0;

  return (
    <div className="container mx-auto p-2">
      <button onClick={() => router.back()} className="bg-gray-600 text-white mb-4 px-4 py-2 rounded-md">
        Go Back
      </button>

      <div className="bg-gray-800 p-4 rounded-lg mb-4 shadow-md">
        <h1 className="text-2xl font-bold mb-2 text-white">{market.question}</h1>
        <p className="text-gray-300 mb-2">{market.description}</p>
        <p className="text-sm text-gray-500 mb-4">Created by {market.creator_username} • {formatTimeAgo(market.created_at)}</p>

        <h2 className="text-xl font-semibold mb-3 text-blue-400">Current Probabilities</h2>
        <div className="space-y-3">
          {market.options.map(option => (
            <div 
              key={option.id} 
              onClick={() => setSelectedOptionId(option.id)}
              className={`bg-gray-700 p-3 rounded-md flex justify-between items-center cursor-pointer transition-all ${
                selectedOptionId === option.id 
                  ? 'ring-2 ring-blue-500 bg-gray-600' 
                  : 'hover:bg-gray-650'
              }`}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="market_option"
                  value={option.id}
                  checked={selectedOptionId === option.id}
                  onChange={() => setSelectedOptionId(option.id)}
                  className="form-radio h-5 w-5 text-blue-600"
                />
                <span className="text-lg text-gray-200">{option.option_text}</span>
              </div>
              <span className="text-2xl font-bold text-green-400">{option.probability?.toFixed(2) || 0}%</span>
            </div>
          ))}
        </div>

        {currentUser && (
          <>
            {market.user_trades && market.user_trades.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-gray-300 mb-2">You have contributed a total of <span className="font-bold text-yellow-400">{totalUserAmount}</span> to this market.</p>
                <ul className="list-disc list-inside text-gray-400">
                  {market.user_trades.map((trade, index) => {
                    const option = market.options.find(opt => opt.id === trade.option_id);
                    return (
                      <li key={index}>
                        {option?.option_text}: {trade.amount}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {error && <p className="text-red-500 mt-4">{error}</p>}
            <form onSubmit={handlePlaceTrade} className="mt-4 space-y-4">
              <div>
                <label htmlFor="tradeAmount" className="block text-gray-300 font-bold mb-2">Amount (Your Conviction/Weight):</label>
                <input
                  type="number"
                  id="tradeAmount"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(parseFloat(e.target.value))}
                  min="1"
                  step="0.01"
                  className="border p-2 w-full rounded-md text-gray-300"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-bold hover:bg-blue-700"
                disabled={submittingTrade}
              >
                {submittingTrade ? 'Placing Trade...' : 'Place Trade'}
              </button>
            </form>
          </>
        )}

        {!currentUser && (
          <div className="mt-4 pt-4 border-t border-gray-600 text-center">
            <p className="text-gray-300 mb-4">Log in to place your prediction on this market!</p>
            <Link href="/login" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
              Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}