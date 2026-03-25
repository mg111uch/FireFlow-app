'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { Notification } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';

export default function NotificationsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { notifications, loading, unreadCount, fetchNotifications, markAllAsRead } = useNotification();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Fetch notifications when the page is loaded and mark them as read
  useEffect(() => {
    if (isAuthenticated) {
        fetchNotifications();
        if (unreadCount > 0) {
            // Give a moment for user to see the unread status before clearing
            const timer = setTimeout(() => {
                markAllAsRead();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }
  }, [isAuthenticated, fetchNotifications]);

  const getNotificationMessage = (notification: Notification) => {
    const sender = <strong className="font-semibold">{notification.sender_username}</strong>;
    const postTitle = <em className="text-gray-300">"{notification.post_title}"</em>;

    switch (notification.type) {
      case 'new_comment':
        return <span>{sender} commented on your post: {postTitle}</span>;
      case 'reply':
        return <span>{sender} replied to your comment.</span>;
      case 'mention':
        return <span>{sender} mentioned you in a comment on post: {postTitle}</span>;
      default:
        return <span>You have a new notification.</span>;
    }
  };
  
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notifications]);

  if (authLoading || loading) {
    return <div className="text-center p-8">Loading notifications...</div>;
  }
  
  if (!isAuthenticated) {
    // This will be brief as the effect above will redirect.
    return <div className="text-center p-8">Redirecting to login...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-400 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {sortedNotifications.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-900 rounded-lg">
          <p className="text-lg">You have no notifications yet.</p>
          <p className="text-sm mt-2">When someone interacts with your posts or comments, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotifications.map((notification) => (
            <Link
              key={notification.id}
              href={`/posts/${notification.post_id}#comment-${notification.comment_id}`}
              className={`block p-4 rounded-lg transition-colors duration-200 ${
                !notification.is_read ? 'bg-gray-800 border-l-4 border-blue-500' : 'bg-gray-900'
              } hover:bg-gray-700`}
            >
              <div className="flex items-start">
                <div className="flex-grow">
                  <p className="text-gray-200 mb-2">{getNotificationMessage(notification)}</p>
                  
                  <p className="text-sm text-gray-400 p-3 bg-black bg-opacity-20 rounded-md italic border-l-2 border-gray-600">
                    "{notification.content_preview}..."
                  </p>
                  <p className="text-xs text-blue-400 mt-2 text-right">{formatTimeAgo(notification.created_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}