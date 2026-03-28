'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Tabs from '@/components/ui/Tabs';
import GigCard from './GigCard';
import GigForm from './GigForm';
import { useGigs } from './useGigs';

export default function GigsPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('available');
  const [myGigsTab, setMyGigsTab] = useState('open');
  const [submitting, setSubmitting] = useState(false);

  const {
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
    createGig,
  } = useGigs(token);

  const myGigsSubTabs = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'Open', value: 'open' },
    { label: 'Completed', value: 'completed' },
  ];

  const openGigs = useMemo(() => myGigs.filter(g => g.status === 'open' || g.status === 'accepted'), [myGigs]);
  const completedGigs = useMemo(() => myGigs.filter(g => g.status === 'completed'), [myGigs]);
  const totalEarnings = useMemo(() => completedGigs.reduce((sum, g) => sum + g.price, 0), [completedGigs]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableGigs();
    } else if (activeTab === 'my') {
      fetchMyGigs();
    }
  }, [activeTab, fetchAvailableGigs, fetchMyGigs]);

  const handleSubmit = async (data: Parameters<typeof createGig>[0]) => {
    setSubmitting(true);
    const success = await createGig(data);
    setSubmitting(false);
    if (success) {
      setActiveTab('my');
    }
  };

  return (
    <div className="container mx-auto p-2">

      <Tabs
        tabs={[
          { label: 'Available Gigs', value: 'available' },
          { label: 'My Gigs', value: 'my' },
          { label: 'Post Gig', value: 'post' },
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value)}
      />

      {error && (
        <div className="bg-red-500 text-white p-2 rounded mb-3 text-sm">{error}</div>
      )}

      {activeTab === 'available' && (
        <div>
          {loading ? (
            <p className="text-center text-gray-400">Loading...</p>
          ) : gigs.length === 0 ? (
            <p className="text-center text-gray-400">No gigs available</p>
          ) : (
            gigs.map((gig) => (
              <GigCard
                key={gig.id}
                gig={gig}
                showActions
                onAccept={acceptGig}
                onComplete={completeGig}
                onCancel={cancelGig}
                onReset={resetGig}
                onDelete={deleteGig}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'my' && (
        <div>
          <Tabs
            tabs={myGigsSubTabs}
            activeTab={myGigsTab}
            onChange={(value) => setMyGigsTab(value)}
          />

          {myGigsTab === 'dashboard' && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Total Earnings</h3>
              <p className="text-3xl font-bold text-green-400">₹{totalEarnings}</p>
              <p className="text-sm text-gray-400 mt-2">{completedGigs.length} completed gig(s)</p>
            </div>
          )}

          {myGigsTab === 'open' && (
            <div>
              {openGigs.length === 0 ? (
                <p className="text-center text-gray-400 mt-4">No open gigs</p>
              ) : (
                openGigs.map((gig) => (
                  <GigCard
                    key={gig.id}
                    gig={gig}
                    showActions
                    onAccept={acceptGig}
                    onComplete={completeGig}
                    onCancel={cancelGig}
                    onReset={resetGig}
                    onDelete={deleteGig}
                  />
                ))
              )}
            </div>
          )}

          {myGigsTab === 'completed' && (
            <div>
              {completedGigs.length === 0 ? (
                <p className="text-center text-gray-400 mt-4">No completed gigs</p>
              ) : (
                completedGigs.map((gig) => (
                  <GigCard
                    key={gig.id}
                    gig={gig}
                    onReset={resetGig}
                    onDelete={deleteGig}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'post' && (
        <GigForm onSubmit={handleSubmit} submitting={submitting} />
      )}
    </div>
  );
}