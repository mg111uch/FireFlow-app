// y
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { MarketOption } from '../../../lib/types';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function CreateMarketPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<MarketOption[]>(
    [{ option_text: '' }, { option_text: '' }] // Start with 2 empty options
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const updateOptionText = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], option_text: text };
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, { option_text: '' }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to create a market.');
      setLoading(false);
      return;
    }

    if (!question.trim()) {
      setError('Market question is required.');
      setLoading(false);
      return;
    }
    if (options.length < 2) {
      setError('Please add at least two options.');
      setLoading(false);
      return;
    }
    const cleanOptions = options.filter(opt => opt.option_text.trim() !== '');
    if (cleanOptions.length < 2) {
      setError('All options must have text and there must be at least two valid options.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${APP_URL}/api/markets`,
        { question, description, options: cleanOptions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Market created successfully!');
      router.push(`/markets/${res.data.marketId}`); // Redirect to the new market page
    } catch (err: any) {
      console.error('Error creating market:', err);
      setError(err.response?.data?.error || 'Failed to create market.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-4">Create New Prediction Market</h1>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="marketQuestion" className="block text-gray-300 font-bold mb-2">Market Question:</label>
          <input
            type="text"
            id="marketQuestion"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="border p-2 w-full rounded-md text-gray-300"
            placeholder="e.g., Will X happen by Y date?"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="marketDescription" className="block text-gray-300 font-bold mb-2">Description (Optional):</label>
          <textarea
            id="marketDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 w-full rounded-md text-gray-300"
            rows={3}
            placeholder="Provide more context for the market..."
          />
        </div>

        <h2 className="text-xl font-bold mb-3">Options (Outcomes):</h2>
        <div className="space-y-4 mb-6">
          {options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={option.option_text}
                onChange={(e) => updateOptionText(index, e.target.value)}
                className="border p-2 flex-grow rounded-md text-gray-300"
                placeholder={`Option ${index + 1}`}
                required
              />
              {options.length > 2 && ( // Allow removing only if more than 2 options
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + Add Option
          </button>
        </div>

        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-3 rounded-md text-lg font-bold hover:bg-green-600"
          disabled={loading}
        >
          {loading ? 'Creating Market...' : 'Create Market'}
        </button>
      </form>
    </div>
  );
}