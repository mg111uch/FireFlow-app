// y
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

import { UserDetails, Post, Community} from '../../lib/types';
import PostCard from '../../components/PostCard';

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

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, isAuthenticated, loading: authLoading, token, logout } = useAuth();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);  
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'communities'>('posts');
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [showcommunityform, setShowCommunityForm] = useState(false);

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
    }
  }, [router]);

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

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    // Get token from global AuthContext
    if (!token) {
      setError('You must be logged in to create a community.');
      return;
    }
    try {
      const res = await axios.post(`${APP_URL}/api/communities`,
        { name, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommunities((prevCommunities: any) => [...prevCommunities, res.data]);
      setName('');
      setDescription('');
    } catch (err) {
      alert('Failed to create community. The name may already be taken.');
      console.error(err);
    }
  };

  const handleJoinCommunity = async (communityId: number) => {
    if (!token) { 
      setError('You must be logged in to join a community.'); 
      return; 
    };
    
    try {
      const res = await axios.post(`${APP_URL}/api/communities/${communityId}/join`,
        {}, // No body needed for this endpoint
        { headers: { Authorization: `Bearer ${token}` } }
      );
    if (res.data.joined) {
        const communityToJoin = communities.find(c => c.id === communityId);
        if (communityToJoin) {
            setJoinedCommunities(prev => [...prev, communityToJoin]);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'An error occurred while trying to join.');
    }
  };

  const handleUnJoinCommunity = async (communityId: number) => {
    if (!token) { setError('You must be logged in to unjoin a community.'); return; }

    try {
      const res = await axios.post(`${APP_URL}/api/communities/${communityId}/unjoin`,
        {}, // No body needed for this endpoint
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.unjoined) {
        setJoinedCommunities(prev => prev.filter(c => c.id !== communityId));
      } else {
        alert(res.data.message || 'Could not unjoin community.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'An error occurred while trying to unjoin.');
    }
  };

  const handleDeleteCommunity = async (communityId: number, communityName: string) => {
    if (!user) {
      alert('You must be logged in to delete a community.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the community "${communityName}"? This action cannot be undone and all posts within it will be deleted.`)) {
      if (!token) {
        setError('You must be logged in to delete a community.');
        return;
      }
      try {
        await axios.delete(`${APP_URL}/api/communities/${communityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Community deleted successfully!');
        setJoinedCommunities(prevCommunities =>
          prevCommunities.filter(community => community.id !== communityId)
        );
      } catch (err: any) {
        console.error('Error deleting community:', err);
        alert(err.response?.data?.error || 'Failed to delete community.');
      }
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
          <div className="flex justify-between">
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
          <div className="flex space-x-4 text-gray-200">
            <p>
              <span className="font-semibold">{followerCount}</span> Followers
            </p>
            <p>
              <span className="font-semibold">{followingCount}</span> Following
            </p>
          </div>

        </div>

      {/* Tabs for Posts and Communities */}
      <div className="flex border-b border-gray-300 mb-3">
        <button
          className={`w-1/2 py-2 px-4 text-lg font-semibold ${
            activeTab === 'posts' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('posts')}
        >
          My Posts
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
          <h1 className="text-center text-lg font-bold mb-2">
            You haven't made any posts yet.</h1>
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
        {!showcommunityform && <button
            onClick={() => {setShowCommunityForm(true)}}
            className="w-half bg-blue-700 text-white text-sm px-3 py-1 rounded-md mb-2"
          >
            Create a community
          </button>
        }

        {showcommunityform ? (
          <form onSubmit={handleCreateCommunity} className="mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Community name"
              className="shadow appearance-none border rounded w-full mb-4 py-2 px-3 text-gray-300 leading-tight"
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Community description"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-300 leading-tight h-32 resize-none"
            />
            <div className="flex space-x-4 justify-center mt-2">
              <button type="submit" 
              className="bg-blue-500 text-white p-2 mt-2 rounded-md">
                Create Community</button>
              <button type="submit" 
              onClick={() => {setShowCommunityForm(false)}}
              className="bg-gray-500 text-white p-2 mt-2 rounded-md">
                Cancel</button>
            </div>
          </form>
        ) : ( communities.length > 0 ? (
          <ul>
            {communities.map((community) => (
              <li key={community.id} className="border-b border-gray-700 py-2 last:border-b-0 ">
                <div className="flex justify-between ">
                  <Link href={`/communities/${community.id}`}>
                    <h3 className="text-lg font-semibold text-blue-500">{community.name}</h3>
                  </Link>
                  {user?.id === community.creator_id ? (
                  <button
                    className="bg-gray-500 text-white p-1 rounded-md"
                    disabled={true}
                  > Admin </button>   
                  ) : joinedCommunities.some(joincomm => joincomm.id == community.id) ? (
                  <button
                    onClick={() => handleUnJoinCommunity(community.id)}
                    className="bg-green-700 text-white p-1 rounded-md"
                  > Joined </button>  
                  ) : (
                    <button
                      onClick={() => handleJoinCommunity(community.id)}
                      className="bg-blue-500 text-white p-1 rounded-md"
                    > Join </button> 
                  )} 
                </div>
                <p className="text-gray-300">{community.description}</p>
                {user.id === community.creator_id && (
                <div className="flex space-x-4 justify-center mt-2">
                  <Link href={`/edit-community/${community.id}`}> 
                    <button className="border border-blue-500 text-white text-sm px-3 py-1 rounded-md ">
                      Edit Details
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDeleteCommunity(community.id, community.name)}
                    className="border border-red-700 text-white text-sm px-3 py-1 rounded-md"
                  >
                    Delete
                  </button>
                </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <h1 className="text-center text-lg font-bold mb-2">
            You haven't joined any communities yet.</h1>
        ))
        }
      </div>
      )}
    </div>
  );
}