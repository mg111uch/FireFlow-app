'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Post } from '../lib/types';
import { formatTimeAgo, formatLargeNumber } from '../lib/utils';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { OptionsIcon, ViewsIcon, CommentsIcon, UpvoteIcon, DownvoteIcon, RepostIcon, QuoteIcon} from '../lib/icons';
import OptionsDrawer, { DrawerButton } from './ui/OptionsDrawer';
import Snackbar from './ui/Snackbar';
import { API_URL } from '@/lib/config';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
  onDeleteSuccess?: () => void;
  currentUserId?: number;
}

export default function PostCard({ post, onPostUpdate, onDeleteSuccess, currentUserId }: PostCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [currentUpvotes, setCurrentUpvotes] = useState(post.upvotes);
  const [currentDownvotes, setCurrentDownvotes] = useState(post.downvotes);
  const [currentRepostCount, setCurrentRepostCount] = useState(post.repost_count || 0);
  const [currentUserVoteType, setCurrentUserVoteType] = useState<1 | -1 | null>(post.user_vote_type || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRepostDrawerOpen, setIsRepostDrawerOpen] = useState(false);
  const [showSaveSnackbar, setShowSaveSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    setIsSaved(post.is_saved || false);
    setCurrentUpvotes(post.upvotes);
    setCurrentDownvotes(post.downvotes);
    setCurrentRepostCount(post.repost_count || 0);
    setCurrentUserVoteType(post.user_vote_type || null);

    // Track post view when the component mounts or post ID changes
    const token = localStorage.getItem('token');
    if (token && post.id) {
      axios.post(
        `${API_URL}/api/posts/${post.id}/view`,
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
        `${API_URL}/api/posts/${postId}/vote`,
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
        `${API_URL}/api/posts/${postId}/save`,
        {}, // No body needed
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsSaved(response.data.saved);

      if (onPostUpdate) {
        onPostUpdate({ ...post, is_saved: response.data.saved });
      }
      
      // Show snackbar confirmation
      const message = response.data.saved ? 'Post saved !' : 'Post Unsaved !';
      setSnackbarMessage(message);
      setShowSaveSnackbar(true);
    } catch (err: any) {
      console.error('Error saving post:', err);
      alert('Failed to save post.');
      // Revert optimistic update on error
      setIsSaved(post.is_saved || false);
    }
  };

  const handleRepost = async (postId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to repost.');
      router.push('/login');
      return;
    }
    try {
      // Optimistic UI update
      setCurrentRepostCount(currentRepostCount + 1);

      await axios.post(
        `${API_URL}/api/posts/${postId}/repost`,
        { current_user_id: currentUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsRepostDrawerOpen(false);
      setSnackbarMessage('Post reposted successfully!');
      setShowSaveSnackbar(true);
    } catch (err: any) {
      console.error('Error reposting:', err);
      alert('Failed to repost.');
      setCurrentRepostCount(post.repost_count || 0);
    }
  };

  const handleQuote = async (postId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to quote.');
      router.push('/login');
      return;
    }
    
    const quoteContent = prompt('Enter your quote:');
    if (!quoteContent) {
      return; // User cancelled
    }
    
    try {
      // Optimistic UI update
      setCurrentRepostCount(currentRepostCount + 1);

      await axios.post(
        `${API_URL}/api/posts/${postId}/repost`,
        { quote_content: quoteContent, current_user_id: currentUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsRepostDrawerOpen(false);
      setSnackbarMessage('Quote created successfully!');
      setShowSaveSnackbar(true);
    } catch (err: any) {
      console.error('Error creating quote:', err);
      alert('Failed to create quote.');
      setCurrentRepostCount(post.repost_count || 0);
    }
  };

  const handleDelete = async (postId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to delete posts.');
      router.push('/login');
      return;
    }

    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsDrawerOpen(false);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post.');
    }
  };

  return (
    <div key={post.id} className="bg-gray-900 p-2 border-b border-gray-600">
      <div className="text-gray-500 flex justify-between items-center">
        <p>
          <Link href={`/profile/${post.user_id}`} className="text-blue-400 text-lg hover:underline">
            {post.username}
          </Link>
          {post.community_name ? (
            <>
              {" "}in{" "}
              <Link href={`/communities/${post.community_id}`} className="text-blue-400 text-lg hover:underline">
                c/{post.community_name}
              </Link>
            </>
          ) : null}
          {" "} • {formatTimeAgo(post.created_at)}
        </p>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="text-gray-500 mr-2 group"
        >
          <OptionsIcon className="size-5 mr-1 group-hover:text-grey-500" />
        </button>
      </div>

      <div className="text-lg font-semibold text-gray-400">
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

      <div className="flex items-center space-x-8 mt-2 ml-2">

        {/* Views icon */}
        <div className="flex items-center text-gray-500">
          <ViewsIcon className="h-5 w-5 mr-1" />
          {formatLargeNumber(post.views)}
        </div>

        {/* Comments icon */}
        <Link href={`/posts/${post.id}`} 
          className="flex items-center text-gray-500"
        >
          <CommentsIcon className="h-5 w-5 mr-1 hover:text-blue-600" />
          {formatLargeNumber(post.comment_count)}
        </Link>        

        {/* Upvote button */}
        <button 
          onClick={() => handleVote(post.id, 1)} 
          className="flex items-center text-gray-500"
        >
          <UpvoteIcon 
            className={`size-5 mr-1 ${
              currentUserVoteType === 1 ? 'text-red-500' : 'hover:text-red-600'
            }`}
            isActive={currentUserVoteType === 1}
          />
          {formatLargeNumber(currentUpvotes)}
        </button>

        {/* Downvote button */}
        <button 
          onClick={() => handleVote(post.id, -1)} 
          className="flex items-center text-gray-500"
        >
          <DownvoteIcon 
            className={`size-5 mr-1 ${
              currentUserVoteType === -1 ? 'text-orange-400' : 'hover:text-orange-400'
            }`}
          />
          {formatLargeNumber(currentDownvotes)}
        </button>

        {/* Repost button */}
        <button 
          onClick={() => setIsRepostDrawerOpen(true)} 
          className="text-gray-500 flex items-center group">
          <RepostIcon 
            className={`size-6 mr-1 group-hover:text-green-500`}
          />
          {formatLargeNumber(currentRepostCount)}
        </button>

      </div>

      <OptionsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onDelete={() => handleDelete(post.id)}
        onShare={() => console.log('Share')}
        onSave={() => handleSave(post.id)}
        showDeleteOption={post.user_id === currentUserId}
        isSaved={isSaved}
      />

      {/* Repost Drawer - Repost/Quote options */}
      <OptionsDrawer
        isOpen={isRepostDrawerOpen}
        onClose={() => setIsRepostDrawerOpen(false)}
        customButtons={[
          {
            label: 'Repost',
            icon: <RepostIcon className="size-6 mr-4 text-green-500" />,
            onClick: () => handleRepost(post.id),
            iconColor: 'text-green-500'
          },
          {
            label: 'Quote',
            icon: <QuoteIcon className="size-6 mr-4 text-blue-500" />,
            onClick: () => handleQuote(post.id),
            iconColor: 'text-blue-500'
          }
        ]}
      />

      <Snackbar
        message={snackbarMessage}
        isVisible={showSaveSnackbar}
        onClose={() => setShowSaveSnackbar(false)}
      />
    </div>
  );
}