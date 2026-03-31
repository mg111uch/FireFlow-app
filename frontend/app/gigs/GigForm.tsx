'use client';

import { useState, useEffect, useMemo } from 'react';
import { GigDetails } from './types';
import { useAuth } from '@/context/AuthContext';
import Tabs from '@/components/ui/Tabs';
import { calculatePrice } from './calculatePrice';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
}

interface GigFormProps {
  onSubmit: (data: { type: 'ride' | 'delivery'; vehicle_type?: string; pickup_address: string; dropoff_address: string; distance?: string; price: number; details: GigDetails }) => void;
  submitting: boolean;
  isAdmin?: boolean;
}

const STORAGE_KEY = 'savedAddresses';

const typeTabs = [
  { label: 'Ride', value: 'ride' },
  { label: 'Delivery', value: 'delivery' },
];

interface AddressFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  showDropdown: boolean;
  setShowDropdown: any;
  saveChecked: boolean;
  setSaveChecked: any;
  isPickup: boolean;
  savedAddresses: SavedAddress[];
  onSelectAddress: (address: string, isPickup: boolean) => void;
}

function AddressField({ label, value, onChange, showDropdown, setShowDropdown, saveChecked, setSaveChecked, isPickup, savedAddresses, onSelectAddress }: AddressFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-gray-300 text-sm font-bold mb-2">{label}</label>
      <div className="relative">
        <div className="flex">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            required
          />
          {savedAddresses.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 py-2 bg-gray-700 text-white border border-l-0 border-gray-600 hover:bg-gray-600 rounded-r"
              title="Saved addresses"
            >
              ▼
            </button>
          )}
        </div>
        {showDropdown && savedAddresses.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded border border-gray-600 max-h-40 overflow-y-auto">
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => {
                  onSelectAddress(addr.address, isPickup);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-gray-600 border-b border-gray-600 last:border-b-0"
              >
                {addr.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <label className="flex items-center mt-2">
        <input
          type="checkbox"
          checked={saveChecked}
          onChange={(e) => setSaveChecked(e.target.checked)}
          className="mr-2"
        />
        <span className="text-gray-400 text-sm">Save this address</span>
      </label>
    </div>
  );
}

export default function GigForm({ onSubmit, submitting, isAdmin = false }: GigFormProps) {
  const { isAdmin: contextIsAdmin } = useAuth();
  const isUserAdmin = isAdmin || contextIsAdmin;
  
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);
  const [formData, setFormData] = useState({
    type: 'ride' as 'ride' | 'delivery',
    vehicle_type: 'Bike-Taxi',
    pickup_address: '',
    dropoff_address: '',
    distance: '',
    passengers: 1,
    passengerName: '',
    passengerContact: '',
    packageDescription: '',
    weight: '',
    fragile: false,
  });
  const [savePickup, setSavePickup] = useState(false);
  const [saveDropoff, setSaveDropoff] = useState(false);

  const calculatedPrice = useMemo(() => {
    const distance = isUserAdmin ? parseFloat(formData.distance) : 8;
    if (!distance || distance <= 0) return 0;
    return calculatePrice({
      type: formData.type,
      vehicle_type: formData.vehicle_type,
      distance,
      passengers: formData.passengers,
    });
  }, [formData.type, formData.vehicle_type, formData.distance, formData.passengers, isUserAdmin]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSavedAddresses(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      vehicle_type: prev.type === 'ride' ? 'Bike-Taxi' : 'Bike',
    }));
  }, [formData.type]);

  const saveAddressToStorage = (address: string, isPickup: boolean) => {
    const existing = savedAddresses.find(a => a.address.toLowerCase() === address.toLowerCase());
    if (existing) return;

    const newAddress: SavedAddress = {
      id: Date.now().toString(),
      label: address.length > 30 ? address.substring(0, 30) + '...' : address,
      address,
    };
    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const selectSavedAddress = (address: string, isPickup: boolean) => {
    if (isPickup) {
      setFormData({ ...formData, pickup_address: address });
      setShowPickupDropdown(false);
    } else {
      setFormData({ ...formData, dropoff_address: address });
      setShowDropoffDropdown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (savePickup && formData.pickup_address.trim()) {
      saveAddressToStorage(formData.pickup_address.trim(), true);
    }
    if (saveDropoff && formData.dropoff_address.trim()) {
      saveAddressToStorage(formData.dropoff_address.trim(), false);
    }

    const details: GigDetails = { vehicle_type: formData.vehicle_type };
    if (formData.type === 'ride') {
      details.passengers = formData.passengers;
      details.passengerName = formData.passengerName;
      details.passengerContact = formData.passengerContact;
    } else {
      details.packageDescription = formData.packageDescription;
      details.weight = formData.weight;
      details.fragile = formData.fragile;
    }

    onSubmit({
      type: formData.type,
      vehicle_type: formData.vehicle_type,
      pickup_address: formData.pickup_address,
      dropoff_address: formData.dropoff_address,
      distance: isUserAdmin ? formData.distance : '8',
      price: calculatedPrice,
      details,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <Tabs
          key="type-tabs"
          tabs={typeTabs}
          activeTab={formData.type}
          onChange={(value) => setFormData({ ...formData, type: value as 'ride' | 'delivery' })}
        />
      </div>

      <AddressField
        label="Pickup Address"
        value={formData.pickup_address}
        onChange={(v) => setFormData({ ...formData, pickup_address: v })}
        showDropdown={showPickupDropdown}
        setShowDropdown={setShowPickupDropdown as any}
        saveChecked={savePickup}
        setSaveChecked={setSavePickup as any}
        isPickup={true}
        savedAddresses={savedAddresses}
        onSelectAddress={selectSavedAddress}
      />

      <AddressField
        label="Dropoff Address"
        value={formData.dropoff_address}
        onChange={(v) => setFormData({ ...formData, dropoff_address: v })}
        showDropdown={showDropoffDropdown}
        setShowDropdown={setShowDropoffDropdown as any}
        saveChecked={saveDropoff}
        setSaveChecked={setSaveDropoff as any}
        isPickup={false}
        savedAddresses={savedAddresses}
        onSelectAddress={selectSavedAddress}
      />

      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-bold mb-2">Distance (km)</label>
        {isUserAdmin ? (
          <input
            type="number"
            value={formData.distance}
            onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="Enter distance in km"
          />
        ) : (
          <div className="px-3 py-2 bg-gray-600 text-white rounded border border-gray-600">
            8 km (fixed)
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-bold mb-2">Vehicle Options</label>
        <select
          value={formData.vehicle_type}
          onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          {formData.type === 'ride' ? (
            <>
              <option value="Bike-Taxi">Bike-Taxi</option>
              <option value="Auto">Auto</option>
              <option value="Cab Economy">Cab Economy</option>
              <option value="Cab Premium">Cab Premium</option>
            </>
          ) : (
            <>
              <option value="Bike">Bike</option>
              <option value="Mini-Loader">Mini-Loader</option>
              <option value="Tempo">Tempo</option>
              <option value="Truck">Truck</option>
            </>
          )}
        </select>
      </div>

      {formData.type === 'ride' ? (
        <>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">Number of Passengers</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.passengers}
              onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">Passenger Name</label>
            <input
              type="text"
              value={formData.passengerName}
              onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">Passenger Contact</label>
            <input
              type="text"
              value={formData.passengerContact}
              onChange={(e) => setFormData({ ...formData, passengerContact: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">Package Description</label>
            <textarea
              value={formData.packageDescription}
              onChange={(e) => setFormData({ ...formData, packageDescription: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">Weight (optional)</label>
            <input
              type="text"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.fragile}
                onChange={(e) => setFormData({ ...formData, fragile: e.target.checked })}
                className="mr-2"
              />
              <span className="text-gray-300">Fragile</span>
            </label>
          </div>
        </>
      )}

      <div className="mb-4 p-4 bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-300 font-semibold">Estimated Price</span>
          <span className="text-2xl font-bold text-green-400">₹{calculatedPrice}</span>
        </div>
        {formData.distance && (
          <p className="text-sm text-gray-400 mt-1">
            Based on {formData.distance}km • {formData.vehicle_type}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Post Gig'}
      </button>
    </form>
  );
}