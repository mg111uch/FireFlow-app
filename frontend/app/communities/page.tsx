'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Community, UserDetails } from '../../lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

const APP_URL = process.env.NEXT_PUBLIC_URL

export default function Communities() {
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const decodedUser: any = jwtDecode(token);
      setUser(decodedUser);
      setLoading(false)
      
    } catch (err) {
      console.error('Error decoding token:', err);
      router.push('/login');
    }
    
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading profile...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4 text-center">Profile not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">      
      <h1 className="text-xl font-bold mb-2">Communities List</h1>
    </div>
  );
}