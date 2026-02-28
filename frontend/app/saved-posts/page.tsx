// y
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Post } from '../../lib/types';
import PostCard from '../../components/PostCard';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function SavedPostsPage() {
  const router = useRouter();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchSavedPosts = async (token: string) => {
      try {
        const res = await axios.get(`${APP_URL}/api/users/saved-posts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSavedPosts(res.data);
      } catch (err: any) {
        console.error('Error fetching saved posts:', err);
        setError(err.response?.data?.error || 'Failed to load saved posts.');
        if (err.response?.status === 401 || err.response?.status === 403) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts(token);
  }, [router]);
  
  // This function allows the PostCard to update the list when a post is unsaved
  const handlePostUpdate = (updatedPost: Post) => {
    // If a post is unsaved, its `is_saved` flag will be false.
    // We remove it from the list immediately for a better UX.
    if (!updatedPost.is_saved) {
      setSavedPosts(prevPosts => prevPosts.filter(p => p.id !== updatedPost.id));
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading saved posts...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-2">
        <button onClick={() => router.back()} className="bg-gray-600 text-white mb-4 px-4 py-2 rounded-md hover:bg-gray-300">
            Go Back
        </button>

        <h1 className="text-2xl font-bold mb-4">Saved Posts</h1>

        {savedPosts.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
                <p>You haven't saved any posts yet.</p>
                <p className="mt-2">Click the bookmark icon on a post to save it for later.</p>
                <Link href="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-md">
                    Find Posts
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-6">
                {savedPosts.map((post) => (
                    <PostCard key={post.id} post={post} onPostUpdate={handlePostUpdate} />
                ))}
            </div>
        )}
    </div>
  );
}