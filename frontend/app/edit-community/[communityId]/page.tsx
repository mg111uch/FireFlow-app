'use client';

import { useState, useEffect, use } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { Community } from '../../../lib/types';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function EditCommunityPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = use(params);
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchCommunityDetails = async () => {
      setLoading(true);
      try {
        const decodedToken: any = jwtDecode(token);
        const userId = decodedToken.id;

        const response = await axios.get(`${APP_URL}/api/communities/${communityId}`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        const fetchedCommunity: Community = response.data;

        // Verify if the logged-in user is the creator
        if (fetchedCommunity.creator_id !== userId) {
          alert('You are not authorized to edit this community.');
          router.push('/profile'); // Redirect to profile or communities page
          return;
        }
        setCommunity(fetchedCommunity);
        setName(fetchedCommunity.name);
        setDescription(fetchedCommunity.description);
      } catch (err: any) {
        console.error('Error fetching community details:', err);
        setError(err.response?.data?.error || 'Failed to load community details.');
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('token');
          router.push('/login');
        } else {
          router.push('/profile'); // Redirect if community not found or other errors
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityDetails();
  }, [communityId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      setIsSubmitting(false);
      return;
    }

    if (!name.trim() || !description.trim()) {
      setError('Community name and description cannot be empty.');
      setIsSubmitting(false);
      return;
    }

    try {
      await axios.put(`${APP_URL}/api/communities/${communityId}`, 
        {name,description}, 
        {headers: {Authorization: `Bearer ${token}`},
      });

      alert('Community updated successfully!');
      router.back(); 
    } catch (err: any) {
      console.error('Error updating community:', err);
      setError(err.response?.data?.error || 'Failed to update community.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading community details...</div>;
  }

  if (error ) { 
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  if (!community) {
    return <div className="container mx-auto p-4 text-center">Community not found or access denied.</div>;
  }

  return (
    <div className="container mx-auto p-2 max-w-md">
      <button onClick={() => router.back()} className="bg-gray-600 text-white mb-4 px-4 py-2 rounded-md">
        Go Back
      </button>

      <h1 className="text-lg font-bold mb-6">Edit Community</h1>

      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-md p-6">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-300 text-sm font-bold mb-2">
            Community Name:
          </label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-300 leading-tight"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-gray-300 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-300 leading-tight h-32 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={500}
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-gray-200 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Update Community'}
        </button>
      </form>
    </div>
  );
}