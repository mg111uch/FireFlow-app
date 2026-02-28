// y
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Form, FormSubmission } from '../../../../lib/types';
import { formatTimeAgo } from '../../../../lib/utils';
import { jwtDecode } from 'jwt-decode';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function FormResponsesPage({ params }: { params: { formId: string } }) {
  const router = useRouter();
  const { formId } = params;
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
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-2">Responses for: {form.title}</h1>
      <p className="text-gray-400 mb-4">{form.description}</p>

      {submissions.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No submissions yet for this form.</p>
      ) : (
        <div className="space-y-6 mt-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-white">Submission #{submission.id}</h2>
                <span className="text-sm text-gray-400">
                  By {submission.submitter_username} • {formatTimeAgo(submission.submitted_at)}
                </span>
              </div>
              <div className="space-y-3">
                {submission.answers.map((answer, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-md">
                    <p className="text-gray-300 font-medium">{answer.question_text}</p>
                    <p className="text-gray-200 mt-1">{answer.answer_text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}