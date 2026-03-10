'use client';

import React from 'react';
import { FormSubmission } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';

interface ResponsesCardProps {
  submissions: FormSubmission[];
  showHeader?: boolean;
  title?: string;
}

export default function ResponsesCard({ submissions, showHeader = true, title }: ResponsesCardProps) {
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
          </div>
          <div className="flex justify-between">
            <div className="w-1/2">
              {submission.answers.slice(0, Math.ceil(submission.answers.length / 2)).map((answer, index) => (
                <div key={index} className="py-1">
                  <p className="text-gray-300">{answer.answer_text}</p>
                </div>
              ))}
            </div>
            <div className="w-1/2 text-right">
              {submission.answers.slice(Math.ceil(submission.answers.length / 2)).map((answer, index) => (
                <div key={index} className="py-1">
                  <p className="text-gray-300">{answer.answer_text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
