'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Form, FormSubmission } from '../../../../../lib/types';
import ResponsesCard from '@/app/services/ResponsesCard';
import { jwtDecode } from 'jwt-decode';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function FormResponsesPage({ params }: { params: Promise<{ formId: string }> }) {
  const router = useRouter();
  const { formId } = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Check if user is creator
    try {
      const decoded: any = jwtDecode(token);
      axios.get(`${APP_URL}/api/forms/${formId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data.creator_id !== decoded.id) {
            alert('You are not authorized to view responses for this form.');
            router.push('/forms');
            return;
          }
          setForm(res.data);
          fetchSubmissions(token);
        })
        .catch(err => {
          console.error('Error fetching form for authorization:', err);
          setError(err.response?.data?.error || 'Failed to load form details for authorization.');
          router.push('/forms');
        });
    } catch (e) {
      console.error('Invalid token:', e);
      router.push('/login');
    }

    const fetchSubmissions = async (token: string) => {
      setLoading(true);
      try {
        const res = await axios.get(`${APP_URL}/api/forms/${formId}/submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubmissions(res.data);
      } catch (err: any) {
        console.error('Error fetching submissions:', err);
        setError(err.response?.data?.error || 'Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    };
    
  }, [formId, router]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading responses...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  if (!form) {
    return <div className="container mx-auto p-4 text-center">Form details not found.</div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-2 ml-2 mr-2">{form.title}</h1>
      <p className="text-gray-400 mb-2 ml-2 mr-2">{form.description}</p>

      {submissions.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No submissions yet for this form.</p>
      ) : (
        <ResponsesCard submissions={submissions} showHeader={true} />
      )}
    </div>
  );
}