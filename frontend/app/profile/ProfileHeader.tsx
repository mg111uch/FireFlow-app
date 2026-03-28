'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserDetails } from '../../lib/types';
import { formatMemberSince, getInitials } from '../../lib/utils';
import { MailIcon } from '../../lib/icons';
import { API_URL } from '@/lib/config';

interface ProfileHeaderProps {
  user: UserDetails;
  followerCount: number;
  followingCount: number;
  currentUserId?: number | null;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
}

export default function ProfileHeader({
  user,
  followerCount,
  followingCount,
  currentUserId,
  isFollowing,
  onFollowToggle
}: ProfileHeaderProps) {
  const router = useRouter();
  const isOwnProfile = currentUserId === user.id;

  const getStateAbbreviation = (state: string | null | undefined) => {
    if (!state) return '';
    const words = state.trim().split(/\s+/);
    if (words.length >= 2) {
      return words.map(word => word[0]).join('').toUpperCase();
    }
    return state.slice(0, 3).toUpperCase();
  };

  const stateCode = getStateAbbreviation(user.state);

  return (
    <div className="bg-gray-700 space-y-2 rounded-lg shadow-md p-3 m-1 relative">
      {user.country && (
        <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs px-2 py-1 rounded">
          {stateCode ? `${stateCode}-` : ''}{user.country.slice(0, 3).toUpperCase()}
        </div>
      )}
      <div className="flex space-x-1">
        <div className="relative inline-flex items-center justify-center w-10 h-10 overflow-hidden bg-gray-300 rounded-full">
          {user.profile_img_url ? (
            <img 
              src={`${API_URL}/api-uploads${user.profile_img_url}`} 
              alt={user.username} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className="font-medium text-gray-600">
              {getInitials(user.username)}
            </span>
          )}
        </div>
        <div>
          <p className="text-2xl text-gray-300 font-semibold ml-2">{user.username}</p>
          {user.display_name && (
            <p className="text-sm text-gray-400 ml-2">{user.display_name}</p>
          )}
        </div>
      </div>
      
      <div className="flex space-x-1">
        <MailIcon />
        <p className="text-gray-200 "> {user.email}</p>
      </div>

      <div className="flex space-x-1">
        <p className="text-gray-300 font-semibold">Member Since :</p>
        <p className="text-gray-200 ">{formatMemberSince(user.created_at)}</p>
      </div>

      {user.bio && (
        <div className="text-gray-300 text-sm mt-1">
          {user.bio}
        </div>
      )}

      {/* Display follower and following counts */}
      <div className="w-full flex justify-between items-center space-x-2 text-gray-200">
        <Link href={`/profile/${user.id}/followers?tab=followers`} className="hover:underline">
          <p>
            <span className="font-semibold">{followerCount}</span> Followers
          </p>
        </Link>
        <Link href={`/profile/${user.id}/followers?tab=following`} className="hover:underline">
          <p>
            <span className="font-semibold">{followingCount}</span> Following
          </p>
        </Link>
        {!isOwnProfile && (
          <button
            onClick={() => router.push(`/chats/${user.id}`)}
            className="border border-gray-500 text-gray-300 bg-gray-700 text-sm px-3 py-1 rounded-md"
          >
            Message
          </button>
        )}
      </div>

      {/* Follow/Unfollow button */}
      {!isOwnProfile && onFollowToggle && (
        <button
          onClick={onFollowToggle}
          className={`w-full border ${isFollowing ? 'border-gray-500 text-gray-300 bg-gray-700' : 'border-purple-700 text-white'} text-sm px-3 py-1 rounded-md`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}
