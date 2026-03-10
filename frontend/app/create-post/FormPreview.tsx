'use client';

import { FormQuestion } from '../../lib/types';

interface FormPreviewProps {
  questions: FormQuestion[];
}

export default function FormPreview({ questions }: FormPreviewProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="text-gray-500 mb-2">
          <span className="text-blue-600">YourName</span> • just now
        </div>
        
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-gray-800 p-3 rounded-lg">
              <label className="block text-gray-300 font-semibold mb-2">
                {q.question_text || `Field ${qIndex + 1}`}
              </label>
              
              {q.question_type === 'text' && (
                <input
                  type="text"
                  className="border p-2 w-full rounded-md text-gray-300 bg-gray-700"
                  placeholder="Your answer..."
                  disabled
                />
              )}
              
              {q.question_type === 'textarea' && (
                <textarea
                  className="border p-2 w-full rounded-md text-gray-300 bg-gray-700"
                  rows={3}
                  placeholder="Your answer..."
                  disabled
                />
              )}
              
              {q.question_type === 'radio' && q.options && (
                <div className="space-y-2">
                  {q.options.map((option, oIndex) => (
                    <label key={oIndex} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`preview-${qIndex}`}
                        className="w-4 h-4"
                        disabled
                      />
                      <span className="text-gray-300">{option.option_text || `Option ${oIndex + 1}`}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-8 mt-4 ml-2 border-t border-gray-700 pt-4">
          <div className="flex items-center text-gray-500">
            <span>👁</span> <span className="ml-1">0</span>
          </div>
          <div className="flex items-center text-gray-500">
            <span>💬</span> <span className="ml-1">0</span>
          </div>
          <div className="flex items-center text-gray-500">
            <span>⬆</span> <span className="ml-1">0</span>
          </div>
          <div className="flex items-center text-gray-500">
            <span>⬇</span> <span className="ml-1">0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
