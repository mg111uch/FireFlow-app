'use client';

import React, { use, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Tabs from '@/components/ui/Tabs';
import { getInitials } from '@/lib/utils';
import { API_URL } from '@/lib/config';

interface User {
  id: number;
  username: string;
}

interface FollowersPageProps {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

function FollowersContent({ userId, initialTab }: { userId: string; initialTab: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { label: 'Followers', value: 'followers' },
    { label: 'Following', value: 'following' },
  ];

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'followers' || tab === 'following') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.replace(`/profile/${userId}/followers?tab=${value}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [followersRes, followingRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/${userId}/followers`),
          axios.get(`${API_URL}/api/users/${userId}/following`),
        ]);
        setFollowers(followersRes.data);
        setFollowing(followingRes.data);
      } catch (err) {
        console.error('Error fetching followers/following:', err);
        setFollowers([]);
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const currentUsers = activeTab === 'followers' ? followers : following;

  return (
    <div className="container mx-auto p-2">
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={handleTabChange} 
      />

      {loading ? (
        <p className="text-center text-gray-500 mt-4">Loading...</p>
      ) : currentUsers.length === 0 ? (
        <p className="text-center text-gray-500 mt-4">
          {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        </p>
      ) : (
        <div className="space-y-2 mt-4">
          {currentUsers.map((user) => (
            <Link 
              key={user.id} 
              href={`/profile/${user.id}`}
              className="flex items-center space-x-3 p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
            >
              <div className="relative inline-flex items-center justify-center w-10 h-10 overflow-hidden bg-gray-300 rounded-full">
                <span className="font-medium text-gray-600">
                  {getInitials(user.username)}
                </span>
              </div>
              <span className="text-gray-200 font-medium">{user.username}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FollowersPage({ params, searchParams }: FollowersPageProps) {
  const { userId } = use(params);
  const { tab } = use(searchParams);
  const initialTab = tab === 'following' ? 'following' : 'followers';
  
  return (
    <Suspense fallback={<div className="container mx-auto p-2">Loading...</div>}>
      <FollowersContent userId={userId} initialTab={initialTab} />
    </Suspense>
  );
}
