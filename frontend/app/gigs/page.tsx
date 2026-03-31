'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import Tabs from '@/components/ui/Tabs';
import GigCard from './GigCard';
import GigForm from './GigForm';
import { useGigs } from './useGigs';

export default function GigsPage() {
  const { isAuthenticated, isAdmin, token, currentUser } = useAuth();
  const socket = useSocket();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('available');
  const [myGigsTab, setMyGigsTab] = useState('open');
  const [submitting, setSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

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
    payGig,
    createGig,
  } = useGigs(token, socket, currentUser);

  useEffect(() => {
    const saved = localStorage.getItem('gigFilters');
    if (saved) {
      const { type, vehicle } = JSON.parse(saved);
      setTypeFilter(type || 'all');
      setVehicleFilter(vehicle || 'all');
    }
  }, []);

  const myGigsSubTabs = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'Open', value: 'open' },
    { label: 'Completed', value: 'completed' },
  ];

  const openGigs = useMemo(() => myGigs.filter(g => g.status === 'accepted'), [myGigs]);
  const completedGigs = useMemo(() => myGigs.filter(g => g.status === 'completed'), [myGigs]);
  
  const { totalSpending, totalEarnings } = useMemo(() => {
    const userId = currentUser?.id;
    let spending = 0;
    let earnings = 0;
    
    for (const gig of completedGigs) {
      if (gig.user_id === userId) {
        spending += gig.price;
      }
      if (gig.driver_id === userId) {
        earnings += gig.payout_price || gig.price;
      }
    }
    
    return { totalSpending: spending, totalEarnings: earnings };
  }, [completedGigs, currentUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableGigs({ type: typeFilter, vehicle_type: vehicleFilter });
    } else if (activeTab === 'my') {
      fetchMyGigs();
    }
  }, [activeTab, typeFilter, vehicleFilter]);

  const handleFilterChange = (newType: string, newVehicle: string) => {
    setTypeFilter(newType);
    setVehicleFilter(newVehicle);
  };

  const saveFilterPreferences = () => {
    localStorage.setItem('gigFilters', JSON.stringify({ type: typeFilter, vehicle: vehicleFilter }));
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setVehicleFilter('all');
  };

  const getVehicleOptions = (type: string) => {
    if (type === 'ride') {
      return ['Bike-Taxi', 'Auto', 'Cab Economy', 'Cab Premium'];
    } else if (type === 'delivery') {
      return ['Bike', 'Mini-Loader', 'Tempo', 'Truck'];
    }
    return ['Bike-Taxi', 'Auto', 'Cab Economy', 'Cab Premium', 'Bike', 'Mini-Loader', 'Tempo', 'Truck'];
  };

  const handleAccept = async (gigId: number) => {
    setActiveTab('my');
    setMyGigsTab('open');
    await acceptGig(gigId);
  };

  const handleReset = async (gigId: number) => {
    setActiveTab('available');
    await resetGig(gigId);
    fetchAvailableGigs({ type: typeFilter, vehicle_type: vehicleFilter });
  };

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
          { label: 'Book Gig', value: 'post' },
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value)}
      />

      {error && (
        <div className="bg-red-500 text-white p-2 rounded mb-3 text-sm">{error}</div>
      )}

      {activeTab === 'available' && (
        <div>
          <div className="mb-4 p-4 bg-gray-800 rounded-lg">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-gray-400 text-sm mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => handleFilterChange(e.target.value, vehicleFilter)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="all">All</option>
                  <option value="ride">Ride</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-gray-400 text-sm mb-1">Vehicle</label>
                <select
                  value={vehicleFilter}
                  onChange={(e) => handleFilterChange(typeFilter, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="all">All</option>
                  {getVehicleOptions(typeFilter).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveFilterPreferences}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  Save Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
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
                isAdmin={isAdmin}
                onAccept={handleAccept}
                onComplete={completeGig}
                onCancel={cancelGig}
                onReset={handleReset}
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
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Total Spending</h3>
                <p className="text-3xl font-bold text-blue-500">₹{totalSpending}</p>
                <p className="text-sm text-gray-400 mt-2">{completedGigs.filter(g => g.user_id === currentUser?.id).length} completed gig(s) as poster</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Total Earnings</h3>
                <p className="text-3xl font-bold text-green-400">₹{totalEarnings}</p>
                <p className="text-sm text-gray-400 mt-2">{completedGigs.filter(g => g.driver_id === currentUser?.id).length} completed gig(s) as driver</p>
              </div>
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
                    isAdmin={isAdmin}
                    onAccept={acceptGig}
                    onComplete={completeGig}
                    onCancel={cancelGig}
                    onReset={handleReset}
                    onDelete={deleteGig}
                    onPay={payGig}
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
                    showActions
                    isAdmin={isAdmin}
                    onReset={handleReset}
                    onDelete={deleteGig}
                    onPay={payGig}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'post' && (
        <GigForm onSubmit={handleSubmit} submitting={submitting} isAdmin={isAdmin} />
      )}
    </div>
  );
}