'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Form, FormQuestion } from '../../../../../lib/types';
import { jwtDecode } from 'jwt-decode';
import { GPayPaymentModal } from '@/components/PaymentModal';

const APP_URL = process.env.NEXT_PUBLIC_URL;

interface Answer {
  questionId: number;
  answerText: string; // For radio, this will be the selected option text
}

export default function FillFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formId } = use(params);
  const returnUrl = searchParams.get('returnUrl') || '/services';
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false); // For optional submitter_id

  useEffect(() => {
    const token = localStorage.getItem('token');
    try {
      if (token) {
        setCurrentUser(jwtDecode(token));
      }
    } catch (e) {
      console.warn("Could not decode token, user will submit anonymously if not re-logged in.");
      localStorage.removeItem('token');
    }

    const fetchForm = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${APP_URL}/api/forms/${formId}`);
        setForm(res.data);
        // Initialize answers state
        const initialAnswers = res.data.questions.map((q: FormQuestion) => ({
          questionId: q.id!,
          answerText: '',
        }));
        setAnswers(initialAnswers);
      } catch (err: any) {
        console.error('Error fetching form:', err);
        setError(err.response?.data?.error || 'Failed to load form.');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => {
      const existingAnswerIndex = prev.findIndex(a => a.questionId === questionId);
      if (existingAnswerIndex > -1) {
        const newAnswers = [...prev];
        newAnswers[existingAnswerIndex].answerText = value;
        return newAnswers;
      } else {
        return [...prev, { questionId, answerText: value }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Basic validation: ensure all required questions (currently all) have answers
    const allQuestionsAnswered = form?.questions?.every(q => {
      const answer = answers.find(a => a.questionId === q.id);
      return answer && answer.answerText.trim() !== '';
    });

    if (!allQuestionsAnswered) {
      setError('Please answer all questions before submitting.');
      setSubmitting(false);
      return;
    }

     // If form has a price > 0, show payment modal first
     if (form && (form.form_price || 0) > 0) {
       setShowPayment(true);
       setSubmitting(false);
       return;
     }

    // Otherwise, submit directly
    await submitForm();
  };

   const submitForm = async () => {
     try {
       await axios.post(`${APP_URL}/api/forms/${formId}/submit`, { 
         answers,
         form_price: form?.form_price || 0
       }, {
         headers: currentUser ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
       });
       alert('Form submitted successfully!');
       router.push(returnUrl);
     } catch (err: any) {
       console.error('Error submitting form:', err);
       setError(err.response?.data?.error || 'Failed to submit form.');
     } finally {
       setSubmitting(false);
     }
   };

  const handlePaymentSuccess = async (paymentDetails: any) => {
    setShowPayment(false);
    setSubmitting(true);
    try {
      // Submit form with payment details
      await axios.post(`${APP_URL}/api/forms/${formId}/submit`, { 
        answers,
        paymentDetails
      }, {
        headers: currentUser ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      alert('Payment successful! Form submitted.');
      router.push(returnUrl);
    } catch (err: any) {
      console.error('Error submitting form after payment:', err);
      setError(err.response?.data?.error || 'Payment succeeded but form submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentFailure = (error?: any) => {
    setError('Payment failed. Please try again.');
    setShowPayment(false);
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading form...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  if (!form) {
    return <div className="container mx-auto p-4 text-center">Form not found.</div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-2 pl-2 pr-2">{form.title}</h1>
      <p className="text-gray-400 mb-2 pl-2">{form.description}</p>
      <p className="text-sm text-gray-500 mb-4  pl-2">Created by: {form.creator_username}</p>
      <p className="text-sm text-gray-500 mb-4 pl-2">Form Price: ₹ {form.form_price || 0}</p>

       {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-gray-800 pt-3">
        {form.questions?.map((q) => (
          <div key={q.id} className="bg-gray-800 pr-3 pl-3 pb-3">
            <label className="block text-gray-200 font-semibold">{q.question_text}</label>
            {q.question_type === 'text' && (
              <input
                type="text"
                value={answers.find(a => a.questionId === q.id)?.answerText || ''}
                onChange={(e) => handleAnswerChange(q.id!, e.target.value)}
                className="border p-2 w-full rounded-md text-gray-300"
                required
              />
            )}
            {q.question_type === 'textarea' && (
              <textarea
                value={answers.find(a => a.questionId === q.id)?.answerText || ''}
                onChange={(e) => handleAnswerChange(q.id!, e.target.value)}
                className="border p-2 w-full rounded-md text-gray-300"
                rows={4}
                required
              />
            )}
            {q.question_type === 'radio' && q.options && (
              <div className="space-y-2">
                {q.options.map((option) => (
                  <label key={option.id} className="flex items-center space-x-2 text-gray-200">
                    <input
                      type="radio"
                      name={`question_${q.id}`}
                      value={option.option_text}
                      checked={answers.find(a => a.questionId === q.id)?.answerText === option.option_text}
                      onChange={(e) => handleAnswerChange(q.id!, e.target.value)}
                      className="form-radio h-4 w-4 text-blue-600"
                      required
                    />
                    <span>{option.option_text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="p-3">
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-md text-lg font-bold"
            disabled={submitting}
          >
             {submitting ? 'Submitting...' : ((form?.form_price || 0) > 0 ? `Pay ₹ ${form?.form_price} & Submit` : 'Submit')}
          </button>
        </div>
      </form>

      {/* Payment Modal */}
       <GPayPaymentModal
         isOpen={showPayment}
         onClose={() => setShowPayment(false)}
         amount={form?.form_price || 0}
         onPaymentSuccess={handlePaymentSuccess}
         onPaymentFailure={handlePaymentFailure}
       />
    </div>
  );
}