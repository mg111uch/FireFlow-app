// y
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Post } from '../lib/types';
import { formatTimeAgo } from '../lib/utils';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const APP_URL = process.env.NEXT_PUBLIC_URL;

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
}

export default function PostCard({ post, onPostUpdate }: PostCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [currentUpvotes, setCurrentUpvotes] = useState(post.upvotes);
  const [currentDownvotes, setCurrentDownvotes] = useState(post.downvotes);
  const [currentUserVoteType, setCurrentUserVoteType] = useState<1 | -1 | null>(post.user_vote_type || null);

  useEffect(() => {
    setIsSaved(post.is_saved || false);
    setCurrentUpvotes(post.upvotes);
    setCurrentDownvotes(post.downvotes);
    setCurrentUserVoteType(post.user_vote_type || null);

    // Track post view when the component mounts or post ID changes
    const token = localStorage.getItem('token');
    if (token && post.id) {
      axios.post(
        `${APP_URL}/api/posts/${post.id}/view`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(response => {
        // console.log('View tracked:', response.data.message);
        // The backend emits a WebSocket update for views, so no direct state update here.
      }).catch(err => {
        console.error('Error tracking view:', err);
        if (err.response?.status === 403 && err.response.data.error === 'Access Denied: Token expired.') {
          localStorage.removeItem('token');
          router.push('/login');
        }
      });
    }
  }, [post]);

  const handleVote = async (postId: number, voteType: 1 | -1) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to vote.');
      router.push('/login');
      return;
    }

    try {
      // The actual vote count update will come via WebSocket from the backend
      // Optimistic UI update
      const previousUserVoteType = currentUserVoteType;
      const previousUpvotes = currentUpvotes;
      const previousDownvotes = currentDownvotes;

      let newUpvotes = currentUpvotes;
      let newDownvotes = currentDownvotes;
      let newUserVoteType: 1 | -1 | null = null;

      if (previousUserVoteType === voteType) { // User is unvoting
        newUserVoteType = null;
        if (voteType === 1) newUpvotes--;
        else newDownvotes--;
      } else { // User is voting or changing vote
        newUserVoteType = voteType;
        if (voteType === 1) {
          newUpvotes++;
          if (previousUserVoteType === -1) newDownvotes--;
        } else {
          newDownvotes++;
          if (previousUserVoteType === 1) newUpvotes--;
        }
      }

      setCurrentUserVoteType(newUserVoteType);
      setCurrentUpvotes(newUpvotes);
      setCurrentDownvotes(newDownvotes);

      await axios.post(
        `${APP_URL}/api/posts/${postId}/vote`,
        { vote_type: voteType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Backend will emit WebSocket update, which will re-sync
      // For immediate feedback, we do optimistic update. If backend fails, revert
    } catch (err: any) {
      console.error('Error casting vote:', err);
      if (err.response?.status === 403  && err.response.data.error === 'Access Denied: Token expired.') {
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        alert('Failed to cast vote.');
        setCurrentUserVoteType(post.user_vote_type || null);
        setCurrentUpvotes(post.upvotes);
        setCurrentDownvotes(post.downvotes);
      }
    }
  };

  const handleSave = async (postId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to save posts.');
      router.push('/login');
      return;
    }
    try {
      // Optimistic UI update
      const newSavedState = !isSaved;
      setIsSaved(newSavedState);

      const response = await axios.post(
        `${APP_URL}/api/posts/${postId}/save`,
        {}, // No body needed
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsSaved(response.data.saved);

      if (onPostUpdate) {
        onPostUpdate({ ...post, is_saved: response.data.saved });
      }
    } catch (err: any) {
      console.error('Error saving post:', err);
      alert('Failed to save post.');
      // Revert optimistic update on error
      setIsSaved(post.is_saved || false);
    }
  };

  function formatLargeNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    } else {
      return num.toString();
    }
  }

  return (
    <div key={post.id} className="bg-gray-900 rounded-lg p-2">
      <div className="text-gray-500 flex justify-between items-center">
        <p>
          By{" "}
          <Link href={`/profile/${post.user_id}`} className="text-blue-600 text-lg hover:underline">
            {post.username}
          </Link>
          {" "}in{" "}
          <Link href={`/communities/${post.community_id}`} className="text-blue-600 text-lg hover:underline">
            c/{post.community_name}
          </Link>
          {" "} • {formatTimeAgo(post.created_at)}
        </p>

        <button
          onClick={() => { console.log('Share') }}
          className="text-gray-500 mr-2 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
            className="size-5 mr-1 group-hover:text-green-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
        </button>
      </div>

      <div className="text-lg font-semibold text-blue-600">
        <Link href={`/posts/${post.id}`}>
          {post.title}
        </Link>
      </div>

      <p className="text-gray-200 mb-2 whitespace-pre-wrap">
        {post.content}
      </p>

      {/* {post.image_url && (
        <img src={`${APP_URL}/api-uploads`+post.image_url} alt={post.title} className="mt-2 mb-2 w-full h-auto rounded-lg" />
      )} */}

      <div className="flex items-center space-x-10 mt-2 ml-2">

        {/* Views icon */}
        <div className="flex items-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="h-5 w-5 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {formatLargeNumber(post.views)}
        </div>

        {/* Comments icon */}
        <Link href={`/posts/${post.id}`} 
          className="flex items-center text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1 hover:text-blue-600" 
            fill="none" 
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {formatLargeNumber(post.comment_count)}
        </Link>        

        {/* Upvote button */}
        <button 
          onClick={() => handleVote(post.id, 1)} 
          className="flex items-center text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" 
            fill={currentUserVoteType === 1 ? "currentColor" : "none"} 
            viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
            className={`size-5 mr-1 ${
              currentUserVoteType === 1 ? 'text-red-500' : 'hover:text-red-600'
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          {formatLargeNumber(currentUpvotes)}
        </button>

        {/* Downvote button */}
        <button 
          onClick={() => handleVote(post.id, -1)} 
          className="flex items-center text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" 
            fill={currentUserVoteType === -1 ? "currentColor" : "none"} 
            viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
            className={`size-5 mr-1 ${
              currentUserVoteType === -1 ? 'text-orange-400' : 'hover:text-orange-400'
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" />
          </svg>
          {formatLargeNumber(currentDownvotes)}
        </button>

        {/* Save button */}
        <button 
          onClick={() => handleSave(post.id)} 
          className="text-gray-500 flex items-center group">
          <svg xmlns="http://www.w3.org/2000/svg" 
            fill={isSaved ? "currentColor" : "none"} 
            viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
            className={`size-6 group-hover:text-yellow-300 ${
              isSaved ? 'text-yellow-400' : ''
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
        </button>

      </div>
    </div>
  );
}