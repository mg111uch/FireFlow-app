'use client';

import React, { useState } from 'react';
import { FormSubmission } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';
import axios from 'axios';
import { API_URL } from '@/lib/config';

interface ResponsesCardProps {
  submissions: FormSubmission[];
  showHeader?: boolean;
  title?: string;
  isAdmin?: boolean;
  formId?: number | null;
}

export default function ResponsesCard({ submissions, showHeader = true, title, isAdmin = false, formId }: ResponsesCardProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (submissionId: number) => {
    if (!confirm('Are you sure you want to delete this response?')) return;
    if (!formId) return;

    setDeletingId(submissionId);
    try {
      await axios.delete(`${API_URL}/api/forms/${formId}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Remove from local state to update UI
      submissions.splice(submissions.findIndex(s => s.id === submissionId), 1);
    } catch (err: any) {
      console.error('Error deleting submission:', err);
      alert(err.response?.data?.error || 'Failed to delete response.');
    } finally {
      setDeletingId(null);
    }
  };
  if (submissions.length === 0) {
    return null;
  }

  return (
    <div>
      {title && <h2 className="text-xl font-bold text-center mb-2">{title}</h2>}
      
      {/* Header card with question texts only */}
      {showHeader && (
        <div className="bg-gray-800 p-2 border-b border-gray-600">
          <div className="flex justify-between">
            <div className="w-1/2">
              {submissions[0].answers.slice(0, Math.ceil(submissions[0].answers.length / 2)).map((answer, index) => (
                <div key={index} className="py-1">
                  <p className="text-gray-300 font-medium">{answer.question_text}</p>
                </div>
              ))}
            </div>
            <div className="w-1/2 text-right">
              {submissions[0].answers.slice(Math.ceil(submissions[0].answers.length / 2)).map((answer, index) => (
                <div key={index} className="py-1">
                  <p className="text-gray-300 font-medium">{answer.question_text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
       {/* Data cards with values only */}
       {submissions.map((submission) => (
         <div key={submission.id} className="bg-gray-900 p-2 border-b border-gray-600">
           <div className="flex justify-between items-center mb-2">
             <span className="text-sm text-gray-400">
               By {submission.submitter_username || 'Anonymous'} • {formatTimeAgo(submission.submitted_at)}
             </span>
             {isAdmin && (
               <button
                 onClick={() => handleDelete(submission.id)}
                 disabled={deletingId === submission.id}
                 className="text-red-500 hover:text-red-400 text-sm font-medium disabled:opacity-50"
               >
                 {deletingId === submission.id ? 'Deleting...' : 'Delete'}
               </button>
             )}
           </div>
            <div className="flex justify-between">
              <div className="w-1/2">
                {submission.answers.slice(0, Math.ceil(submission.answers.length / 2)).map((answer, index) => (
                  <div key={index} className="py-1">
                    {answer.question_type === 'image_file' && answer.answer_text ? (
                      <img
                        src={`${API_URL}/api-uploads${answer.answer_text}`}
                        alt={answer.question_text}
                        className="max-w-full max-h-48 rounded border border-gray-600 object-contain"
                      />
                    ) : (
                      <p className="text-gray-300">{answer.answer_text}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="w-1/2 text-right">
                {submission.answers.slice(Math.ceil(submission.answers.length / 2)).map((answer, index) => (
                  <div key={index} className="py-1">
                    {answer.question_type === 'image_file' && answer.answer_text ? (
                      <img
                        src={`${API_URL}/api-uploads${answer.answer_text}`}
                        alt={answer.question_text}
                        className="max-w-full max-h-48 rounded border border-gray-600 object-contain"
                      />
                    ) : (
                      <p className="text-gray-300">{answer.answer_text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
        </div>
      ))}
    </div>
  );
}
