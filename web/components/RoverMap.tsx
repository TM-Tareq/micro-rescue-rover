'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Locate, AlertCircle } from 'lucide-react';
import { TrackPoint } from '@/lib/gps';

// Create custom SVG Rover vehicle marker icon with course rotation support
const createRoverIcon = (heading: number | null = null, isLastKnown: boolean = false) => {
  const rotation = heading !== null && heading !== undefined ? heading : 0;
  const colorClass = isLastKnown ? '#d97706' : '#059669'; // Amber if last known, emerald if live

  const svgHtml = `
    <div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="16" fill="${colorClass}" fill-opacity="0.2" stroke="${colorClass}" stroke-width="2"/>
        <circle cx="18" cy="18" r="8" fill="${colorClass}"/>
        <polygon points="18,4 24,16 18,13 12,16" fill="#ffffff"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'rover-custom-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface MapControllerProps {
  center: [number, number];
  autoFollow: boolean;
}

// Controller component to pan map to rover position preserving user's zoom level
const MapController: React.FC<MapControllerProps> = ({ center, autoFollow }) => {
  const map = useMap();

  useEffect(() => {
    if (autoFollow && center && center[0] !== 0 && center[1] !== 0) {
      map.panTo(center, { animate: true, duration: 0.5 });
    }
  }, [center, autoFollow, map]);

  return null;
};

interface RoverMapProps {
  currentPosition: [number, number] | null;
  heading: number | null;
  trackPoints: TrackPoint[];
  isLastKnown: boolean;
  isGpsOnline: boolean;
  hasFix: boolean;
}

export const RoverMap: React.FC<RoverMapProps> = ({
  currentPosition,
  heading,
  trackPoints,
  isLastKnown,
  isGpsOnline,
  hasFix,
}) => {
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const defaultCenter: [number, number] = currentPosition || [23.780882, 90.419238]; // Default Dhaka fallback if no position

  // Convert trackPoints array to Leaflet LatLngExpression array
  const polylinePositions: [number, number][] = trackPoints.map((pt) => [pt.latitude, pt.longitude]);
  if (currentPosition) {
    polylinePositions.push(currentPosition);
  }

  const handleRecenter = () => {
    setAutoFollow(true);
  };

  return (
    <div className="relative w-full h-[360px] md:h-[440px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
      {/* Map Control Overlay Button */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {currentPosition && (
          <button
            onClick={handleRecenter}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all ${
              autoFollow
                ? 'bg-emerald-600 text-white border border-emerald-500'
                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
            }`}
            title="Re-center map on Rover"
          >
            <Locate className="w-4 h-4" />
            <span>{autoFollow ? 'Auto-Following' : 'Re-center Rover'}</span>
          </button>
        )}
      </div>

      {/* Searching / Offline State Overlay */}
      {(!currentPosition || (!hasFix && !isLastKnown)) && (
        <div className="absolute inset-0 z-[999] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <Compass className="w-10 h-10 text-slate-500 animate-spin mb-3" />
          <h3 className="text-sm font-bold text-slate-200">
            {!isGpsOnline ? 'GPS Module Offline' : 'Searching for Satellites...'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {!isGpsOnline
              ? 'GPS service unreachable at process.env.NEXT_PUBLIC_ROVER_GPS_URL.'
              : 'Waiting for valid 3D GPS satellite fix to acquire coordinates.'}
          </p>
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={defaultCenter}
        zoom={16}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {currentPosition && (
          <>
            <MapController center={currentPosition} autoFollow={autoFollow} />

            {/* Travelled Path Polyline */}
            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: isLastKnown ? '#f59e0b' : '#059669',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: isLastKnown ? '6, 6' : undefined,
                }}
              />
            )}

            {/* Rover Vehicle Marker */}
            <Marker
              position={currentPosition}
              icon={createRoverIcon(heading, isLastKnown)}
              eventHandlers={{
                click: () => setAutoFollow(true),
              }}
            >
              <Popup className="rover-popup">
                <div className="text-xs p-1">
                  <div className="font-bold text-slate-900 border-b pb-1 mb-1">
                    ROVER-01 Position
                  </div>
                  <div>Status: <span className="font-bold">{isLastKnown ? 'Last Known Position' : 'Live Fix'}</span></div>
                  <div>Lat: {currentPosition[0].toFixed(6)}</div>
                  <div>Lng: {currentPosition[1].toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
};
