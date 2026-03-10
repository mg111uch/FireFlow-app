'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Market } from '../lib/types';
import { formatTimeAgo } from '../lib/utils';

interface MarketCardProps {
  market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  const handleOptionClick = (optionId: number) => {
    setSelectedOptionId(optionId);
  };

  const showProbability = selectedOptionId !== null;
  const totalVotes = market.options.reduce((sum, opt) => sum + (opt.amount || 0), 0);

  return (
    <div className="bg-gray-900 p-2 border-b border-gray-600">
      <Link href={`/markets/${market.id}`} className="block">
        <h2 className="text-xl font-semibold text-blue-400 mb-2">{market.question}</h2>
      </Link>
      <p className="text-gray-300 mb-2">{market.description}</p>
      <p className="text-sm text-gray-500 mb-4">Created: {formatTimeAgo(market.created_at)} by {market.creator_username}</p>
      
      <div className="mt-4 space-y-2">
        {market.options.map(option => {
          const isSelected = selectedOptionId === option.id;
          
          return (
            <div 
              key={option.id} 
              onClick={() => handleOptionClick(option.id)}
              className={`bg-gray-700 p-2 rounded-md cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-center relative">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-200">{option.option_text}</span>
                </div>
                {showProbability && (
                  <>
                    <span className="text-lg font-semibold text-green-400">{option.probability?.toFixed(2) || 0}%</span>
                    {/* Probability bar */}
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-green-500 rounded-full" 
                      style={{ width: `${option.probability || 0}%` }}
                    ></div>
                  </>
                )}
              </div>
              {isSelected && showProbability && option.amount !== undefined && (
                <div className="mt-1 text-sm text-gray-400">
                  Votes: {option.amount}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Total vote count */}
      {showProbability && (
        <div className="mt-2 text-sm text-gray-400">
          Total Votes: {totalVotes}
        </div>
      )}
    </div>
  );
}
