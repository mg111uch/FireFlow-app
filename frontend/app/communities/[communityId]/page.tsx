// y
'use client';

import { useState, useEffect, use } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

import { Post, Community } from '../../../lib/types';
import PostCard from '../../../components/PostCard';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function CommunityPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = use(params);
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCommunityData(communityId, token);    
  }, [communityId, router]);

  const fetchCommunityData = async (id: string, token: string) => {
    setLoading(true);
    try {
      const [communityRes, postsRes] = await Promise.all([
        axios.get(`${APP_URL}/api/communities/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${APP_URL}/api/communities/${id}/posts`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCommunity(communityRes.data);
      setPosts(postsRes.data);
    } catch (err: any) {
      console.error('Error fetching community data:', err);
      setError(err.response?.data?.error || 'Failed to load community data.');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading community...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  if (!community) {
    return <div className="container mx-auto p-4 text-center">Community not found.</div>;
  }

  return (
    <div className="container mx-auto p-2">
      {/* <button onClick={() => router.back()} className="bg-gray-600 text-white mb-4 px-4 py-2 rounded-md">
        Go Back
      </button> */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
        <p className="text-gray-300 mb-2">{community.description}</p>
        <p className="text-sm text-gray-500 mt-1">• Created by {community.creator_username}</p>
        <p className="text-gray-500 mb-6">{community.member_count || 0} Members</p>
      </div>

      {/* Create Post Button for this community */}
      <button
        onClick={() => router.push(`/create-post?communityId=${community.id}&communityName=${community.name}`)}
        className="w-full bg-green-500 text-gray-800 mb-4 px-4 py-2 rounded-md "
      >
        + Create Post in {community.name}
      </button>

      <h2 className="text-2xl font-semibold mb-4">Posts in {community.name}</h2>
      
      {posts.length === 0 ? (
        <p>No posts in this community yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}