"use client";

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Post } from '@/lib/types';
import { useAuth } from './AuthContext'; 

const APP_URL = process.env.NEXT_PUBLIC_URL;

interface PostContextType {
  posts: Post[];
  loading: boolean;
  posterror: string | null;
  fetchPosts: (initial?: boolean) => Promise<void>;
  getPostById: (id: string | number) => Post | undefined;
  updatePostInContext: (updatedPost: Post) => void;
  fetchPostById: (id: string | number) => Promise<void>;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [posterror, setPostError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Function to fetch posts and update the state
  const fetchPosts = useCallback(async (initial = false) => {
    if (!token) {
      setPostError('Authentication token not available.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPostError(null);
    const currentPage = initial ? 1 : page;

    try {
      const response = await axios.get(`${APP_URL}/api/posts?page=${currentPage}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => initial ? response.data : [...prev, ...response.data]);
        setPage(prev => prev + 1);
        setHasMore(true);
      }
    } catch (err: any) {
      console.error('Error fetching posts in PostContext:', err);
      setPostError('Failed to fetch posts.');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  const fetchPostById = useCallback(async (id: string | number) => {
    const postIdNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (posts.find(p => p.id === postIdNum)) {
      return; // Avoid re-fetching if already in context
    }
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${APP_URL}/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedPost = response.data;
      // Add the newly fetched post to the central state
      setPosts(prevPosts => {
        if (!prevPosts.some(p => p.id === fetchedPost.id)) {
            return [...prevPosts, fetchedPost];
        }
        return prevPosts;
      });
    } catch (err) {
      console.error(`Error fetching post ${id}:`, err);
      setPostError('Failed to fetch the post.');
    } finally {
      setLoading(false);
    }
  }, [token, posts]);

  // Function to get a single post by ID from the global state
  const getPostById = useCallback((id: string | number) => {
    const postIdNum = typeof id === 'string' ? parseInt(id, 10) : id;
    return posts.find(post => post.id === postIdNum);
  }, [posts]);

  // Function to update a post in the context (e.g., after a vote or save)
  const updatePostInContext = useCallback((updatedPost: Post) => {
    setPosts(prevPosts =>
      prevPosts.map(post => (post.id === updatedPost.id ? updatedPost : post))
    );
  }, []);

  // Initial fetch when component mounts or token becomes available
  useEffect(() => {
    if (isAuthenticated && token && posts.length === 0 && !loading) {
      fetchPosts(true);
    }
  }, [isAuthenticated, token, fetchPosts, posts.length, loading]);

  const value = {
    posts,
    loading,
    posterror,
    fetchPosts,
    getPostById,
    updatePostInContext,
    fetchPostById,
  };

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
};

// Custom hook to use the post context
export const usePosts = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
};