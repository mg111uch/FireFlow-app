// y
import React from 'react';
import Link from 'next/link';

export default function MarriageServicesPage() {
  const SubServices = [
    { id: 1, 
      name: 'Find Bride', 
      description: 'Assistance in finding suitable brides.' },
    { id: 2, 
      name: 'Find Groom', 
      description: 'Assistance in finding suitable grooms.' },
    { id: 3, 
      name: 'Book Venue', 
      description: 'Venue selection and booking for your wedding.' },
    { id: 4, 
      name: 'Catering', 
      description: 'Professional catering services for wedding events.' },
    { id: 5, 
      name: 'Beauty Makeup', 
      description: 'Professional beauty parlour services for bride and groom.' }, 
    { id: 6, 
      name: 'Decoration', 
      description: '' }, 
    { id: 7, 
      name: 'Pandit', 
      description: '' }, 
    { id: 8, 
      name: 'Band / DJ', 
      description: '' }, 
    { id: 9, 
      name: 'Invitation Card', 
      description: '' }, 
    { id: 10, 
      name: 'Photography', 
      description: '' }, 
  ];

  return (
    <div className="container mx-auto p-2">
      <Link href="/services" className="mb-4 px-4 py-2 bg-gray-600 rounded-md inline-block hover:bg-gray-300">
        Go Back to Services
      </Link>

      <h1 className="text-center text-xl font-bold mb-4">Marriage Services</h1>

      {SubServices.length === 0 ? (
        <p>No services currently listed.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SubServices.map((service) => (
            <div key={service.id} className="flex items-center justify-center bg-gray-900 rounded-lg shadow-md p-3">
              <h2 className="text-center text-3xm font-semibold mb-2 text-gray-300">{service.name}</h2>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}