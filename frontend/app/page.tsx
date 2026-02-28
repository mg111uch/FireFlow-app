// y
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostContext';
import axios from 'axios';

import type { Post } from '../lib/types';
import PostCard from '../components/PostCard';

const APP_URL = process.env.NEXT_PUBLIC_URL

export default function Home() {
  const { currentUser, isAuthenticated, loading: authLoading, token, logout } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const { posts, loading, posterror, fetchPosts, updatePostInContext } = usePosts();
  const [dropdown, setDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newPostsNotification, setNewPostsNotification] = useState(false);  

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
      // fetchPosts(token, true);
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

  // const handleLoadNewPosts = () => { 
  //   setNewPostsNotification(false); 
  //   setPosts([]);
  //   setPage(1); 
  //   if (token) {
  //     fetchPosts(token, true); 
  //   }
  // };

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">Homepage error: {error}</div>;
  }  
  if (posterror) {
    return <div className="container mx-auto p-4 text-red-500 text-center">Post error:{posterror}</div>;
  }

  return (
    <div className="container mx-auto p-2">
      {currentUser && <p className="pl-4 mb-3">Welcome, {currentUser.username} to the ultimate money making hot spot to boost your income !!</p>}

      <button
        onClick={() => router.push('/create-post')}
        className="w-full bg-green-500 text-white px-2 py-2 rounded-md mb-4"
      >
        + Create  New Post
      </button>    

      {/* New: Display User Statistics */}
      <div className="bg-gray-800 rounded-lg shadow-md p-3 mb-4 text-white">
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

      <div className="flex items-center justify-between mt-2 ml-1">
        <h1 className="text-lg font-bold mb-4">Posts feed</h1>
        <button
          id="dropdownDefaultButton"
          onClick={() => setDropdown(!dropdown)}
          className="bg-blue-300 text-sky-700 px-4 pt-0.5 font-bold inline-flex items-center rounded-md mb-4"
        >
          Hot
          <svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
          </svg>
        </button>
        {dropdown && (
        <div
          className="origin-top-right absolute right-0 mt-24 w-20 mr-2 
          rounded-md shadow-lg bg-blue-300 ring-1 ring-black ring-opacity-5
          focus:outline-none"
          role="menu"
        >
          <div className="py-1" role="none">
            <a href="#"
              className="block px-4 py-2 text-sm text-sky-700 bg-blue-300 font-bold"
            >
              New
            </a>
            <a href="#"
              className="block px-4 py-2 text-sm text-sky-700 bg-blue-300 font-bold"
            >
              Top
            </a>                        
          </div>
        </div>
        )}
      </div>

      {posts.length === 0 && !loading ? (
          <p className="text-center text-gray-500">No posts available. Be the first to post!</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post}
              onPostUpdate={updatePostInContext} 
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
