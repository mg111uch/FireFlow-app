// y

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '../lib/utils';
import { Post, Comment } from '../lib/types';
import { useAuth } from '../context/AuthContext';

const APP_URL = process.env.NEXT_PUBLIC_URL;

interface CommentWithReplies extends Comment {
  loadedReplies?: CommentWithReplies[];
  hasMoreReplies?: boolean;
}

interface CommentCardProps {
  comment: CommentWithReplies;
  post: Post;
  onCommentUpdate: (updatedComment: Comment) => void;
  onReplyClick: (comment: Comment) => void;
  onCommentDelete: (commentId: number) => void;
  onFetchReplies: (commentId: number) => void;
}

export default function CommentCard({ comment, post, onCommentUpdate, onReplyClick, onCommentDelete, onFetchReplies }: CommentCardProps) {
  const router = useRouter();
  const { isAuthenticated, currentUser, token } = useAuth();
  // const [currentUpvotes, setCurrentUpvotes] = useState(comment.upvotes);
  // const [currentDownvotes, setCurrentDownvotes] = useState(comment.downvotes);
  // const [currentUserVoteType, setCurrentUserVoteType] = useState<1 | -1 | null>(comment.user_vote_type || null);
  const [isSaved, setIsSaved] = useState(comment.is_saved);

  useEffect(() => {
    // setCurrentUpvotes(comment.upvotes);
    // setCurrentDownvotes(comment.downvotes);
    // setCurrentUserVoteType(comment.user_vote_type || null);
    setIsSaved(comment.is_saved);
  }, [comment.is_saved]);

  const handleVote = async (voteType: 1 | -1) => {
    if (!token) return router.push('/auth/login');
    const newVoteType = comment.user_vote_type === voteType ? null : voteType;
    try {
      await axios.post(
        `${APP_URL}/api/comments/${comment.id}/vote`,
        { vote_type: newVoteType === null ? 0 : newVoteType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Error casting vote:', err);
      alert('Failed to cast vote.');
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    if (window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
        try {
            await axios.delete(`${APP_URL}/api/comments/${comment.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // The websocket event will trigger onCommentDelete in the parent
        } catch (err) {
            console.error('Failed to delete comment:', err);
            alert('Failed to delete comment.');
        }
    }
  };

  const handleSave = async () => {
    if (!token) return router.push('/login');
    try {
      const newSavedState = !isSaved;
      setIsSaved(newSavedState);
      const response = await axios.post(
        `${APP_URL}/api/comments/${comment.id}/save`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCommentUpdate({ ...comment, is_saved: response.data.saved });
    } catch (err: any) {
      console.error('Error saving comment:', err);
      alert('Failed to save comment.');
      setIsSaved(comment.is_saved);
    }
  };

  const handlePin = async () => {
      if (!token || currentUser?.id !== post.user_id) return;
      try {
          await axios.post(`${APP_URL}/api/comments/${comment.id}/pin`, {}, {
              headers: { Authorization: `Bearer ${token}` }
          });
          // Websocket event will handle the state update
      } catch (err) {
          console.error("Failed to pin comment", err);
          alert("Failed to pin comment.");
      }
  };

  function formatLargeNumber(num: number): string {
    if(!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }

  const isPostAuthor = currentUser?.id === post.user_id;
  const isParentComment = !comment.parent_id;

  return (
    <div id={`comment-${comment.id}`} key={comment.id} className="w-full">
    <div className="flex-col space-x-2 my-2 w-full">
      <div className="flex-grow bg-gray-800 p-2 rounded-lg relative">
        {isParentComment && comment.is_pinned && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 absolute top-2 right-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.106a1.5 1.5 0 00-1.788 0l-6 4.5A1.5 1.5 0 002.25 8.25v6.5a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-6.5a1.5 1.5 0 00-.856-1.394l-6-4.5z" />
                <path d="M10 12.5a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
        )}
        <div className="text-gray-400 text-sm mb-1">
          <Link href={`/profile/${comment.user_id}`} className="text-blue-500 hover:underline">
            {comment.username}
          </Link>
          {" "}• {formatTimeAgo(comment.created_at)}
        </div>

        <p className="text-gray-200 whitespace-pre-wrap">{comment.content}</p>

        <div className="flex items-center space-x-4 mt-2 text-gray-400 text-sm">
          {isAuthenticated && (
            <div className="flex items-center space-x-6">
              {/* Reply button */}
              <button onClick={() => onReplyClick(comment)} className="hover:text-blue-500">
                Reply
              </button>

              {/* Upvote button */}
              <button onClick={() => handleVote(1)} className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" 
                    fill={comment.user_vote_type === 1 ? "currentColor" : "none"} 
                    viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
                    className={`size-5 mr-1 ${comment.user_vote_type === 1 ? 'text-red-500' : 'hover:text-red-600'}`}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                <span>{formatLargeNumber(comment.upvotes)}</span>
              </button>              

              {/* Downvote button */}
              <button onClick={() => handleVote(-1)} className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" 
                    fill={comment.user_vote_type === -1 ? "currentColor" : "none"} 
                    viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
                    className={`size-5 mr-1 ${comment.user_vote_type === -1 ? 'text-orange-400' : 'hover:text-orange-400'}`}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" />
                </svg>
                <span>{formatLargeNumber(comment.downvotes)}</span>  
              </button>                          

              {/* Save button */}
              <button onClick={handleSave} className="flex items-center group">
                <svg xmlns="http://www.w3.org/2000/svg" 
                    fill={isSaved ? "currentColor" : "none"} 
                    viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                    className={`size-6 group-hover:text-yellow-300 ${isSaved ? 'text-yellow-400' : ''}`}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
              </button>

              {/* Delete button */}
              {currentUser?.id === comment.user_id && (
                <button onClick={handleDelete} className="hover:text-red-500">Delete</button>
              )}
              
              {/* Pin button */}
              {isPostAuthor && isParentComment && (
                <button onClick={handlePin} className="hover:text-yellow-400">{comment.is_pinned ? 'Unpin' : 'Pin'}</button>
              )}            
            </div>
          )}          
        </div>
        {comment.hasMoreReplies && (
          <button onClick={() => onFetchReplies(comment.id)} className="text-xs text-blue-400 hover:underline mt-2">
            {comment.loadedReplies && comment.loadedReplies.length > 0 ? 'Load more replies' : `View ${comment.reply_count} ${comment.reply_count === 1 ? 'reply' : 'replies'}`}
          </button>
        )}
      </div>
      
      {comment.loadedReplies && comment.loadedReplies.length > 0 && (
            <div className="pl-5 border-l-2 border-gray-700 ml-4">
                {comment.loadedReplies.map((reply, index) => (
                    <CommentCard
                        key={`${reply.id}-${index}`}
                        comment={reply}
                        post={post}
                        onCommentUpdate={onCommentUpdate}
                        onReplyClick={onReplyClick}
                        onCommentDelete={onCommentDelete}
                        onFetchReplies={onFetchReplies}
                    />
                ))}
            </div>
        )}
    </div>
    </div>
  );
}