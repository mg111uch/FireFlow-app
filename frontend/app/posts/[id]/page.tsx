'use client';

import { useState, useEffect, use, useCallback, useRef  } from 'react';
import axios from 'axios';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { Comment } from '@/lib/types';
import { usePosts } from '@/context/PostContext';
import PostCard from '@/components/PostCard';
import CommentCard from '../CommentCard';

const APP_URL = process.env.NEXT_PUBLIC_URL;

interface CommentWithReplies extends Comment {
  loadedReplies?: CommentWithReplies[];
  repliesPage: number;
  hasMoreReplies: boolean;
}

interface CommentVoteUpdate {
  commentId: number;
  upvotes: number;
  downvotes: number;
  user_vote_type: 1 | -1 | null;
}

interface CommentPinUpdate {
    commentId: number;
    is_pinned: boolean;
    postId: number;
}

// Helper function to recursively remove a comment from a nested tree structure.
// Defining it outside the component makes it a pure function and avoids closure issues.
const removeCommentFromTree = (list: CommentWithReplies[], idToRemove: number): CommentWithReplies[] => {
    return list
        .filter(c => c.id !== idToRemove)
        .map(c => {
            if (c.loadedReplies && c.loadedReplies.length > 0) {
                // Return a new comment object with the updated replies list.
                return { ...c, loadedReplies: removeCommentFromTree(c.loadedReplies, idToRemove) };
            }
            return c;
        });
};

