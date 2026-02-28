// y
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username || !password) {
      setError('Please enter your username/email and password.');
      setLoading(false);
      return;
    }
    try {
      // Call the login function from AuthContext
      await login({ username, password });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center mx-auto p-6">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-blue-100">
        <h1 className="flex justify-center text-2xl font-bold mb-4">Welcome Back!</h1>
        <form onSubmit={handleLogin} className="mb-4">
          <input
            type="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your User Name"
            className="mt-1 mb-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm transition duration-150 ease-in-out"    
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your Password"
            className="mt-1 mb-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm transition duration-150 ease-in-out"
          />
          <button type="submit" 
          className="w-full flex justify-center mt-6 py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-blue-600 "
          disabled={loading}      
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
          
          {error && (
              <p className="text-red-600 text-sm text-center bg-red-100 p-2 rounded-md border border-red-200">
                {error}
              </p>
            )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            <Link href="/forgot-password" className="font-medium text-blue-500 hover:text-blue-400 hover:underline">
                Forgot Password?
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>      
    </div>
  );
}