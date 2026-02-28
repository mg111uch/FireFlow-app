'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RentBuyServicesPage() {
  const router = useRouter();
  
  const SubServices = [
    { id: 1, 
      name: 'Rent', 
      description: 'Rent properties, vehicles, and items.',
      communityId: 4  // ID of the Rent community in the database
    },
    { id: 2, 
      name: 'Buy', 
      description: 'Buy properties, vehicles, and items.',
      communityId: 5  // ID of the Buy community in the database
    },
  ];

  const handleServiceClick = (communityId: number) => {
    // Navigate to the community page which shows all posts in that community
    router.push(`/communities/${communityId}`);
  };

  return (
    <div className="container mx-auto p-2">
      <Link href="/services" className="mb-4 px-4 py-2 bg-gray-600 rounded-md inline-block hover:bg-gray-300">
        Go Back to Services
      </Link>

      <h1 className="text-center text-xl font-bold mb-4">Rent & Buy Services</h1>

      {SubServices.length === 0 ? (
        <p>No services currently listed.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SubServices.map((service) => (
            <div 
              key={service.id} 
              className="flex items-center justify-center bg-gray-900 rounded-lg shadow-md p-3 cursor-pointer hover:bg-gray-700"
              onClick={() => handleServiceClick(service.communityId)}
            >
              <h2 className="text-center text-3xm font-semibold mb-2 text-gray-300">{service.name}</h2>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
