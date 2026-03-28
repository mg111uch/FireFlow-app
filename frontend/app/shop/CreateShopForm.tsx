'use client';

import { useState } from 'react';

interface CreateShopFormProps {
  onCreate: (name: string, desc: string) => void;
}

export default function CreateShopForm({ onCreate }: CreateShopFormProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Create Your Shop</h2>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Shop Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700" placeholder="My Awesome Store" />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700" rows={3} placeholder="Tell customers about your shop..." />
      </div>
      <button onClick={() => name && onCreate(name, desc)} className="bg-blue-600 px-6 py-2 rounded text-white">Create Shop</button>
    </div>
  );
}