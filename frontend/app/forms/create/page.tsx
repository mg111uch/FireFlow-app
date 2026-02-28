// y
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FormQuestion, FormQuestionOption } from '../../../lib/types';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function CreateFormPage() {
  const router = useRouter();
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const addQuestion = (type: 'text' | 'textarea' | 'radio') => {
    setQuestions([...questions, {
      question_text: '',
      question_type: type,
      options: type === 'radio' ? [{ option_text: '' }] : undefined,
    }]);
  };

  const updateQuestionText = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].question_text = text;
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options?.push({ option_text: '' });
    } else {
      newQuestions[questionIndex].options = [{ option_text: '' }];
    }
    setQuestions(newQuestions);
  };

  const updateOptionText = (questionIndex: number, optionIndex: number, text: string) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options![optionIndex].option_text = text;
    }
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options?.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to create a form.');
      setLoading(false);
      return;
    }

    if (!formTitle.trim()) {
      setError('Form title is required.');
      setLoading(false);
      return;
    }
    if (questions.length === 0) {
      setError('Please add at least one question.');
      setLoading(false);
      return;
    }
    
    // Basic validation for questions and options
    for (const q of questions) {
      if (!q.question_text.trim()) {
        setError('All questions must have text.');
        setLoading(false);
        return;
      }
      if (q.question_type === 'radio') {
        if (!q.options || q.options.length < 2) {
          setError('Radio questions need at least two options.');
          setLoading(false);
          return;
        }
        for (const opt of q.options) {
          if (!opt.option_text.trim()) {
            setError('All radio options must have text.');
            setLoading(false);
            return;
          }
        }
      }
    }

    try {
      const res = await axios.post(
        `${APP_URL}/api/forms`,
        { title: formTitle, description: formDescription, questions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Form created successfully!');
      router.push('/forms'); // Redirect to my forms list
    } catch (err: any) {
      console.error('Error creating form:', err);
      setError(err.response?.data?.error || 'Failed to create form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-4">Create New Form</h1>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="formTitle" className="block text-gray-300 font-bold mb-2">Form Title:</label>
          <input
            type="text"
            id="formTitle"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="border p-2 w-full rounded-md text-gray-300"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="formDescription" className="block text-gray-300 font-bold mb-2">Description (Optional):</label>
          <textarea
            id="formDescription"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="border p-2 w-full rounded-md text-gray-300"
            rows={3}
          />
        </div>

        <h2 className="text-xl font-bold mb-3">Questions:</h2>
        <div className="space-y-6 mb-6">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-gray-700 p-4 rounded-lg border border-gray-600 relative">
              <button
                type="button"
                onClick={() => removeQuestion(qIndex)}
                className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                title="Remove Question"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.74 5.955m14.82-2.368a48.424 48.424 0 0 0-1.122-.122M16.5 7.5h-9" />
                </svg>
              </button>
              <label htmlFor={`question-${qIndex}`} className="block text-gray-300 font-bold mb-2">Question Text:</label>
              <input
                type="text"
                id={`question-${qIndex}`}
                value={q.question_text}
                onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                className="border p-2 w-full rounded-md mb-2 text-gray-300"
                placeholder={`Enter question text for ${q.question_type}...`}
                required
              />
              <span className="text-sm text-gray-400">Type: {q.question_type.charAt(0).toUpperCase() + q.question_type.slice(1)}</span>

              {q.question_type === 'radio' && (
                <div className="mt-4">
                  <h3 className="text-md font-semibold text-gray-300 mb-2">Options:</h3>
                  <div className="space-y-2">
                    {q.options?.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                          className="border p-1 flex-grow rounded-md text-gray-300"
                          placeholder={`Option ${oIndex + 1}`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(qIndex, oIndex)}
                          className="text-red-400 hover:text-red-600 text-sm"
                          title="Remove Option"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addOption(qIndex)}
                    className="mt-3 bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                  >
                    + Add Option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex space-x-2 mb-6">
          <button
            type="button"
            onClick={() => addQuestion('text')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Add Short Text Question
          </button>
          <button
            type="button"
            onClick={() => addQuestion('textarea')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Add Paragraph Question
          </button>
          <button
            type="button"
            onClick={() => addQuestion('radio')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Add Radio Question
          </button>
        </div>

        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-3 rounded-md text-lg font-bold hover:bg-green-600"
          disabled={loading}
        >
          {loading ? 'Creating Form...' : 'Create Form'}
        </button>
      </form>
    </div>
  );
}