'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { services } from '@/lib/services-data';
import ShortcutBar from './ShortcutBar';
import ShortcutSettings from './ShortcutSettings';
import { ShortcutsProvider } from './ShortcutsContext';

export default function ServicesPage() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <ShortcutsProvider>
      <div className="container mx-auto p-2">

        <h1 className="text-center text-xl text-gray-400 font-bold mb-3">Add your Service to start earning.</h1>

        {services.length === 0 ? (
          <p>No services currently available.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {services.map((service) => (
              <Link href={`/services/${service.slug}`} key={service.id} className="block group">
                <div className="flex items-center justify-center bg-gray-900 rounded-lg shadow-md p-2">
                  <h2 className="text-center text-3xm font-semibold mb-2 text-gray-300">{service.name}</h2>
                </div>
              </Link>
            ))}          
          </div>        
        )}

        <ShortcutBar onEditClick={() => setShowSettings(true)} />

        <ShortcutSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </ShortcutsProvider>
  );
}