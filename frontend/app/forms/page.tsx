// y
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Form } from '../../lib/types';
import { formatTimeAgo } from '../../lib/utils';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchForms(token);
  }, [router]);

  const fetchForms = async (token: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${APP_URL}/api/forms/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms(res.data);
    } catch (err: any) {
      console.error('Error fetching forms:', err);
      setError(err.response?.data?.error || 'Failed to load forms.');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading forms...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-4">My Forms</h1>

      <Link href="/forms/create" className="w-full bg-green-500 text-white px-4 py-2 rounded-md mb-4 inline-block text-center">
        + Create New Form
      </Link>

      {forms.length === 0 ? (
        <p className="text-center text-gray-500 mt-4">You haven't created any forms yet.</p>
      ) : (
        <div className="space-y-4 mt-4">
          {forms.map((form) => (
            <div key={form.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-blue-400 mb-2">{form.title}</h2>
              <p className="text-gray-300 mb-2">{form.description}</p>
              <p className="text-sm text-gray-500 mb-4">Created: {formatTimeAgo(form.created_at)}</p>
              <div className="flex space-x-2">
                <Link href={`/forms/${form.id}/fill`} className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">
                  Fill Form
                </Link>
                <Link href={`/forms/${form.id}/responses`} className="bg-purple-500 text-white px-3 py-1 rounded-md hover:bg-purple-600">
                  View Responses
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}