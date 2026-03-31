'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_URL } from '@/lib/config';
import { Gig, GigDetails } from './types';
import { Socket } from 'socket.io-client';

interface UserDetails {
  id: number;
  username: string;
  [key: string]: any;
}

interface UseGigsReturn {
  gigs: Gig[];
  myGigs: Gig[];
  loading: boolean;
  error: string | null;
  fetchAvailableGigs: (filters?: { type?: string; vehicle_type?: string }) => Promise<void>;
  fetchMyGigs: () => Promise<void>;
  acceptGig: (gigId: number) => Promise<void>;
  completeGig: (gigId: number) => Promise<void>;
  cancelGig: (gigId: number) => Promise<void>;
  resetGig: (gigId: number) => Promise<void>;
  deleteGig: (gigId: number) => Promise<void>;
  payGig: (gigId: number) => Promise<void>;
  createGig: (data: { type: 'ride' | 'delivery'; vehicle_type?: string; pickup_address: string; dropoff_address: string; distance?: string; price: number; details: GigDetails }) => Promise<boolean>;
}

export function useGigs(token: string | null, socket?: Socket | null, currentUser?: UserDetails | null): UseGigsReturn {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [myGigs, setMyGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleGigUpdated = (updatedGig: Gig) => {
      if (updatedGig.details && typeof updatedGig.details === 'string') {
        updatedGig.details = JSON.parse(updatedGig.details);
      }
      
      const userId = currentUser?.id;
      const isPoster = userId === updatedGig.user_id;
      const isDriver = userId === updatedGig.driver_id;
      const isRelatedToUser = isPoster || isDriver;
      
      setGigs(prev => {
        if (updatedGig.status === 'open') {
          const exists = prev.find(g => g.id === updatedGig.id);
          if (exists) {
            return prev.map(g => g.id === updatedGig.id ? updatedGig : g);
          }
          return [...prev, updatedGig];
        }
        return prev.filter(g => g.id !== updatedGig.id);
      });
      
      if (isRelatedToUser) {
        setMyGigs(prev => {
          const exists = prev.find(g => g.id === updatedGig.id);
          if (exists) {
            return prev.map(g => g.id === updatedGig.id ? updatedGig : g);
          }
          return [...prev, updatedGig];
        });
      }
    };

    socket.on('gigUpdated', handleGigUpdated);

    return () => {
      socket.off('gigUpdated', handleGigUpdated);
    };
  }, [socket]);

  const fetchAvailableGigs = useCallback(async (filters?: { type?: string; vehicle_type?: string }) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: 'open' });
      if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters?.vehicle_type && filters.vehicle_type !== 'all') params.append('vehicle_type', filters.vehicle_type);
      
      const res = await fetch(`${API_URL}/api/gigs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGigs(data);
    } catch (err) {
      setError('Failed to fetch gigs');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMyGigs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/gigs/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyGigs(data);
    } catch (err) {
      setError('Failed to fetch your gigs');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const acceptGig = useCallback(async (gigId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/gigs/${gigId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAvailableGigs();
      }
    } catch (err) {
      setError('Failed to accept gig');
    }
  }, [token, fetchAvailableGigs]);

  const completeGig = useCallback(async (gigId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/gigs/${gigId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMyGigs();
      }
    } catch (err) {
      setError('Failed to complete gig');
    }
  }, [token, fetchMyGigs]);

  const cancelGig = useCallback(async (gigId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/gigs/${gigId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMyGigs();
      }
    } catch (err) {
      setError('Failed to cancel gig');
    }
  }, [token, fetchMyGigs]);

  const createGig = useCallback(async (data: { type: 'ride' | 'delivery'; vehicle_type?: string; pickup_address: string; dropoff_address: string; distance?: string; price: number; details: GigDetails }): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_URL}/api/gigs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        return true;
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create gig');
        return false;
      }
    } catch (err) {
      setError('Failed to create gig');
      return false;
    }
  }, [token]);

  const resetGig = useCallback(async (gigId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/gigs/${gigId}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMyGigs();
      }
    } catch (err) {
      setError('Failed to reset gig');
    }
  }, [token, fetchMyGigs]);

  const deleteGig = useCallback(async (gigId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/gigs/${gigId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMyGigs(prev => prev.filter(g => g.id !== gigId));
        setGigs(prev => prev.filter(g => g.id !== gigId));
      }
    } catch (err) {
      setError('Failed to delete gig');
    }
  }, [token]);

  const payGig = useCallback(async (gigId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/gigs/${gigId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMyGigs();
      }
    } catch (err) {
      setError('Failed to process payment');
    }
  }, [token, fetchMyGigs]);

  return {
    gigs,
    myGigs,
    loading,
    error,
    fetchAvailableGigs,
    fetchMyGigs,
    acceptGig,
    completeGig,
    cancelGig,
    resetGig,
    deleteGig,
    payGig,
    createGig,
  };
}