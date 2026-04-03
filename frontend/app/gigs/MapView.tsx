'use client';

import { Gig } from './types';
import InteractiveMap from './InteractiveMap';
import L from 'leaflet';

const userIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const rideIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapViewProps {
  gigs: Gig[];
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function MapView({ gigs, userLocation, radius, onMapClick }: MapViewProps) {
  if (!userLocation) {
    return <div className="p-4 text-gray-400">Location not available</div>;
  }

  const validGigs = gigs.filter(g => g.pickup_lat && g.pickup_lng);

  const markers = [
    { lat: userLocation.lat, lng: userLocation.lng, icon: userIcon, popup: 'Your Location' },
    ...validGigs.map(gig => ({
      lat: gig.pickup_lat!,
      lng: gig.pickup_lng!,
      icon: gig.type === 'ride' ? rideIcon : deliveryIcon,
      popup: `<div><strong>${gig.type === 'ride' ? 'Ride' : 'Delivery'}</strong><p>${gig.pickup_address}</p><p>${gig.vehicle_type}</p><p>₹${gig.price}</p></div>`,
    })),
  ];

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-600">
      <InteractiveMap
        center={{ lat: userLocation.lat, lng: userLocation.lng }}
        zoom={12}
        height="100%"
        clickable={!!onMapClick}
        onClick={onMapClick}
        markers={markers}
      />
    </div>
  );
}