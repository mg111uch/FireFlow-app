'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { UserDetails, Post, Community, Form } from '../../lib/types';
import PostCard from '../../components/PostCard';
import ProfileHeader from './ProfileHeader';
import Tabs from '../../components/ui/Tabs';
import FormCard from '../../components/FormCard';
import CommunitiesList from './CommunitiesList';

const APP_URL = process.env.NEXT_PUBLIC_URL;

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, isAuthenticated, loading: authLoading, token, logout } = useAuth();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);  
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'communities' | 'forms'>('posts');
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  useEffect(() => {
    if (!authLoading) { // Wait for AuthContext to finish loading
      if (!isAuthenticated || !currentUser || !token) {
        // If not authenticated, AuthProvider should handle redirection.
        // This component just needs to ensure it doesn't try to fetch data without user info.
        return; 
      }
      // Set local user state from the global context
      setUser(currentUser);
      // Fetch data using the authenticated user's ID and token
      fetchUserProfileData(currentUser.id, token);
      fetchCommunities(currentUser.id, token);
      fetchForms(token);
    }
  }, [authLoading, isAuthenticated, currentUser, token]);

  const fetchUserProfileData = async (userId: number, token: string) => {
    setLoading(true);
    setError(null); 
    try {
      const [userRes, postsRes] = await Promise.all([ //
        axios.get(`${APP_URL}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${APP_URL}/api/users/${userId}/posts`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setUser(userRes.data);
      setUserPosts(postsRes.data);
      setFollowerCount(userRes.data.followerCount);
      setFollowingCount(userRes.data.followingCount);
    } catch (err: any) {
      console.error('Error fetching user profile page data:', err);      
      setError(err.response?.data?.error || 'Failed to load profile data.');             
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunities = async (userId: number, token: string) => {
    try {
      const [commRes, joinedcommRes] = await Promise.all([
        axios.get(`${APP_URL}/api/communities`),
        axios.get(`${APP_URL}/api/users/${userId}/communities`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      setCommunities(commRes.data);
      setJoinedCommunities(joinedcommRes.data);
    } catch (err) {
      setError('Failed to fetch communities.');
      console.error(err);
    }
  };

  const fetchForms = async (token: string) => {
    try {
      const res = await axios.get(`${APP_URL}/api/forms/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms(res.data);
    } catch (err: any) {
      console.error('Error fetching forms:', err);
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
    <div className="container mx-auto">

      <ProfileHeader
        user={user}
        followerCount={followerCount}
        followingCount={followingCount}
        currentUserId={currentUser?.id}
      />

      {/* Tabs for Posts, Communities, and Forms */}
      <Tabs
        tabs={[
          { label: 'Posts', value: 'posts' },
          { label: 'Communities', value: 'communities' },
          { label: 'Forms', value: 'forms' }
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value as 'posts' | 'communities' | 'forms')}
      />

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div>
          {userPosts.length === 0 ? (
            <h1 className="text-center text-lg font-bold mb-2">
              You haven't made any posts yet.</h1>
          ) : (
            <div className="grid grid-cols-1">
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} />              
              ))}
            </div>
          )}
        </div>
      )}

      {/* Communities Tab */}
      {activeTab === 'communities' && (
        <CommunitiesList
          communities={communities}
          joinedCommunities={joinedCommunities}
          currentUserId={user?.id || 0}
          token={token || undefined}
          onCommunityJoined={(community) => setJoinedCommunities(prev => [...prev, community])}
          onCommunityLeft={(communityId) => setJoinedCommunities(prev => prev.filter(c => c.id !== communityId))}
          onCommunityDeleted={(communityId) => setJoinedCommunities(prev => prev.filter(c => c.id !== communityId))}
          onCommunityCreated={(community) => setCommunities(prev => [...prev, community])}
          showAllCommunities={true}
          showCreateCommunity={true}
          emptyMessage="You haven't joined any communities yet."
        />
      )}

      {/* Forms Tab  */}
      {activeTab === 'forms' && (
        <div>
          {forms.length === 0 ? (
            <h1 className="text-center text-lg font-bold mb-2">
              You haven't created any forms yet.</h1>
          ) : (
            <div className="grid grid-cols-1">
              {forms.map((form) => (
                <FormCard 
                  key={form.id} 
                  form={form} 
                  isOwner={true}
                  onDeleted={(formId) => setForms(forms.filter(f => f.id !== formId))}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}