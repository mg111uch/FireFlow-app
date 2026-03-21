'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { UserDetails, Post as UserPost, Community as JoinedCommunity, Form } from '../../../lib/types';
import PostCard from '../../../components/PostCard';
import ProfileHeader from '../ProfileHeader';
import Tabs from '../../../components/ui/Tabs';
import CommunitiesList from '../CommunitiesList';
import FormCard from '../../../components/FormCard';
import { API_URL } from '@/lib/config';

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const { userId } = use(params);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<JoinedCommunity[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'communities' | 'forms'>('posts');
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    let decodedUser: any = null;
    
    if (token) {
      try {
        decodedUser = jwtDecode(token);
        setCurrentUserId(decodedUser.id);  
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    }
    
    fetchUserProfileData(Number(userId), token);
  }, [router, userId]);

  const fetchUserProfileData = async (profileUserId: number, token: string | null) => {
    setLoading(true);
    setError(null); 
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [userRes, postsRes, communitiesRes, formsRes] = await Promise.all([ //
        axios.get(`${API_URL}/api/users/${profileUserId}`, { headers }),
        axios.get(`${API_URL}/api/users/${profileUserId}/posts`, { headers }),
        axios.get(`${API_URL}/api/users/${profileUserId}/communities`, { headers }),
        axios.get(`${API_URL}/api/users/${profileUserId}/forms`, { headers })
      ]);
      setUser(userRes.data);
      setUserPosts(postsRes.data);
      setJoinedCommunities(communitiesRes.data);
      setForms(formsRes.data);
      setIsFollowing(userRes.data.isFollowing || false);
      setFollowerCount(userRes.data.followerCount || 0);
      setFollowingCount(userRes.data.followingCount || 0);
    } catch (err: any) {
      console.error('Error fetching user profile page data:', err);      
      setError(err.response?.data?.error || 'Failed to load profile data.');             
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      router.push('/login'); // Should not happen if authenticated, but good safeguard
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      if (isFollowing) {
        await axios.post(`${API_URL}/api/users/${userId}/unfollow`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
      } else {
        await axios.post(`${API_URL}/api/users/${userId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err: any) {
      console.error('Error toggling follow status:', err);
      setError(err.response?.data?.error || 'Failed to update follow status.');
    }
  };

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
    <div className="container mx-auto pr-1 pl-1">

      <ProfileHeader
        user={user}
        followerCount={followerCount}
        followingCount={followingCount}
        currentUserId={currentUserId}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
      />

      {/* Tabs for Posts and Communities */}
      <Tabs
        tabs={[
          { label: 'User Posts', value: 'posts' },
          { label: 'Communities', value: 'communities' },
          { label: 'Forms', value: 'forms' }
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value as 'posts' | 'communities' | 'forms')}
      />

      {/* Conditional Rendering based on activeTab */}
      {activeTab === 'posts' && (
      <div className="p-1 ">
        {userPosts.length === 0 ? (
          <p>User hasn't made any posts yet.</p>
        ) : (
          <ul>
            {userPosts.map((post) => (
              <PostCard key={post.id} post={post} />              
            ))}
          </ul>
        )}
      </div>
      )}

      {activeTab === 'communities' && (
        <CommunitiesList
          joinedCommunities={joinedCommunities}
          currentUserId={currentUserId || 0}
          emptyMessage="User hasn't joined any communities yet."
        />
      )}

      {activeTab === 'forms' && (
        <div className="p-1">
          {forms.length === 0 ? (
            <h1 className="text-center text-lg font-bold mb-2">
              User hasn't created any forms yet.</h1>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <FormCard 
                  key={form.id} 
                  form={form} 
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}