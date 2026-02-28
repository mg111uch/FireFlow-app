// y
'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_URL

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!username || !email || !password) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${APP_URL}/api/register`, { username, email, password });
      if(res.data.message == 'User registered successfully!'){
        alert('Registration successful! ');
        const loginres = await axios.post(`${APP_URL}/api/login`, { username, password });
        localStorage.setItem('token', loginres.data.token);
        router.push('/profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center mx-auto p-6">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-blue-100">
        <h1 className="flex justify-center text-2xl font-bold mb-4">Create an Account</h1>
        <form onSubmit={handleRegister} className="mb-4 ">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="mt-1 mb-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-300"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="mt-1 mb-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-300"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-1 mb-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-300"
            required
          />
          <button
            type="submit"
            className="w-full flex justify-center mt-6 py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
          
          {error && (
            <p className="mt-4 text-red-600 text-sm text-center bg-red-100 p-2 rounded-md border border-red-200">
              {error}
            </p>
          )}
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400 hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}