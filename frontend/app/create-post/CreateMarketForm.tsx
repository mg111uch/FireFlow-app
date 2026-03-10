'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function CreateMarketForm() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<{ id?: number; option_text: string }[]>(
    [{ id: 1, option_text: '' }, { id: 2, option_text: '' }]
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateOptionText = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], option_text: text };
    setOptions(newOptions);
  };

  const addOption = () => {
    const newId = options.length > 0 ? Math.max(...options.map(o => o.id || 0)) + 1 : 1;
    setOptions([...options, { id: newId, option_text: '' }]);
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
      router.push(`/markets/${res.data.marketId}`);
    } catch (err: any) {
      console.error('Error creating market:', err);
      setError(err.response?.data?.error || 'Failed to create market.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 p-3">
      <div className="mb-4">
        <label htmlFor="marketQuestion" className="block text-gray-300 font-bold mb-2">Question:</label>
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
          <div key={option.id ?? index} className="flex items-center space-x-2">
            <input
              type="text"
              value={option.option_text}
              onChange={(e) => updateOptionText(index, e.target.value)}
              className="border p-2 flex-grow rounded-md text-gray-300"
              placeholder={`Option ${index + 1}`}
              required
            />
            {options.length > 2 && (
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
      </div>

      <div className="flex justify-between items-center">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
          disabled={loading}
        >
          {loading ? 'Creating Market...' : 'Create Market'}
        </button>
        <button
          type="button"
          onClick={addOption}
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          + Add Option
        </button>
      </div>
    </form>
  );
}
