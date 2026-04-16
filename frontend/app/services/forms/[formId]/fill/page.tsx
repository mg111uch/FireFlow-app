'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Form, FormQuestion } from '../../../../../lib/types';
import { jwtDecode } from 'jwt-decode';
import { API_URL } from '@/lib/config';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/context/AuthContext';

interface Answer {
  questionId: number;
  answerText: string;
}

export default function FillFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const { formId } = use(params);
  const returnUrl = searchParams.get('returnUrl') || '/services';

  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageerror, setPageError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const { openPayment, isLoading, GatewayModal, FlowPayModal } = usePayment();

  // Show success toast if redirected back after payment + form submission
  useEffect(() => {
    if (searchParams.get('formSubmitted') === '1') {
      setToast({ type: 'success', message: 'Form submitted and payment verified!' });
      // Let the destination page (SubservicePage) handle navigation after toast
    }
  }, [searchParams]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    try {
      if (token) setCurrentUser(jwtDecode(token));
    } catch {
      localStorage.removeItem('token');
    }

    const fetchForm = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/forms/${formId}`);
        setForm(res.data);
        setPaymentAmount(Number(res.data.form_price) || 0);
        setAnswers(
          res.data.questions.map((q: FormQuestion) => ({
            questionId: q.id!,
            answerText: '',
          }))
        );
      } catch (err: any) {
        setPageError(err.response?.data?.error || 'Failed to load form.');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === questionId);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], answerText: value };
        return next;
      }
      return [...prev, { questionId, answerText: value }];
    });
  };

  const validateForm = (): boolean => {
    if (!form?.questions) return false;
    const allAnswered = form.questions.every((q) => {
      const a = answers.find((a) => a.questionId === q.id);
      return a && a.answerText.trim() !== '';
    });
    if (!allAnswered) {
      setToast({ type: 'error', message: 'Please answer all questions before submitting.' });
      return false;
    }
    return true;
  };

  /**
   * Direct submit — used by admin button and by FlowPay onSuccess callback (via usePayment).
   */
  const submitForm = async () => {
    try {
      await axios.post(
        `${API_URL}/api/forms/${formId}/submit`,
        { answers, form_price: form?.form_price || 0 },
        {
          headers: currentUser ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {},
        }
      );
      setToast({ type: 'success', message: 'Form submitted successfully!' });
      router.push(returnUrl);
    } catch (err: any) {
      setPageError(err.response?.data?.error || 'Failed to submit form.');
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (paymentAmount > 0) {
      openPayment({
        amount: paymentAmount,
        description: `${form?.title || 'Form'} submission`,
        /**
         * pendingSubmission is stored in sessionStorage before the Razorpay
         * redirect. CallbackInner will read it back and POST after verification.
         * For FlowPay (inline), usePayment calls the URL directly in onSuccess.
         */
         pendingSubmission: {
           url: `/api/forms/${formId}/submit`,
           body: { answers, form_price: form?.form_price || 0 },
           token: localStorage.getItem('token'),
           returnUrl,
         },
        onSuccess: (paymentId) => {
          setToast({ type: 'success', message: `Payment successful! ID: ${paymentId}` });
          // submitForm is called by usePayment for FlowPay; for Razorpay it's
          // done in CallbackInner, and the redirect handles navigation.
        },
        onFailure: (err) => {
          setToast({ type: 'error', message: err });
        },
      });
    } else {
      submitForm();
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) await submitForm();
  };

  if (loading) return <div className="container mx-auto p-4 text-center">Loading form...</div>;
  if (pageerror) return <div className="container mx-auto p-4 text-red-500 text-center">{pageerror}</div>;
  if (!form) return <div className="container mx-auto p-4 text-center">Form not found.</div>;

  return (
    <div className="container mx-auto">
      {/* Modals rendered here */}
      {GatewayModal}
      {FlowPayModal}

      <h1 className="text-2xl font-bold mb-2 pl-2 pr-2">{form.title}</h1>
      <p className="text-gray-400 mb-2 pl-2">{form.description}</p>
      <p className="text-sm text-gray-500 mb-2 pl-2">Created by: {form.creator_username}</p>
      <p className="text-xl text-gray-300 mb-2 pl-2">
        Form submission price: ₹ {form.form_price || 0}
      </p>

      <form className="bg-gray-800 pt-3">
        {form.questions?.map((q) => (
          <div key={q.id} className="bg-gray-800 pr-3 pl-3 pb-3">
            <label className="block text-gray-200 font-semibold">{q.question_text}</label>
            {q.question_type === 'text' && (
              <input
                type="text"
                value={answers.find((a) => a.questionId === q.id)?.answerText || ''}
                onChange={(e) => handleAnswerChange(q.id!, e.target.value)}
                className="border p-2 w-full rounded-md text-gray-300"
                required
              />
            )}
            {q.question_type === 'textarea' && (
              <textarea
                value={answers.find((a) => a.questionId === q.id)?.answerText || ''}
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
                      checked={
                        answers.find((a) => a.questionId === q.id)?.answerText === option.option_text
                      }
                      onChange={(e) => handleAnswerChange(q.id!, e.target.value)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span>{option.option_text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handlePaymentSubmit}
            disabled={isLoading}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Opening payment...' : `Pay ₹${paymentAmount} & Submit`}
          </button>
          <p className="text-xs text-gray-500">Secure payment · UPI supported</p>
        </div>

        {isAdmin && (
          <div className="p-3">
            <button
              type="button"
              onClick={handleAdminSubmit}
              className="bg-blue-500 text-white px-6 py-2 rounded-md text-lg font-bold"
            >
              Submit (admin)
            </button>
          </div>
        )}
      </form>

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}