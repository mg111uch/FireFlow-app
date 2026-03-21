'use client';

import { useState, useEffect,useMemo, useRef, use, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { io, Socket } from 'socket.io-client';
import { Message, UserDetails, Reaction } from '../../../lib/types';
import { SendIcon, ReplyIcon, EmojiPickerIcon, EditIcon, DeleteIcon, CrossIcon, OptionsIcon } from '@/lib/icons';
import { formatTimeAgo } from '../../../lib/utils';
import { API_URL } from '@/lib/config';

export default function ChatRoomPage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const { userId: otherUserId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDetails | null>(null);
  const [otherUser, setOtherUser] = useState<UserDetails | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loader = useRef(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMoreMessages = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !hasMore) return;

    try {
      const res = await axios.get(`${API_URL}/api/chats/${otherUserId}/messages?page=${page + 1}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data.length > 0) {
        setMessages(prev => [...res.data, ...prev]);
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch more messages:', err);
    }
  }, [hasMore, page, otherUserId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMoreMessages();
      }
    });

    if (loader.current) {
      observer.observe(loader.current);
    }

    return () => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [loader, fetchMoreMessages]);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showOptionsFor, setShowOptionsFor] = useState<number | null>(null);
  const [justOpened, setJustOpened] = useState(false);

  const toggleOptions = (messageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setJustOpened(true);
    setTimeout(() => setJustOpened(false), 100);
    setShowOptionsFor(showOptionsFor === messageId ? null : messageId);
  };

  useEffect(() => {
    if (!showOptionsFor || justOpened) return;
    
    const handleClickOutside = () => setShowOptionsFor(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showOptionsFor, justOpened]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessageContent(e.target.value);
    if (socketRef.current && currentUser) {
      socketRef.current.emit('typing', { receiverId: parseInt(otherUserId) });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stoppedTyping', { receiverId: parseInt(otherUserId) });
      }, 1000);
    }
  };

  const handleReaction = (messageId: number, emoji: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('addReaction', { messageId, emoji });
    setShowEmojiPickerFor(null);
  };

  const handleRemoveReaction = (messageId: number, reactionId: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit('removeReaction', { messageId, reactionId });
  };

  const handleEditMessage = async (messageId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.put(`${API_URL}/api/chats/messages/${messageId}`, 
        { content: editingContent }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: editingContent, edited: 1 } 
          : msg
      ));
      setEditingMessageId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.delete(`${API_URL}/api/chats/messages/${messageId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      setCurrentUser(decoded);
    } catch (err) {
      console.error('Invalid token:', err);
      router.push('/login');
      return;
    }

    socketRef.current = io(API_URL as string, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.emit('joinChatRoom', { otherUserId: parseInt(otherUserId) });

    socketRef.current.on('newMessage', (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      setIsOtherUserTyping(false);
    });

    socketRef.current.on('messageEdited', (editedMessage: Message) => {
        setMessages(prev => prev.map(m => m.id === editedMessage.id ? editedMessage : m));
    });

    socketRef.current.on('messageDeleted', ({ messageId }) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socketRef.current.on('reactionAdded', ({ messageId, reaction }) => {
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, reactions: [...(msg.reactions || []), reaction] } 
                : msg
        ));
    });

    socketRef.current.on('reactionRemoved', ({ messageId, reactionId }) => {
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, reactions: (msg.reactions || []).filter(r => r.id !== reactionId) } 
                : msg
        ));
    });

    socketRef.current.on('typing', () => setIsOtherUserTyping(true));
    socketRef.current.on('stoppedTyping', () => setIsOtherUserTyping(false));

    const fetchChatData = async () => {
      setLoading(true);
      try {
        const [messagesRes, otherUserRes] = await Promise.all([
          axios.get(`${API_URL}/api/chats/${otherUserId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/users/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setMessages(messagesRes.data);
        setOtherUser(otherUserRes.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load chat.');
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [otherUserId, router]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, replyingTo]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !socketRef.current || !currentUser) return;

    socketRef.current.emit('sendMessage', {
      receiverId: parseInt(otherUserId),
      content: newMessageContent.trim(),
      replyToMessageId: replyingTo ? replyingTo.id : null,
    });
    setNewMessageContent('');
    setReplyingTo(null);
  };

  const lastSeenMessageId = useMemo(() => {
    const myMessages = messages.filter(m => m.sender_id === currentUser?.id && m.read_status === 1);
    if (myMessages.length > 0) {
        return myMessages[myMessages.length - 1].id;
    }
    return null;
  }, [messages, currentUser]);

  if (loading) return <div className="container mx-auto p-4 text-center">Loading chat...</div>;
  if (error) return <div className="container mx-auto p-4 text-red-500 text-center">{error}</div>;
  if (!otherUser) return <div className="container mx-auto p-4 text-center">User not found.</div>;

  return (
    <div className="flex flex-col h-screen -mt-16 -mb-20 bg-gray-900 rounded-lg">
      <div className="fixed top-15 left-0 right-0 p-2 bg-gray-700 border-b border-gray-400 flex items-center justify-between z-10"> 
        <div className="w-6"></div>      
        <h1 className="text-xl font-bold text-white">{otherUser.username}</h1>
        <div className="w-6"></div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 mt-16 pb-24 ${replyingTo ? 'pb-40' : ''}`}>
        <div ref={loader} />
        {hasMore && <div className="text-center">Loading more messages...</div>}
        {messages.map((message, index) => (
          <div key={message.id}>
            <div
              ref={index === messages.length - 1 ? messagesEndRef : null}
              className={`group flex items-start gap-2 ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ marginBottom: (message.reactions && message.reactions.length > 0) ? '1.0rem' : '0.15rem' }}>
              <div className={`max-w-[70%] p-2 pb-3 rounded-lg shadow-md relative ${
                  message.sender_id === currentUser?.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
              }`}>
                {(message as any).reply_to_message_id && (message as any).replied_to_content && (
                  <div className="mb-2 p-2 rounded-lg bg-black bg-opacity-20 cursor-pointer">
                      <p className="text-xs font-bold text-blue-300">{(message as any).replied_to_username}</p>
                      <p className="text-xs opacity-80 truncate">{(message as any).replied_to_content}</p>
                  </div>
                )}
                {editingMessageId === message.id ? (
                  <div className="flex items-center">
                    <input 
                      type="text" 
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="bg-gray-800 text-white rounded-md p-2 w-full"
                    />
                    <button onClick={() => handleEditMessage(message.id)} className="text-green-400 p-2">Save</button>
                    <button onClick={() => setEditingMessageId(null)} className="text-red-400 p-2">Cancel</button>
                  </div>
                ) : (
                  <p className="text-sm break-words">{message.content}</p>
                )}

                {index === messages.length - 1 && (
                <div className="flex justify-end items-center mt-1">
                  <span className="text-xs opacity-75 mr-2">{formatTimeAgo(message.created_at)}</span>
                  {message.edited === 1 && <span className="text-xs opacity-75 mr-2">(edited)</span>}
                </div>
                )}
                
                {/* Reactions Display */}
              {message.reactions && message.reactions.length > 0 && (
                <div className={`absolute -bottom-4 flex items-center bg-gray-700 rounded-full p-1 border-2 border-gray-900 ${message.sender_id === currentUser?.id ? 'right-4' : 'left-4'}`}>
                    <div className="flex items-center space-x-1 px-1">
                        {message.reactions.map(reaction => (
                            <button 
                                key={reaction.id} 
                                onClick={() => {
                                    if (reaction.user_id === currentUser?.id) {
                                        handleRemoveReaction(message.id, reaction.id);
                                    }
                                }}
                                className={`text-xs ${reaction.user_id === currentUser?.id ? 'cursor-pointer' : 'cursor-default'}`}
                                title={reaction.username}
                            >
                                {reaction.emoji}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-gray-300 pr-1">{message.reactions.length}</span>
                </div>
              )}

                {/* Emoji Picker */}
                {showEmojiPickerFor === message.id && (
                  <div className="absolute z-10 bg-gray-800 p-2 rounded-lg shadow-lg">
                    <div className="flex gap-2">
                      {['👍', '❤️', '😂', '😢', '😮'].map(emoji => (
                        <button key={emoji} onClick={() => handleReaction(message.id, emoji)} className="text-xl hover:scale-125 transition-transform">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Options */}
              <div className="message-options flex gap-1 mt-2 opacity-0 group-hover:opacity-100 relative">
                  <button 
                    onClick={(e) => toggleOptions(message.id, e)} 
                    className="bg-gray-700 rounded-full p-1.5 hover:bg-gray-600"
                  >
                      <OptionsIcon className="size-4" />
                  </button>
                  
                  {showOptionsFor === message.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className={`options-dropdown absolute ${message.sender_id === currentUser?.id ? 'right-0' : 'left-0'} top-8 bg-gray-800 rounded-lg shadow-lg py-1 z-20 min-w-[140px] border border-gray-700`}>
                      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700">
                        {formatTimeAgo(message.created_at)}
                      </div>
                      <button 
                        onClick={() => { setReplyingTo(message); setShowOptionsFor(null); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <ReplyIcon className="size-4" /> Reply
                      </button>
                      <button 
                        onClick={() => { setShowEmojiPickerFor(message.id); setShowOptionsFor(null); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <EmojiPickerIcon className="size-4" /> Emoji
                      </button>
                      {message.sender_id === currentUser?.id && (
                        <>
                          <button 
                            onClick={() => { setEditingMessageId(message.id); setEditingContent(message.content); setShowOptionsFor(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                          >
                            <EditIcon className="size-4" /> Edit
                          </button>
                          <button 
                            onClick={() => { handleDeleteMessage(message.id); setShowOptionsFor(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                          >
                            <DeleteIcon className="size-4" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
              </div>
            </div>
            {index === messages.length - 1 && message.id === lastSeenMessageId && (
              <div className="text-right text-xs text-gray-400 mt-1 pr-2">
                Seen {formatTimeAgo(message.created_at)}
              </div>
            )}
          </div>
        ))}
      </div>

      {replyingTo && (
        <div className="absolute bottom-16 left-0 right-0 p-4 bg-gray-800 border-t border-gray-700 z-10">
          <div className="bg-gray-700 p-2 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">
                Replying to <span className="font-bold">{replyingTo.sender_id === currentUser?.id ? "yourself" : otherUser?.username}</span>
              </p>
              <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
                <CrossIcon/>
              </button>
            </div>
            <p className="text-sm text-gray-300 truncate">{replyingTo.content}</p>
          </div>
        </div>
      )}

      {isOtherUserTyping && <div className="p-2 text-center text-gray-400 text-sm">{otherUser.username} is typing...</div>}

      <form onSubmit={handleSendMessage} className="fixed bottom-0 left-0 right-0 p-2 bg-gray-800 border-t border-gray-700 flex z-10">
        <input
          type="text"
          value={newMessageContent}
          onChange={handleTyping}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-l-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700 focus:outline-none">
          <SendIcon/>
        </button>
      </form>
    </div>
  );
}
