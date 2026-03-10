'use client';

import axios from 'axios';
import { Service, SubService } from '../../lib/services-data';

interface ServiceSelectorProps {
  selectedService: Service | null;
  selectedSubservice: SubService | null;
  setSelectedService: React.Dispatch<React.SetStateAction<Service | null>>;
  setSelectedSubservice: React.Dispatch<React.SetStateAction<SubService | null>>;
  setExistingFormId: React.Dispatch<React.SetStateAction<number | null>>;
  setFormTitle: React.Dispatch<React.SetStateAction<string>>;
  setFormDescription: React.Dispatch<React.SetStateAction<string>>;
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  setFormType: React.Dispatch<React.SetStateAction<'general' | 'service'>>;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  services: Service[];
}

export default function ServiceSelector({
  selectedService,
  selectedSubservice,
  setSelectedService,
  setSelectedSubservice,
  setExistingFormId,
  setFormTitle,
  setFormDescription,
  setQuestions,
  setFormType,
  setEditMode,
  setLoading,
  loading,
  services,
}: ServiceSelectorProps) {
  
  const handleCheckExisting = async () => {
    if (!selectedService || !selectedSubservice) return;
    
    const APP_URL = process.env.NEXT_PUBLIC_URL;
    setLoading(true);
    try {
      const res = await axios.get(
        `${APP_URL}/api/forms/service/${selectedService.slug}/${selectedSubservice.name}`
      );
      const form = res.data;
      setExistingFormId(form.id);
      setFormTitle(form.title || '');
      setFormDescription(form.description || '');
      
      // Fetch questions with options
      const questionsRes = await axios.get(`${APP_URL}/api/forms/${form.id}`);
      setQuestions(questionsRes.data.questions || []);
      
      setFormType('service');
      setEditMode(true);
      alert('Service form found! You can now edit or delete it.');
    } catch (err: any) {
      if (err.response?.status === 404) {
        alert('No form exists for this service yet. You can create a new one.');
        setEditMode(false);
        setExistingFormId(null);
        setFormTitle('');
        setFormDescription('');
        setQuestions([]);
      } else {
        console.error('Error fetching service form:', err);
        alert('Failed to check for existing service form.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 bg-gray-900">
      <div className="mb-3">
        <label htmlFor="serviceSelect" className="block text-gray-300 font-bold mb-2">Select Service:</label>
        <select
          id="serviceSelect"
          value={selectedService?.slug || ''}
          onChange={(e) => {
            const service = services.find(s => s.slug === e.target.value);
            setSelectedService(service || null);
            setSelectedSubservice(null);
          }}
          className="border p-2 w-full rounded-md text-gray-300 bg-gray-700"
        >
          <option value="">-- Select a Service --</option>
          {services.map(service => (
            <option key={service.id} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedService && selectedService.subservices.length > 0 && (
        <div className="mb-3">
          <label htmlFor="subserviceSelect" className="block text-gray-300 font-bold mb-2">Select Subservice:</label>
          <select
            id="subserviceSelect"
            value={selectedSubservice?.name || ''}
            onChange={(e) => {
              const subservice = selectedService.subservices.find(s => s.name === e.target.value);
              setSelectedSubservice(subservice || null);
            }}
            className="border p-2 w-full rounded-md text-gray-300 bg-gray-700"
          >
            <option value="">-- Select a Subservice --</option>
            {selectedService.subservices.map(subservice => (
              <option key={subservice.id} value={subservice.name}>
                {subservice.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {selectedService && selectedService.subservices.length === 0 && (
        <p className="text-yellow-400 text-sm">This service has no subservices defined.</p>
      )}

      {/* Check for existing service form */}
      {selectedService && selectedSubservice && (
        <button
          type="button"
          onClick={handleCheckExisting}
          className="bg-blue-500 text-white px-4 py-2 rounded-md mt-2"
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Existing Service Form'}
        </button>
      )}
    </div>
  );
}
