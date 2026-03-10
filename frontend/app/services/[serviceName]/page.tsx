'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getServiceBySlug, Service } from '@/lib/services-data';

interface ServicePageProps {
  params: Promise<{
    serviceName: string;
  }>;
}

export default function ServicePage({ params }: ServicePageProps) {
  const router = useRouter();
  // Unwrap params using React.use() for Next.js 15+ compatibility
  const { serviceName } = use(params);
  const service = getServiceBySlug(serviceName);

  if (!service) {
    return (
      <div className="container mx-auto p-2">
        <Link href="/services" className="mb-4 px-4 py-2 bg-gray-600 rounded-md inline-block hover:bg-gray-300">
          Go Back to Services
        </Link>
        <h1 className="text-center text-xl font-bold">Service not found</h1>
      </div>
    );
  }

  const handleSubserviceClick = (subservice: Service['subservices'][0]) => {
    // Navigate to the subservice page using the subservice name
    const slugName = encodeURIComponent(subservice.name.toLowerCase().replace(/\s+/g, '-'));
    router.push(`/services/${serviceName}/${slugName}`);
  };

  return (
    <div className="container mx-auto p-2">

      <h1 className="text-center text-xl font-bold mb-4">{service.name}</h1>

      {service.subservices.length === 0 ? (
        <p className="text-center text-gray-500">No subservices currently listed.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {service.subservices.map((subservice, index) => (
            <div
              key={index}
              className="flex items-center justify-center bg-gray-900 rounded-lg shadow-md p-3 cursor-pointer hover:bg-gray-700"
              onClick={() => handleSubserviceClick(subservice)}
            >
              <div className="text-center">
                <h2 className="text-3xm font-semibold mb-2 text-gray-300">{subservice.name}</h2>
                {subservice.description && (
                  <p className="text-sm text-gray-400">{subservice.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
