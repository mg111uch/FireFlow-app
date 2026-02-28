// y
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode'; 
import { UserDetails } from '@/lib/types';
import axios from 'axios';

const APP_URL = process.env.NEXT_PUBLIC_URL

interface AuthContextType {
  currentUser: UserDetails | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  login: (loginData: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDetails | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // True initially while checking token
  const expirationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {        
      try {
        const decodedToken: any = jwtDecode(storedToken);
        const expirationTime = decodedToken.exp * 1000;
        const timeUntilExpiration = expirationTime - Date.now();

        if (timeUntilExpiration <= 0) {
          logout();
        } else {
          setIsAuthenticated(true);
          setCurrentUser(decodedToken);
          setToken(storedToken);

          expirationTimeoutRef.current = setTimeout(() => {
            logout();
          }, timeUntilExpiration);
        }
      }catch (err) {
        console.error('Failed to decode token:', err);
        logout();
      } 
    }
    setLoading(false);
  }, []);

  // Cleanup the timeout on component unmount
  useEffect(() => {
    return () => { 
      if (expirationTimeoutRef.current) {
        clearTimeout(expirationTimeoutRef.current);
      }
    };
  }, []);

  const login = async (loginData: any) => {
    try {
    const response = await axios.post(`${APP_URL}/api/auth/login`, loginData);
    if (response.status === 200) {
      const receivedToken = response.data.token;
      localStorage.setItem('token', receivedToken);
      const decodedToken: any = jwtDecode(receivedToken);
      setToken(receivedToken);
      setCurrentUser(decodedToken);
      setIsAuthenticated(true);
      router.push('/');
    }
  } catch (err: any) {
      throw err;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setToken(null);
    if (expirationTimeoutRef.current) {
      clearTimeout(expirationTimeoutRef.current);
    }
    router.push('/auth/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, loading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};