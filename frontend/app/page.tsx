'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostContext';
import axios from 'axios';

import type { Post, Market, Form } from '../lib/types';
import PostCard from '../components/PostCard';
import Tabs from '../components/ui/Tabs';
import MarketCard from '@/components/MarketCard';
import FormCard from '@/components/FormCard';
import { jwtDecode } from 'jwt-decode';

const APP_URL = process.env.NEXT_PUBLIC_URL

export default function Home() {
  const { currentUser, isAuthenticated, loading: authLoading, token, logout } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const { posts, loading, posterror, fetchPosts, updatePostInContext } = usePosts();
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newPostsNotification, setNewPostsNotification] = useState(false);
  const [showStats, setShowStats] = useState(false);  
  const [activeTab, setActiveTab] = useState<'trending' | 'following'>('trending');
  const [feedType, setFeedType] = useState<'posts' | 'vote' | 'forms'>('posts');
  
  // Market state
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketsError, setMarketsError] = useState<string | null>(null);

  // Forms state
  const [forms, setForms] = useState<Form[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    uniqueVisitorsThisMonth: 0,
  });

  // --- WebSocket Setup ---
  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        console.log('Connected to WebSocket server:', socket?.id);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      // Handle connection errors, especially authentication failures
      socket.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err.message);
        if (err.message === 'Authentication error: jwt expired') { 
          setError('Your session has expired. Please log in again.');
          logout();
        } else if (err.message === 'Authentication error: Invalid token') {
          setError('Your session has expired. Please log in again.');
          logout();
        } else {
          setError(`WebSocket connection failed: ${err.message}`);
        }
      });

      // Listen for new posts
      socket.on('newPost', (newPost: Post) => {
        console.log('New post received via WebSocket:', newPost);
        // setPosts((prevPosts) => [newPost, ...prevPosts]); // Add new post to the top
        setNewPostsNotification(true);
      });

      // Listen for vote updates
      // socket.on('voteUpdate', (data: { postId: number; upvotes: number; downvotes: number; user_vote_type: 1 | -1 | null }) => {
      //   setPosts((prevPosts) =>
      //     prevPosts.map((post) =>
      //       post.id === data.postId ? { ...post, upvotes: data.upvotes, downvotes: data.downvotes, user_vote_type: data.user_vote_type } : post
      //     )
      //   );
      // });

      // Listen for general stats updates (e.g., online users)
      socket.on('statsUpdate', (newStats: typeof stats) => {
        setStats(newStats);
      });

      // Clean up socket connection on component unmount
      return () => {
        socket.off('Websocket disconnect msg from HomePage');
      };
    }
  }, [socket]); // Depend on router, but not user directly to avoid re-connecting socket unnecessarily

  useEffect(() => {
    if (!authLoading && token) {
      fetchPosts(true);
      fetchStats(); 
    } else if (!authLoading && !token) {
      logout()
    }
  }, [authLoading, token, router]); 

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${APP_URL}/api/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchMarkets = async (token: string | null) => {
    setMarketsLoading(true);
    setMarketsError(null);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${APP_URL}/api/markets`, { headers });
      setMarkets(res.data);
    } catch (err: any) {
      console.error('Error fetching markets:', err);
      setMarketsError(err.response?.data?.error || 'Failed to load markets.');
    } finally {
      setMarketsLoading(false);
    }
  };

  // Fetch markets when Vote tab is selected
  useEffect(() => {
    if (feedType === 'vote' && markets.length === 0) {
      const token = localStorage.getItem('token');
      fetchMarkets(token);
    }
  }, [feedType]);

  // Fetch forms when Forms tab is selected
  useEffect(() => {
    if (feedType === 'forms' && forms.length === 0) {
      // Get current user ID
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          setCurrentUserId(decoded.id);
        } catch (e) {
          console.warn('Could not decode token');
        }
      }
      fetchForms();
    }
  }, [feedType]);

  const fetchForms = async () => {
    setFormsLoading(true);
    setFormsError(null);
    try {
      const res = await axios.get(`${APP_URL}/api/forms/all`);
      setForms(res.data);
    } catch (err: any) {
      console.error('Error fetching forms:', err);
      setFormsError(err.response?.data?.error || 'Failed to load forms.');
    } finally {
      setFormsLoading(false);
    }
  };

  // const handleLoadNewPosts = () => { 
  //   setNewPostsNotification(false); 
  //   setPosts([]);
  //   setPage(1); 
  //   if (token) {
  //     fetchPosts(true); 
  //   }
  // };

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">Homepage error: {error}</div>;
  }  
  if (posterror) {
    return <div className="container mx-auto p-4 text-red-500 text-center">Post error:{posterror}</div>;
  }

  return (
    <div className="container mx-auto">
      {currentUser && 
      <div className="flex justify-between items-center mb-2 ml-2 mr-2">
        <h2 className="text-4xm font-semibold text-gray-100">
          Hii, {currentUser.username} !!
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/filter')}
            className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-xm font-semibold"
          >
            Filter feed
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-xm font-semibold"
          >
            {showStats ? 'Hide Stats' : 'Stats'}
          </button>
        </div>
      </div>}

      {/* Stats card */} 
      {showStats && (
      <div className="bg-gray-800 rounded-lg shadow-md p-3 mb-2 ml-2 mr-2 text-white">
        <h2 className="text-lg font-semibold mb-2">Community User Stats</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">{stats.totalUsers}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
          <div>
            <p className="text-xl font-bold">{stats.onlineUsers}</p>
            <p className="text-sm text-gray-400">Online</p>
          </div>
          <div>
            <p className="text-xl font-bold">{stats.uniqueVisitorsThisMonth}</p>
            <p className="text-sm text-gray-400">Month Unique</p>
          </div>
        </div>
      </div>
      )}

      {/* Create new button */}  
      <div className="ml-2 mr-2">
        <button
          onClick={() => router.push('/create-post')}
          className="w-full items-center justify-center bg-gray-600 rounded-full  shadow-md"
        >
          <h2 className="text-center text-3xm font-semibold mb-2 text-gray-200 mt-2">
            + Create  New
          </h2>         
        </button> 
      </div>

      {/* New: Notification for new posts */}
      {newPostsNotification && (
        <div className="text-center mb-4">
          <button
            // onClick={handleLoadNewPosts}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg"
          >
            New Posts Available! Click to Load.
          </button>
        </div>
      )}

      {/* Parent Tab Component - Posts, Vote, Forms */}
      <div className="flex items-center justify-between mt-1">        
        <div className="flex-1">
          <Tabs
            tabs={[
              { label: 'Posts', value: 'posts' },
              { label: 'Vote', value: 'vote' },
              { label: 'Forms', value: 'forms' },
            ]}
            activeTab={feedType}
            onChange={(value) => setFeedType(value as 'posts' | 'vote' | 'forms')}
          />
        </div>
      </div>

      {/* Child Tab Component - Trending, Following (only shown for Posts) */}
      {feedType === 'posts' && (
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Tabs
            tabs={[
              { label: 'Trending', value: 'trending' },
              { label: 'Following', value: 'following' },
            ]}
            activeTab={activeTab}
            onChange={(value) => setActiveTab(value as 'trending' | 'following')}
          />
        </div>
      </div>
      )}

      {feedType === 'vote' ? (
        <div className="container mx-auto">
          {marketsLoading ? (
            <div className="text-center p-4">Loading markets...</div>
          ) : marketsError ? (
            <div className="text-center text-red-500 p-4">{marketsError}</div>
          ) : markets.length === 0 ? (
            <p className="text-center text-gray-500 mt-4">No prediction markets available yet. Be the first to create one!</p>
          ) : (
            <div className="grid grid-cols-1">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </div>
      ) : feedType === 'forms' ? (
        <div className="container mx-auto">
          {formsLoading ? (
            <div className="text-center p-4">Loading forms...</div>
          ) : formsError ? (
            <div className="text-center text-red-500 p-4">{formsError}</div>
          ) : forms.length === 0 ? (
            <p className="text-center text-gray-500 mt-4">No forms available yet.</p>
          ) : (
            <div className="grid grid-cols-1">
              {forms.map((form) => (
                <FormCard 
                  key={form.id} 
                  form={form} 
                  isOwner={currentUserId === form.creator_id}
                  onDeleted={() => fetchForms()}
                />
              ))}
            </div>
          )}
        </div>
      ) : posts.length === 0 && !loading ? (
          <p className="text-center text-gray-500">No posts available. Be the first to post!</p>
        ) : (
          <div className="grid grid-cols-1">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post}
              onPostUpdate={updatePostInContext}
              currentUserId={currentUser?.id}
              onDeleteSuccess={() => fetchPosts(true)}
            />
          ))}          
          </div>
        )
      }
      {loading && page == 1 && <div className="text-center p-4">Loading posts...</div>}
      {loading && page != 1 && <div className="text-center p-4">Loading more posts...</div>}
      {!hasMore && posts.length > 0 && <div className="text-center p-4 text-gray-500">You've reached the end!</div>}
    </div>
  );
}
