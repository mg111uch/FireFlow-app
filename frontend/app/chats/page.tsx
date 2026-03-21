'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import { Message, UserDetails } from '../../lib/types';
import { formatTimeAgo } from '../../lib/utils';

import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/config';

// Extended Message type for conversation list, includes other_user details
interface Conversation extends Message {
  other_user_id: number;
  other_username: string;
  unread_count: number;
  is_online: boolean;
}

export default function ChatsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDetails | null>(null);
  const [typingConversations, setTypingConversations] = useState<number[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const decoded: any = jwtDecode(token);
      setCurrentUser(decoded);
      fetchConversations(token);

      socketRef.current = io(API_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.on('typing-in-list', ({ conversationPartnerId }) => {
        setTypingConversations(prev => [...new Set([...prev, conversationPartnerId])]);
      });
  
      socketRef.current.on('stoppedTyping-in-list', ({ conversationPartnerId }) => {
          setTypingConversations(prev => prev.filter(id => id !== conversationPartnerId));
      });

      socketRef.current.on('newMessage', (newMessage) => {
        fetchConversations(token);
      });

    } catch (err) {
      console.error('Invalid token:', err);
      router.push('/login');
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [router]);

  const fetchConversations = async (token: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.response?.data?.error || 'Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading chats...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-4">Chats</h1>

      {conversations.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <p>You have no active conversations yet.</p>
          <p className="mt-2">Start a chat by visiting a user's profile!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conv) => (
            <li key={conv.other_user_id} className="bg-gray-800 rounded-lg shadow-md p-4">
              <Link href={`/chats/${conv.other_user_id}`} className="block">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                        <h2 className="text-xl font-semibold text-blue-400">
                            {conv.other_username}
                        </h2>
                        {conv.is_online && (
                            <span className="ml-2 w-3 h-3 bg-green-500 rounded-full"></span>
                        )}
                    </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {conv.unread_count} New
                    </span>
                  )}
                </div>
                {typingConversations.includes(conv.other_user_id) ? (
                  <p className="text-green-400 truncate italic">typing...</p>
                ) : (
                  <p className="text-gray-300 truncate">{conv.content}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {formatTimeAgo(conv.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


