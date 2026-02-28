// y
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { Community } from '../../lib/types';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const preselectedCommunity = searchParams.get('communityId');
    if (preselectedCommunity) {
      setCommunityId(preselectedCommunity);
    }
    
    fetchCommunities(token);
  }, [router, searchParams]);

  const fetchCommunities = async (token: string) => {
    try {
      const res = await axios.get(`${APP_URL}/api/communities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCommunities(res.data);
    } catch (err) {
      console.error('Error fetching communities:', err);
      setError('Could not load your communities.');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('community_ids', communityId);
    if (image) {
        formData.append('image', image);
    }
    
    try {
      await axios.post(`${APP_URL}/api/posts`,
        formData,
        { headers: { 
          Authorization: `Bearer ${token}` ,
          'Content-Type': 'multipart/form-data',
        } }
      );
      router.back(); 
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-2">

      <button onClick={() => router.back()} className="bg-gray-600 text-white mb-4 px-4 py-2 rounded-md">
        Go Back
      </button>

      <h1 className="text-2xl font-bold mb-4">Create New Post</h1>
      
      <form onSubmit={handleCreatePost} className="mb-4 bg-gray-800 p-4 rounded-lg">
        
        <div className="mb-4">
          <label className="block text-gray-300 font-bold mb-2">Select Community :</label>

          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="border p-2 mb-2 w-full rounded-md"
            required
          >
            <option value="">Select a community</option>
            {communities.map((community) => (
              <option key={community.id} value={community.id} className="text-black">
                {community.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="border p-2 mb-2 w-full rounded-md"
            required
          />
        </div>

        <div className="mb-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Post content"
            className="border p-2 mb-2 w-full rounded-md"
            rows={5}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 font-bold mb-2">Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
            className="border p-2 mb-2 w-full rounded-md"
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">
          Create Post
        </button>
      </form>
    </div>
  );
}