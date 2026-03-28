'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';
import Snackbar from '@/components/ui/Snackbar';

interface UserProfile {
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  adhar_card_no: string | null;
  pan_card_no: string | null;
  driving_licence: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    location: '',
    city: '',
    state: '',
    country: '',
    website: '',
    phone: '',
    adhar_card_no: '',
    pan_card_no: '',
    driving_licence: '',
    date_of_birth: '',
    gender: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
        setFormData({
          display_name: res.data.display_name || '',
          bio: res.data.bio || '',
          avatar_url: res.data.avatar_url || '',
          location: res.data.location || '',
          city: res.data.city || '',
          state: res.data.state || '',
          country: res.data.country || '',
          website: res.data.website || '',
          phone: res.data.phone || '',
          adhar_card_no: res.data.adhar_card_no || '',
          pan_card_no: res.data.pan_card_no || '',
          driving_licence: res.data.driving_licence || '',
          date_of_birth: res.data.date_of_birth || '',
          gender: res.data.gender || '',
        });
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.response?.data?.error || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/api/users/me/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowSnackbar(true);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading profile...</div>;
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto p-4">
        <button onClick={() => router.back()} className="bg-gray-600 text-white mb-4 px-4 py-2 rounded-md">
          Go Back
        </button>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">

      <h1 className="text-2xl font-bold mb-6">My Account Details</h1>

      {profile && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <p className="text-gray-400">Username: <span className="text-white">{profile.username}</span></p>
          <p className="text-gray-400">Email: <span className="text-white">{profile.email}</span></p>
        </div>
      )}

      {error && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-500/20 text-green-400 p-3 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-1">Display Name</label>
          <input
            type="text"
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter your display name"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Tell us about yourself"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Avatar URL</label>
          <input
            type="url"
            name="avatar_url"
            value={formData.avatar_url}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter your location"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter your city"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter your state"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter your country"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Website</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="https://yourwebsite.com"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Aadhar Card No</label>
          <input
            type="text"
            name="adhar_card_no"
            value={formData.adhar_card_no}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter Aadhar card number"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Pan Card No</label>
          <input
            type="text"
            name="pan_card_no"
            value={formData.pan_card_no}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter Pan card number"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Driving Licence</label>
          <input
            type="text"
            name="driving_licence"
            value={formData.driving_licence}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="Enter driving licence number"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Date of Birth</label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Gender</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <Snackbar
        message="Settings saved successfully!"
        isVisible={showSnackbar}
        onClose={() => setShowSnackbar(false)}
      />
    </div>
  );
}