export default function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const socket = useSocket();
  const { getPostById, fetchPostById, updatePostInContext } = usePosts();
  const { isAuthenticated, token, currentUser } = useAuth();
  const post = getPostById(id);

  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({});

  const reloadComments = useCallback(() => {
    setComments([]);
    setPage(1);
    setHasMore(true);
  }, []);

  // Effect for fetching parent comments based on page number
  useEffect(() => {
    if (!token || !post) return;
    if (page === 1 && comments.length > 0 && !hasMore) return;
    // Prevents refetch on reload if we've reached the end

    const fetchComments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${APP_URL}/api/posts/${id}/comments?page=${page}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const newComments = response.data.map((c: Comment) => ({
          ...c,
          loadedReplies: [],
          repliesPage: 1,
          hasMoreReplies: (c.reply_count ?? 0) > 0,
        }));
  
        setComments(prev => (page === 1 ? newComments : [...prev, ...newComments]));
        setHasMore(response.data.length > 0);
  
      } catch (err: any) {
        setError('Failed to fetch comments.');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [id, token, post, page]);

  // Effect for fetching post details if not already available
  useEffect(() => {
      if (token && !post) {
          fetchPostById(id);
      }
  }, [id, token, post, fetchPostById]);

  const fetchReplies = useCallback(async (parentId: number) => {
    if(!token || loadingReplies[parentId]) return;

    const parentComment = comments.find(c => c.id === parentId);
    if (!parentComment || !parentComment.hasMoreReplies) return;
    
    setLoadingReplies(prev => ({...prev, [parentId]: true}));

    try {
        const response = await axios.get(`${APP_URL}/api/comments/${parentId}/replies?page=${parentComment.repliesPage}&limit=10`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const newReplies = response.data.map((r: Comment) => ({
            ...r,
            loadedReplies: [],
            repliesPage: 1,
            hasMoreReplies: (r.reply_count ?? 0) > 0,
        }));
        
        setComments(prevComments => prevComments.map(c => {
            if (c.id === parentId) {
                return {
                    ...c,
                    loadedReplies: [...(c.loadedReplies || []), ...newReplies],
                    repliesPage: c.repliesPage + 1,
                    hasMoreReplies: newReplies.length > 0,
                };
            }
            return c;
        }));
    } catch (err) {
        console.error("Failed to fetch replies", err);
    } finally {
        setLoadingReplies(prev => ({...prev, [parentId]: false}));
    }
  }, [comments, token, loadingReplies]);

  useEffect(() => {
    if (!socket || !post) return;

    const handleNewComment = (newCommentData: Comment) => {
      // Only reload if the comment belongs to the current post.  
      if (newCommentData.post_id === parseInt(id)) {
        // A full reload is a simple way to ensure all new comments/replies appear correctly.    
        reloadComments();
      }
    };

    const handleCommentVote = (data: CommentVoteUpdate) => {
        const updateVote = (commentList: CommentWithReplies[]): CommentWithReplies[] => {
            return commentList.map(c => {
                if (c.id === data.commentId) {
                    return { ...c, upvotes: data.upvotes, downvotes: data.downvotes, user_vote_type: data.user_vote_type };
                }
                if (c.loadedReplies) {
                     return { ...c, loadedReplies: updateVote(c.loadedReplies) };
                }
                return c;
            });
        };
        setComments(prev => updateVote(prev));
    };

    const handleCommentDeleted = ({ commentId }: { commentId: number }) => {
      // Use the updater form of setState with the pure helper function
      // to correctly remove the comment from the state tree.
      setComments(prevComments => removeCommentFromTree(prevComments, commentId));
    };
    
    const handleCommentPin = (data: CommentPinUpdate) => {
        if (data.postId === post.id) {
          // A full reload ensures pinned comment moves to the top correctly.
            reloadComments();
        }
    };

    socket.on('newComment', handleNewComment);
    socket.on('commentVoteUpdate', handleCommentVote);
    socket.on('commentDeleted', handleCommentDeleted);
    socket.on('commentPinUpdate', handleCommentPin);

    return () => {
        socket.off('newComment', handleNewComment);
        socket.off('commentVoteUpdate', handleCommentVote);
        socket.off('commentDeleted', handleCommentDeleted);
        socket.off('commentPinUpdate', handleCommentPin);
    };
  }, [socket, id, post, reloadComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !token || !newComment.trim()) return;

    try {
      await axios.post(`${APP_URL}/api/posts/${id}/comments`, {
        content: newComment,
        parent_id: replyTo ? replyTo.id : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewComment('');
      setReplyTo(null);
    } catch (err: any) {
      setError('Failed to post comment.');
    }
  };

  // This function is passed to the CommentCard for local state updates (e.g., saving a comment).
  const handleCommentUpdate = (updatedComment: Comment) => {
      const update = (list: CommentWithReplies[]): CommentWithReplies[] => {
          return list.map(c => {
              if (c.id === updatedComment.id) return { ...c, ...updatedComment, loadedReplies: c.loadedReplies, repliesPage: c.repliesPage, hasMoreReplies: c.hasMoreReplies };
              if (c.loadedReplies) return { ...c, loadedReplies: update(c.loadedReplies) };
              return c;
          });
      };
      setComments(prev => update(prev));
  };

  // This is passed to CommentCard, but the actual deletion is handled by the websocket event.
  // This function is here to satisfy the prop requirement, though it is not called by CommentCard.
  const handleCommentDelete = useCallback((commentId: number) => {
    setComments(prev => removeCommentFromTree(prev, commentId));
  }, []);

  const handleReplyClick = (comment: Comment) => {
    setReplyTo(comment);
    document.getElementById('comment-textarea')?.focus();
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastCommentElementRef = useCallback((node: Element | null) => {
    if (loadingComments) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingComments, hasMore]);

  if (!post) return <div className="container mx-auto p-4">Loading post...</div>;
  if (error) return <div className="container mx-auto p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-2">
      <PostCard post={post} onPostUpdate={updatePostInContext} />

      <div className="my-6">
        <h2 className="text-xl font-bold mb-4">Comments</h2>
        <form onSubmit={handlePostComment} className="mb-6">
          {replyTo && (
            <div className="text-sm text-gray-400 mb-2">
              Replying to @{replyTo.username}
              <button type="button" onClick={() => setReplyTo(null)} className="ml-2 text-red-500">(Cancel reply)</button>
            </div>
          )}
          <textarea
            id="comment-textarea"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? `Replying to ${replyTo.username}...` : "Add a comment..."}
            className="bg-gray-700 p-2 w-full rounded-md mb-2"
            rows={3}
          ></textarea>
          <button type="submit" className="bg-blue-600 px-4 py-2 rounded-md" disabled={loading}>
            {replyTo ? 'Post Reply' : 'Post Comment'}
          </button>
        </form>

        <div className="flex flex-col">
             {comments.map((comment, index) => (
                <div ref={comments.length === index + 1 ? lastCommentElementRef : null} key={`${comment.id}-${index}`}>
                    <CommentCard
                      comment={comment}
                      post={post}
                      onCommentUpdate={handleCommentUpdate}
                      onReplyClick={handleReplyClick}
                      onCommentDelete={handleCommentDelete}
                      onFetchReplies={fetchReplies}
                    />
                </div>
            ))}
        </div>
        {loadingComments && <div className="text-center p-4">Loading comments...</div>}
        {!hasMore && comments.length > 0 && <div className="text-center p-4 text-gray-500">You've reached the end.</div>}
      </div>
    </div>
  );
}