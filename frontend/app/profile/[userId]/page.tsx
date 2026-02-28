// y
'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Link from 'next/link';

import { UserDetails, Post as UserPost, Community as JoinedCommunity } from '../../../lib/types';
import PostCard from '../../../components/PostCard';

const APP_URL = process.env.NEXT_PUBLIC_URL;

// Utility function to format the date 
const formatMemberSince = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const { userId } = use(params);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<JoinedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'communities'>('posts');
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null); // To store the ID of the logged-in user

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const decodedUser: any = jwtDecode(token);
      setUser(decodedUser);    
      setCurrentUserId(decodedUser.id);  
      fetchUserProfileData(Number(userId), token);      
    } catch (err) {
      console.error('Error decoding token:', err);
      router.push('/login');
    }
  }, [router, userId]);

  const fetchUserProfileData = async (profileUserId: number, token: string) => {
    setLoading(true);
    setError(null); 
    try {
      const [userRes, postsRes, communitiesRes] = await Promise.all([ //
        axios.get(`${APP_URL}/api/users/${profileUserId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${APP_URL}/api/users/${profileUserId}/posts`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${APP_URL}/api/users/${profileUserId}/communities`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUser(userRes.data);
      setUserPosts(postsRes.data);
      setJoinedCommunities(communitiesRes.data);
      setIsFollowing(userRes.data.isFollowing);
      setFollowerCount(userRes.data.followerCount);
      setFollowingCount(userRes.data.followingCount);
    } catch (err: any) {
      console.error('Error fetching user profile page data:', err);      
      setError(err.response?.data?.error || 'Failed to load profile data.');             
      if (err.response?.status === 401 || err.response?.status === 403) {
        router.push('/login');
      }
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
        await axios.post(`${APP_URL}/api/users/${userId}/unfollow`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
      } else {
        await axios.post(`${APP_URL}/api/users/${userId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err: any) {
      console.error('Error toggling follow status:', err);
      setError(err.response?.data?.error || 'Failed to update follow status.');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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

        <div className="bg-gray-600 space-y-2 rounded-lg shadow-md p-3 mb-3">
            <div className="flex space-x-1">
                <div className="relative inline-flex items-center justify-center w-10 h-10 overflow-hidden bg-gray-300 rounded-full">
                {user.profile_img_url ? (
                    <img src={`${APP_URL}/api-uploads`+user.profile_img_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                        <span className="font-medium text-gray-600">
                        {getInitials(user.username)}
                        </span>
                )}
                </div>          
                <p className="text-2xl text-gray-300 font-semibold ml-2">{user.username}</p>
            </div>       
          <div className="flex space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <p className="text-gray-200 "> {user.email}</p>
          </div>

          <div className="flex space-x-1">
            <p className="text-gray-300 font-semibold">Member Since :</p> 
            <p className="text-gray-200 ">{formatMemberSince(user.created_at)}</p>
          </div>

          {/* New: Display follower and following counts */}
          <div className="w-full flex justify-between items-center space-x-2 text-gray-200">
            <p>
              <span className="font-semibold">{followerCount}</span> Followers
            </p>
            <p>
              <span className="font-semibold">{followingCount}</span> Following
            </p>
            {currentUserId !== user.id && ( // Only show Message button if not viewing own profile
              <button
                onClick={() => router.push(`/chats/${user.id}`)} // Modified line
                className={`border border-gray-500 text-gray-300 bg-gray-700 text-sm px-3 py-1 rounded-md`}
              >
                Message
              </button>
            )}
          </div>

          {/* New: Conditional rendering for Follow/Unfollow button [cite: 60] */}
          {currentUserId !== user.id && ( // Only show button if not viewing own profile
            <button
              onClick={handleFollowToggle}
              className={`w-full border ${isFollowing ? 'border-gray-500 text-gray-300 bg-gray-700' : 'border-purple-700 text-white'} text-sm px-3 py-1 rounded-md`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

      {/* Tabs for Posts and Communities */}
      <div className="flex border-b border-gray-300 mb-3">
        <button
          className={`w-1/2 py-2 px-4 text-lg font-semibold ${
            activeTab === 'posts' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('posts')}
        >
          User Posts
        </button>
        <button
          className={`w-1/2 py-2 px-4 text-lg font-semibold ${
            activeTab === 'communities' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('communities')}
        >
          Communities 
        </button>
      </div>

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
      <div className="bg-gray-800 rounded-lg shadow-md p-3">
        <h2 className="text-lg font-semibold mb-2">Joined Communities</h2>
        {joinedCommunities.length === 0 ? (
          <p>User hasn't joined any communities yet.</p>
        ) : (
          <ul>
            {joinedCommunities.map((community) => (
              <li key={community.id} className="border-b border-gray-700 py-2 last:border-b-0">
                <Link href={`/communities/${community.id}`}>
                  <h3 className="text-lg font-semibold text-blue-500">{community.name}</h3>
                </Link>
                <p className="text-gray-300">{community.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}