'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { getServiceBySlug } from '@/lib/services-data';
import { FormSubmission } from '@/lib/types';
import ResponsesCard from '@/app/services/ResponsesCard';
import { API_URL } from '@/lib/config';

interface SubservicePageProps {
  params: Promise<{
    serviceName: string;
    subserviceName: string;
  }>;
}

export default function SubservicePage({ params }: SubservicePageProps) {
  const router = useRouter();
  // Unwrap params using React.use() for Next.js 15+ compatibility
  const { serviceName, subserviceName } = use(params);
  
  const service = getServiceBySlug(serviceName);
  
  // Find the specific subservice by name (decode URI component for special characters)
  const subservice = service?.subservices.find(
    (s) => s.name.toLowerCase() === decodeURIComponent(subserviceName).toLowerCase()
  );

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [formId, setFormId] = useState<number | null>(null);
  const [loadingFormId, setLoadingFormId] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('formSubmitted') === '1') {
      setToast({ type: 'success', message: 'Form submitted and payment verified!' });
      // Remove the query flag while staying on the page
      const cleanPath = window.location.pathname;
      window.history.replaceState({}, '', cleanPath);
    }
  }, [searchParams]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!subservice) return;

    // Fetch the formId dynamically from backend based on service/subservice
    const fetchFormId = async () => {
      setLoadingFormId(true);
      try {
        const res = await axios.get(`${API_URL}/api/forms/service/${serviceName}/${subserviceName}`);
        if (res.data && res.data.id) {
          setFormId(res.data.id);
        }
      } catch (err: any) {
        console.log('No service form found for this subservice');
        setFormId(null);
      } finally {
        setLoadingFormId(false);
      }
    };

    fetchFormId();
  }, [serviceName, subserviceName, subservice]);

  useEffect(() => {
    if (!subservice || !formId) return;

     const fetchSubmissions = async () => {
         setLoadingSubmissions(true);
         try {
           // Use public endpoint - no auth required
           const res = await axios.get(`${API_URL}/api/forms/${formId}/submissions/public`);
           // Sort newest first (highest ID = latest)
           const sorted = (res.data as Array<FormSubmission & { id: number }>)
             .sort((a, b) => b.id - a.id);
           setSubmissions(sorted);
         } catch (err: any) {
           console.error('Error fetching submissions:', err);
           setSubmissions([]);
         } finally {
           setLoadingSubmissions(false);
         }
       };

    fetchSubmissions();
  }, [subservice, formId]);

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

  if (!subservice) {
    return (
      <div className="container mx-auto p-2">
        <Link href={`/services/${serviceName}`} className="mb-4 px-4 py-2 bg-gray-600 rounded-md inline-block hover:bg-gray-300">
          Go Back to {service.name}
        </Link>
        <h1 className="text-center text-xl font-bold">Subservice not found</h1>
      </div>
    );
  }

  const handleAddService = () => {
    if (formId) {
      router.push(`/services/forms/${formId}/fill?returnUrl=/services/${serviceName}/${subserviceName}`);
    } else {
      alert('No service form available for this subservice. Please contact the administrator.');
    }
  };

  const showAddButton = !loadingFormId && formId !== null;

  return (
    <div className="container mx-auto">

      <div className="flex justify-between items-center mb-2 mt-2 pr-2 pl-2">
        <h1 className="text-xl font-bold">{subservice.name}</h1>
        {showAddButton && (
          <button
            onClick={handleAddService}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Add Service
          </button>
        )}
        {!loadingFormId && !formId && (
          <span className="text-gray-400 text-sm">No service form available</span>
        )}
      </div>

      {subservice.description && (
        <p className="text-gray-400 mb-2 pr-2 pl-2">{subservice.description}</p>
      )}  

      {loadingSubmissions ? (
        <p className="text-center text-gray-500">Loading submissions...</p>
      ) : submissions.length > 0 ? (
        <ResponsesCard submissions={submissions} showHeader={true} title="Service Listings" />
      ) : (
        <>
          <p className="text-center text-gray-500">Add your own to get started.</p>
          <p className="text-center text-gray-500">No services listed yet.</p>
        </>
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}
      
    </div>
  );
}
