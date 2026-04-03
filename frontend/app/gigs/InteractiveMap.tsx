'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapMarker {
  lat: number;
  lng: number;
  icon?: L.Icon;
  popup?: string;
}

interface InteractiveMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  clickable?: boolean;
  onClick?: (lat: number, lng: number) => void;
  markers?: MapMarker[];
}

function MapEventsHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapCenterController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

export default function InteractiveMap({ 
  center, 
  zoom = 13, 
  height = '100%', 
  clickable = true, 
  onClick,
  markers = []
}: InteractiveMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height, width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterController center={center} zoom={zoom} />
      {clickable && onClick && <MapEventsHandler onClick={onClick} />}
      
      {markers.map((marker, idx) => (
        <Marker 
          key={idx} 
          position={[marker.lat, marker.lng]} 
          icon={marker.icon}
        >
          {marker.popup && <Popup>{marker.popup}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}