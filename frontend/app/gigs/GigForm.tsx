'use client';

import { useState } from 'react';
import { GigDetails } from './types';

interface GigFormProps {
  onSubmit: (data: { type: 'ride' | 'delivery'; pickup_address: string; dropoff_address: string; price: number; details: GigDetails }) => void;
  submitting: boolean;
}

export default function GigForm({ onSubmit, submitting }: GigFormProps) {
  const [formData, setFormData] = useState({
    type: 'ride' as 'ride' | 'delivery',
    pickup_address: '',
    dropoff_address: '',
    price: '',
    passengers: 1,
    passengerName: '',
    passengerContact: '',
    packageDescription: '',
    weight: '',
    fragile: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const details: GigDetails = {};
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
      pickup_address: formData.pickup_address,
      dropoff_address: formData.dropoff_address,
      price: Number(formData.price),
      details,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-bold mb-2">Type</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="ride"
              checked={formData.type === 'ride'}
              onChange={() => setFormData({ ...formData, type: 'ride' })}
              className="mr-2"
            />
            <span className="text-gray-300">Ride</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="delivery"
              checked={formData.type === 'delivery'}
              onChange={() => setFormData({ ...formData, type: 'delivery' })}
              className="mr-2"
            />
            <span className="text-gray-300">Delivery</span>
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-bold mb-2">Pickup Address</label>
        <input
          type="text"
          value={formData.pickup_address}
          onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-bold mb-2">Dropoff Address</label>
        <input
          type="text"
          value={formData.dropoff_address}
          onChange={(e) => setFormData({ ...formData, dropoff_address: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-bold mb-2">Price (₹)</label>
        <input
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          required
        />
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