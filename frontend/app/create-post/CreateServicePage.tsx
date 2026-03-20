'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { FormQuestion } from '../../lib/types';
import { services, Service, SubService } from '../../lib/services-data';
import { useAuth } from '@/context/AuthContext';
import Tabs from '@/components/ui/Tabs';
import ServiceSelector from './ServiceSelector';
import QuestionEditor from './QuestionEditor';
import FormPreview from './FormPreview';

const APP_URL = process.env.NEXT_PUBLIC_URL;

// Define admin user IDs who can create service forms
const ADMIN_USER_IDS = [1]; // Add admin user IDs here

export default function CreateServicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Check if current user is admin
  const isAdmin = currentUser && ADMIN_USER_IDS.includes(currentUser.id);
  
  // Form type selection: 'general' or 'service' (only shown for admins)
  const [formType, setFormType] = useState<'general' | 'service'>('general');
  
  // Service form specific fields
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSubservice, setSelectedSubservice] = useState<SubService | null>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [existingFormId, setExistingFormId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to create a service.');
      setLoading(false);
      return;
    }

    if (questions.length === 0) {
      setError('Please add at least one field.');
      setLoading(false);
      return;
    }
    
    // Title is required for general forms, optional for service forms
    if (formType === 'general' && !formTitle.trim()) {
      setError('Form title is required for general forms.');
      setLoading(false);
      return;
    }
    
    // Basic validation for questions and options
    for (const q of questions) {
      if (!q.question_text.trim()) {
        setError('All fields must have text.');
        setLoading(false);
        return;
      }
      if (q.question_type === 'radio') {
        if (!q.options || q.options.length < 2) {
          setError('Radio fields need at least two options.');
          setLoading(false);
          return;
        }
        for (const opt of q.options) {
          if (!opt.option_text.trim()) {
            setError('All radio options must have text.');
            setLoading(false);
            return;
          }
        }
      }
    }

    try {
      let res;
      
       // If in edit mode, use PUT to update
       if (editMode && existingFormId) {
         res = await axios.put(
           `${APP_URL}/api/forms/${existingFormId}`,
           { 
             title: formTitle,
             description: formDescription,
             questions,
             form_price: formPrice
           },
           { headers: { Authorization: `Bearer ${token}` } }
         );
         setLoading(false);
         alert('Service form updated successfully!');
         // Reset form state and redirect
         setEditMode(false);
         setExistingFormId(null);
         setFormTitle('');
         setFormDescription('');
         setFormPrice(0);
         setQuestions([]);
         router.push('/services');
        } else if (formType === 'service') {
          // Service form - POST to /api/forms/service (admin only)
          if (!selectedService || !selectedSubservice) {
            setError('Please select a service and subservice.');
            setLoading(false);
            return;
          }
          
          // Use current user's ID as admin when they are admin
          const serviceAdminUserId = currentUser?.id;
          
          res = await axios.post(
            `${APP_URL}/api/forms/service`,
            { 
              title: formTitle,
              description: formDescription,
              questions,
              form_price: formPrice,
              service_name: selectedService.slug,
              subservice_name: selectedSubservice.name,
              admin_user_id: serviceAdminUserId
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
         setLoading(false);
         alert('Service form created successfully!');
         router.push('/services');
        } else {
          // General form - POST to /api/forms
          res = await axios.post(
            `${APP_URL}/api/forms`,
            { 
              title: formTitle,
              description: formDescription,
              questions,
              form_price: formPrice,
              form_type: 'general'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
         setLoading(false);
         alert('General form created successfully!');
         router.push('/profile');
       }
    } catch (err: any) {
      console.error('Error saving service:', err);
      setError(err.response?.data?.error || 'Failed to save service.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingFormId) {
      setError('No form selected for deletion.');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to delete a service.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this service form? This action cannot be undone.')) {
      setLoading(true);
      try {
        await axios.delete(`${APP_URL}/api/forms/${existingFormId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLoading(false);
        alert('Service form deleted successfully!');
        // Clear edit mode and redirect
        setEditMode(false);
        setExistingFormId(null);
        setFormTitle('');
        setFormDescription('');
        setQuestions([]);
        router.push('/profile');
      } catch (err: any) {
        console.error('Error deleting service form:', err);
        setError(err.response?.data?.error || 'Failed to delete service form.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto">      

      {/* Form Type Tabs - Only shown for admins */}
      {isAdmin && (
        <div>
          <Tabs
            tabs={[
              { label: 'General', value: 'general' },
              { label: 'Service', value: 'service' }
            ]}
            activeTab={formType}
            onChange={(value) => {
              // Cancel edit mode when switching form types
              if (editMode) {
                setEditMode(false);
                setExistingFormId(null);
                setFormTitle('');
                setFormDescription('');
                setQuestions([]);
              }
              setFormType(value as 'general' | 'service');
              if (value === 'general') {
                setSelectedService(null);
                setSelectedSubservice(null);
              }
            }}
          />
        </div>
      )}

      {error && 
      <p className="text-red-500 mb-4">{error}</p>}

      {/* Edit Mode Banner */}
      {editMode && (
        <div className="bg-blue-600 text-white p-3 rounded-lg mb-2 flex justify-between items-center">
          <span>✏️ You are editing an existing service form</span>
          <button
            onClick={() => {
              setEditMode(false);
              setExistingFormId(null);
              setFormTitle('');
              setFormDescription('');
              setQuestions([]);
              setSelectedService(null);
              setSelectedSubservice(null);
              router.push('/create-post');
            }}
            className="bg-red-700 px-3 py-1 rounded text-sm"
          >
            Cancel editing
          </button>
        </div>
      )}
        
      {/* Service Form Options */}
      {formType === 'service' && isAdmin && (
        <ServiceSelector
          selectedService={selectedService}
          selectedSubservice={selectedSubservice}
          setSelectedService={setSelectedService}
          setSelectedSubservice={setSelectedSubservice}
          setExistingFormId={setExistingFormId}
          setFormTitle={setFormTitle}
          setFormDescription={setFormDescription}
          setQuestions={setQuestions}
          setFormPrice={setFormPrice}
          setFormType={setFormType}
          setEditMode={setEditMode}
          setLoading={setLoading}
          loading={loading}
          services={services}
        />
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900 p-2 mb-2">
        
        <div className="mb-2">
           <label htmlFor="formPrice" className="block text-gray-300 font-bold mb-2">
             Form Price (₹):
           </label>
           <input
             type="number"
             id="formPrice"
             value={formPrice}
             onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
             className="border p-2 w-full rounded-md text-gray-300"
             min="0"
           />
         </div>
         
         <div className="mb-2">
           <label htmlFor="formTitle" className="block text-gray-300 font-bold mb-2">
             Form Title {formType === 'general' ? '(Required)' : '(Optional - defaults to subservice name)'}:
           </label>
           <input
             type="text"
             id="formTitle"
             value={formTitle}
             onChange={(e) => setFormTitle(e.target.value)}
             className="border p-2 w-full rounded-md text-gray-300"
             required={formType === 'general'}
             placeholder={formType === 'service' ? `${selectedSubservice?.name || 'Service'} Form` : 'Enter form title...'}
           />
         </div>

        <div className="mb-2">
          <label htmlFor="formDescription" className="block text-gray-300 font-bold mb-2">Description (Optional):</label>
          <textarea
            id="formDescription"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="border p-2 w-full rounded-md text-gray-300"
            rows={3}
          />
        </div>      
        
        <QuestionEditor
          questions={questions}
          setQuestions={setQuestions}
        />

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          disabled={loading}
        >
          {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Service' : 'Create Service')}
        </button>
        
        {editMode && (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-md ml-2"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Service'}
          </button>
        )}
      </form>

      <h3 className="text-xl font-bold mb-2">Preview of your form shown below</h3>

      {/* Preview Section */}
      <FormPreview questions={questions} />
    </div>
  );
}
