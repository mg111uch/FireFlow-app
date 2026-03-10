'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await axios.post(`${APP_URL}/api/forgot-password`, { email });
            setMessage(res.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container flex items-center justify-center mx-auto p-6">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-blue-100">
                <h1 className="flex justify-center text-2xl font-bold mb-4">Reset Password</h1>
                <p className="text-center text-gray-400 mb-6">Enter your email and we will send you a link to reset your password (check the backend console for the link).</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="mt-1 mb-4 block w-full px-4 py-2 border border-gray-300 rounded-md"
                        required
                    />
                    <button type="submit" className="w-full py-2 px-4 rounded-md text-lg font-semibold text-white bg-blue-600" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    {message && <p className="mt-4 text-green-400 text-center">{message}</p>}
                    {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
                </form>
                <div className="mt-6 text-center">
                    <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}