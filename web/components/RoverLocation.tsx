'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';
import {
  GPS_BASE_URL,
  GPSData,
  TrackPoint,
  fetchGPSData,
  fetchGPSTrack,
  fetchGPSHealth,
} from '@/lib/gps';
import { GPSStatus } from '@/components/GPSStatus';

// Dynamically import Leaflet Map component with SSR disabled to prevent 'window is not defined' error
const RoverMap = dynamic(() => import('@/components/RoverMap').then((mod) => mod.RoverMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] md:h-[440px] rounded-xl bg-slate-900 flex flex-col items-center justify-center text-slate-400 border border-slate-200">
      <Compass className="w-8 h-8 animate-spin text-slate-500 mb-2" />
      <span className="text-xs font-semibold">Loading Map Engine...</span>
    </div>
  ),
});

export const RoverLocation: React.FC = () => {
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [isGpsOnline, setIsGpsOnline] = useState<boolean>(false);
  const [lastKnownPos, setLastKnownPos] = useState<[number, number] | null>(null);

  const consecutiveFailuresRef = useRef<number>(0);
  const isConfigured = Boolean(GPS_BASE_URL);

  // Poll GPS Data every 1 second
  useEffect(() => {
    if (!isConfigured) return;

    let isMounted = true;

    const pollGPS = async () => {
      const isHealthy = await fetchGPSHealth();
      const data = await fetchGPSData();

      if (!isMounted) return;

      if (isHealthy || data !== null) {
        consecutiveFailuresRef.current = 0;
        setIsGpsOnline(true);
        if (data) {
          setGpsData(data);
          // If valid fix exists, update last known position
          if (data.fix && data.latitude !== null && data.longitude !== null) {
            setLastKnownPos([data.latitude, data.longitude]);
          }
        }
      } else {
        consecutiveFailuresRef.current += 1;
        // Require 3 consecutive failures (~3 seconds) before marking offline
        if (consecutiveFailuresRef.current >= 3) {
          setIsGpsOnline(false);
        }
      }
    };

    pollGPS();
    const gpsInterval = setInterval(pollGPS, 1000);

    return () => {
      isMounted = false;
      clearInterval(gpsInterval);
    };
  }, [isConfigured]);

  // Poll GPS Track history every 2.5 seconds
  useEffect(() => {
    if (!isConfigured) return;

    let isMounted = true;

    const pollTrack = async () => {
      const pts = await fetchGPSTrack();
      if (isMounted) {
        setTrackPoints(pts);
      }
    };

    pollTrack();
    const trackInterval = setInterval(pollTrack, 2500);

    return () => {
      isMounted = false;
      clearInterval(trackInterval);
    };
  }, [isConfigured]);

  // Determine current active coordinate to display on map
  const hasLiveFix = Boolean(
    gpsData?.fix && gpsData?.latitude !== null && gpsData?.longitude !== null
  );

  const currentPos: [number, number] | null = hasLiveFix
    ? [gpsData!.latitude!, gpsData!.longitude!]
    : lastKnownPos;

  const isLastKnown = !hasLiveFix && lastKnownPos !== null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
              LIVE ROVER LOCATION
            </h2>
            <p className="text-xs text-slate-500">
              Real-time GPS Tracking & Travelled Path History
            </p>
          </div>
        </div>

        {!isConfigured && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>GPS URL Not Set</span>
          </span>
        )}
      </div>

      {/* Grid Layout: Map & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left / Top: Interactive Live Map */}
        <div className="lg:col-span-2">
          <RoverMap
            currentPosition={currentPos}
            heading={gpsData?.course_deg ?? null}
            trackPoints={trackPoints}
            isLastKnown={isLastKnown}
            isGpsOnline={isGpsOnline}
            hasFix={hasLiveFix}
          />
        </div>

        {/* Right / Bottom: GPS Telemetry Stats */}
        <div className="lg:col-span-1">
          <GPSStatus
            gpsData={gpsData}
            isGpsOnline={isGpsOnline}
            isLastKnown={isLastKnown}
          />
        </div>
      </div>
    </div>
  );
};
