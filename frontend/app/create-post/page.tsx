'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { Community } from '../../lib/types';
import Tabs from '../../components/ui/Tabs';
import CreateMarketForm from './CreateMarketForm';
import CreateServicePage from './CreateServicePage';
import { API_URL } from '@/lib/config';

export default function CreatePostPage() {
  const [postType, setPostType] = useState<'community' | 'general'>('general');
  const [parentTab, setParentTab] = useState<'posts' | 'vote' | 'forms'>('posts');
  const [activeTab, setActiveTab] = useState<'general' | 'community' | 'vote'>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parent Tab change handler
  const handleParentTabChange = (value: string) => {
    setParentTab(value as 'posts' | 'vote' | 'forms');
    if (value === 'vote') {
      setActiveTab('vote');
    } else if (value === 'forms') {
      setActiveTab('general');
    } else {
      setActiveTab('general');
      setPostType('general');
    }
  };

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
      const res = await axios.get(`${API_URL}/api/communities`, {
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
    
    if (postType === 'general') {
      // General post: content + optional image (no title, no community)
      formData.append('post_type', 'general');
      formData.append('content', content);
    } else {
      // Community post: requires title + community
      formData.append('post_type', 'community');
      formData.append('title', title);
      formData.append('community_id', communityId);
      formData.append('content', content);
    }
    
    if (image) {
        formData.append('image', image);
    }
    
    try {
      await axios.post(`${API_URL}/api/posts`,
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
    <div className="container mx-auto"> 
        
      {/* Parent Tab Component - Posts, Vote, Forms */}
      <Tabs
        tabs={[
          { label: 'Posts', value: 'posts' },
          { label: 'Vote', value: 'vote' },
          { label: 'Forms', value: 'forms' }
        ]}
        activeTab={parentTab}
        onChange={handleParentTabChange}
      />
      
      {/* Content based on parent tab */}
      {parentTab === 'vote' ? (
        <CreateMarketForm />
      ) : parentTab === 'forms' ? (
        <CreateServicePage />
      ) : (
        <>
      {/* Child Tab Component - General, Community (only shown for Posts) */}
      <Tabs
        tabs={[
          { label: 'General', value: 'general' },
          { label: 'Community', value: 'community' },
        ]}
        activeTab={activeTab}
        onChange={(value) => {
          setActiveTab(value as 'general' | 'community');
          setPostType(value as 'general' | 'community');
        }}
      />
        <form onSubmit={handleCreatePost} className="mb-4 bg-gray-900 p-3">
          
          {/* Community selector - only for community posts */}
          {postType === 'community' && (
            <div className="mb-2">
              <label className="block text-gray-300 font-bold mb-2">Select Community :</label>

              <select
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                className="border p-2 mb-2 w-full rounded-md"
                required={postType === 'community'}
              >
                <option value="">Select a community</option>
                {communities.map((community) => (
                  <option key={community.id} value={community.id} className="text-black">
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title - only for community posts */}
          {postType === 'community' && (
            <div className="mb-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="border p-2 mb-2 w-full rounded-md"
                required={postType === 'community'}
              />
            </div>
          )}

          <div className="mb-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={postType === 'general' ? "What's on your mind?" : "Post content"}
              className="border p-2 w-full rounded-md"
              rows={5}
              required
            />
          </div>

          <div className="mb-2">
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
        </>
      )}
    </div>
  );
}