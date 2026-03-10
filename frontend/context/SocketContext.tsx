'use client'
import React, { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_URL

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, isAuthenticated, loading: authLoading, logout } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only attempt to connect if auth loading is complete and a token is available
    if (authLoading || !token) {
      // Optionally redirect if no token is present and not loading auth
      if (!authLoading && !token && pathname !== '/auth/login' && pathname !== '/auth/register') {
        logout();
      }
      return; // Do not proceed without token or while auth is loading
    }

    console.log('Connecting to WebSocket at:', APP_URL);
    // Connect to the WebSocket server with authentication
    if (!socketRef.current) {
      socketRef.current = io(APP_URL as string, {
            auth: {
              token: token, // Pass the JWT token for authentication
            },
            transports: ['websocket'], // Ensure WebSocket is preferred
          });
      console.log('Global Socket initialized in context');
    }

    // Optional: Clean up on unmount if your root provider ever unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, authLoading, router]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
};