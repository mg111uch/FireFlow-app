'use client';

import { useState, useEffect } from 'react';
import InteractiveMap from './InteractiveMap';
import L from 'leaflet';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number } | null;
}

const userIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function LocationPickerModal({ isOpen, onClose, onSelect, initialLocation }: LocationPickerModalProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    setSelectedCoords(null);
    setLoading(true);
    
    const defaultLocation = { lat: 28.6139, lng: 77.209 };
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
          setLoading(false);
        },
        () => {
          setUserLocation(defaultLocation);
          setMapCenter(defaultLocation);
          setLoading(false);
        },
        { timeout: 15000 }
      );
    } else {
      setUserLocation(defaultLocation);
      setMapCenter(defaultLocation);
      setLoading(false);
    }
  }, [isOpen, initialLocation]);

  const handleCenterToUserLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
          setLoading(false);
        },
        () => {
          setLoading(false);
        },
        { timeout: 15000 }
      );
    }
  };

  const handleConfirm = async () => {
    if (!selectedCoords) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedCoords.lat}&lon=${selectedCoords.lng}`
      );
      const data = await response.json();
      const addr = data.display_name || `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`;
      onSelect({ address: addr, lat: selectedCoords.lat, lng: selectedCoords.lng });
      onClose();
    } catch {
      onSelect({ 
        address: `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`, 
        lat: selectedCoords.lat, 
        lng: selectedCoords.lng 
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-800 rounded-lg p-4 w-[90%] max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Select Location on Map</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-gray-400">Loading map...</div>
        ) : userLocation ? (
          <>
            <div className="h-[400px] rounded-lg overflow-hidden mb-4 relative">
              <InteractiveMap
                center={{ lat: mapCenter?.lat || userLocation.lat, lng: mapCenter?.lng || userLocation.lng }}
                zoom={14}
                height="100%"
                clickable={true}
                onClick={(lat, lng) => setSelectedCoords({ lat, lng })}
                markers={selectedCoords ? [{ lat: selectedCoords.lat, lng: selectedCoords.lng, icon: userIcon }] : []}
              />
              <button
                onClick={handleCenterToUserLocation}
                className="absolute top-2 right-2 z-[1000] px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg"
                title="Center to my location"
              >
                📍
              </button>
            </div>
            
            <div className="text-sm text-gray-400 mb-4">
              {selectedCoords 
                ? `Selected: ${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`
                : 'Click on map to select location'}
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handleConfirm}
                disabled={!selectedCoords}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                Confirm Location
              </button>
            </div>
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-400">Location not available</div>
        )}
      </div>
    </div>
  );
}