'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/lib/config';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!token) {
            setError('Invalid or missing reset token.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await axios.post(`${API_URL}/api/reset-password`, { token, password });
            setMessage(res.data.message + ' Redirecting to login...');
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="container mx-auto p-4 text-center text-red-500">
                No password reset token found. Please request a new link.
            </div>
        );
    }

    return (
        <div className="container flex items-center justify-center mx-auto p-6">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-blue-100">
                <h1 className="flex justify-center text-2xl font-bold mb-4">Set New Password</h1>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="mt-1 mb-2 block w-full px-4 py-2 border rounded-md"
                        required
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="mt-1 mb-4 block w-full px-4 py-2 border rounded-md"
                        required
                    />
                    <button type="submit" className="w-full py-2 px-4 rounded-md text-lg font-semibold text-white bg-blue-600" disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                    {message && <p className="mt-4 text-green-400 text-center">{message}</p>}
                    {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
                </form>
            </div>
        </div>
    );
}