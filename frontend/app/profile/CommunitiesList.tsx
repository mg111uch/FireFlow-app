'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Community } from '../../lib/types';

const APP_URL = process.env.NEXT_PUBLIC_URL;

interface CommunitiesListProps {
  communities?: Community[];
  joinedCommunities: Community[];
  currentUserId: number;
  token?: string;
  onCommunityJoined?: (community: Community) => void;
  onCommunityLeft?: (communityId: number) => void;
  onCommunityDeleted?: (communityId: number) => void;
  onCommunityCreated?: (community: Community) => void;
  showAllCommunities?: boolean;
  showCreateCommunity?: boolean;
  emptyMessage?: string;
}

export default function CommunitiesList({
  communities,
  joinedCommunities,
  currentUserId,
  token,
  onCommunityJoined,
  onCommunityLeft,
  onCommunityDeleted,
  onCommunityCreated,
  showAllCommunities = false,
  showCreateCommunity = false,
  emptyMessage = "No communities joined yet."
}: CommunitiesListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const displayCommunities = showAllCommunities && communities ? communities : joinedCommunities;

  const handleJoin = async (communityId: number) => {
    if (!token) return;
    try {
      const res = await axios.post(`${APP_URL}/api/communities/${communityId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.joined && onCommunityJoined) {
        const communityToJoin = communities?.find(c => c.id === communityId);
        if (communityToJoin) {
          onCommunityJoined(communityToJoin);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'An error occurred while trying to join.');
    }
  };

  const handleUnJoin = async (communityId: number) => {
    if (!token) return;
    try {
      const res = await axios.post(`${APP_URL}/api/communities/${communityId}/unjoin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.unjoined && onCommunityLeft) {
        onCommunityLeft(communityId);
      } else {
        alert(res.data.message || 'Could not unjoin community.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'An error occurred while trying to unjoin.');
    }
  };

  const handleDelete = async (communityId: number, communityName: string) => {
    if (!token) return;
    if (window.confirm(`Are you sure you want to delete the community "${communityName}"? This action cannot be undone and all posts within it will be deleted.`)) {
      try {
        await axios.delete(`${APP_URL}/api/communities/${communityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Community deleted successfully!');
        if (onCommunityDeleted) {
          onCommunityDeleted(communityId);
        }
      } catch (err: any) {
        console.error('Error deleting community:', err);
        alert(err.response?.data?.error || 'Failed to delete community.');
      }
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsCreating(true);
    try {
      const res = await axios.post(`${APP_URL}/api/communities`,
        { name: newCommunityName, description: newCommunityDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onCommunityCreated) {
        onCommunityCreated(res.data);
      }
      setNewCommunityName('');
      setNewCommunityDescription('');
      setShowCreateForm(false);
    } catch (err: any) {
      alert('Failed to create community. The name may already be taken.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const isJoined = (communityId: number) => {
    return joinedCommunities.some(joinComm => joinComm.id === communityId);
  };

  return (
    <div>
      {/* Create Community Button and Form */}
      {showCreateCommunity && (
        <>
          {!showCreateForm && 
            <div className="p-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full items-center justify-center bg-gray-600 rounded-full shadow-md"
            >
              <h2 className="text-center text-3xm font-semibold mb-2 text-gray-300 mt-2">
                + Create a community
              </h2>              
            </button>
            </div>
          }

          {showCreateForm && (
            <form onSubmit={handleCreateCommunity} className="mb-2 p-2">
              <input
                type="text"
                value={newCommunityName}
                onChange={(e) => setNewCommunityName(e.target.value)}
                placeholder="Community name"
                className="shadow appearance-none border rounded w-full mb-4 py-2 px-3 text-gray-300 leading-tight"
                required
              />
              <textarea
                value={newCommunityDescription}
                onChange={(e) => setNewCommunityDescription(e.target.value)}
                placeholder="Community description"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-300 leading-tight h-32 resize-none"
              />
              <div className="flex space-x-4 justify-center mt-2">
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="bg-blue-500 text-white p-2 mt-2 rounded-md disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Community'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-500 text-white p-2 mt-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Communities List */}
      {displayCommunities.length === 0 ? (
        <div className="bg-gray-900 p-2">
          <p className="text-gray-400 text-center">{emptyMessage}</p>
        </div>
      ) : (
        <div className="bg-gray-900 p-2">
          <ul>
            {displayCommunities.map((community) => (
              <li key={community.id} className="border-b border-gray-700 py-2 last:border-b-0">
                <div className="flex justify-between items-start">
                  <Link href={`/communities/${community.id}`} className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-500">{community.name}</h3>
                  </Link>
                  
                  {/* Show actions only if token is provided */}
                  {token && (
                    <div className="ml-2">
                      {community.creator_id === currentUserId ? (
                        <button
                          className="bg-gray-500 text-white p-1 rounded-md text-sm"
                          disabled
                        >
                          Admin
                        </button>
                      ) : isJoined(community.id) ? (
                        <button
                          onClick={() => handleUnJoin(community.id)}
                          className="bg-green-700 text-white p-1 rounded-md text-sm"
                        >
                          Joined
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoin(community.id)}
                          className="bg-blue-500 text-white p-1 rounded-md text-sm"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-gray-300">{community.description}</p>

                {/* Show edit/delete buttons for community creator */}
                {token && onCommunityDeleted && community.creator_id === currentUserId && (
                  <div className="flex space-x-4 justify-center mt-2">
                    <Link href={`/edit-community/${community.id}`}>
                      <button className="border border-blue-500 text-white text-sm px-3 py-1 rounded-md">
                        Edit Details
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(community.id, community.name)}
                      className="border border-red-700 text-white text-sm px-3 py-1 rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
