'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Form } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface FormCardProps {
  form: Form;
  isOwner: boolean;
  onDeleted?: (formId: number) => void;
}

export default function FormCard({ form, isOwner, onDeleted }: FormCardProps) {
  const { token } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    if (!token) {
      setError('You must be logged in to delete a form.');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const APP_URL = process.env.NEXT_PUBLIC_URL;
      await axios.delete(`${APP_URL}/api/forms/${form.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (onDeleted) {
        onDeleted(form.id);
      }
    } catch (err: any) {
      console.error('Error deleting form:', err);
      setError(err.response?.data?.error || 'Failed to delete form.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-gray-900 border-b p-2 border-gray-600">
      <h2 className="text-xl font-semibold text-blue-400 mb-2">{form.title}</h2>
      <p className="text-gray-300 mb-2">{form.description}</p>
      <p className="text-sm text-gray-500 mb-4">Created: {formatTimeAgo(form.created_at)}</p>
      <div className="flex space-x-2">
        <Link 
          href={`/services/forms/${form.id}/fill`} 
          className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
        >
          Fill Form
        </Link>
        {isOwner && (
          <>
            <Link 
              href={`/services/forms/${form.id}/responses`} 
              className="bg-purple-500 text-white px-3 py-1 rounded-md hover:bg-purple-600"
            >
              View Responses
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="border border-red-700 text-white text-sm px-3 py-1 rounded-md disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
