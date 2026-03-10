'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '../../lib/utils';
import { Post, Comment } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { UpvoteIcon, DownvoteIcon, SaveIcon, PinIcon } from '../../lib/icons';

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
              <PinIcon className="h-5 w-5 text-yellow-400 absolute top-2 right-2" />
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
                <UpvoteIcon 
                    className={`size-5 mr-1 ${comment.user_vote_type === 1 ? 'text-red-500' : 'hover:text-red-600'}`}
                    isActive={comment.user_vote_type === 1}
                />
                <span>{formatLargeNumber(comment.upvotes)}</span>
              </button>              

              {/* Downvote button */}
              <button onClick={() => handleVote(-1)} className="flex items-center">
                <DownvoteIcon 
                    className={`size-5 mr-1 ${comment.user_vote_type === -1 ? 'text-orange-400' : 'hover:text-orange-400'}`}
                />
                <span>{formatLargeNumber(comment.downvotes)}</span>  
              </button>                          

              {/* Save button */}
              <button onClick={handleSave} className="flex items-center group">
                <SaveIcon 
                    className={`size-6 group-hover:text-yellow-300 ${isSaved ? 'text-yellow-400' : ''}`}
                    isSaved={isSaved}
                />
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