'use client';

import React from 'react';
import { Navigation, Compass, Signal, Gauge, ArrowUp, Clock, AlertTriangle } from 'lucide-react';
import { GPSData } from '@/lib/gps';

interface GPSStatusProps {
  gpsData: GPSData | null;
  isGpsOnline: boolean;
  isLastKnown: boolean;
}

export const GPSStatus: React.FC<GPSStatusProps> = ({
  gpsData,
  isGpsOnline,
  isLastKnown,
}) => {
  const hasFix = Boolean(gpsData?.fix && gpsData?.latitude !== null && gpsData?.longitude !== null);
  const isSearching = isGpsOnline && !hasFix;

  const formattedLat = gpsData?.latitude !== null && gpsData?.latitude !== undefined
    ? Number(gpsData.latitude).toFixed(6)
    : '--';

  const formattedLng = gpsData?.longitude !== null && gpsData?.longitude !== undefined
    ? Number(gpsData.longitude).toFixed(6)
    : '--';

  const formattedSpeed = gpsData?.speed_kmh !== null && gpsData?.speed_kmh !== undefined
    ? `${Number(gpsData.speed_kmh).toFixed(1)} km/h`
    : '--';

  const formattedAlt = gpsData?.altitude_m !== null && gpsData?.altitude_m !== undefined
    ? `${Number(gpsData.altitude_m).toFixed(1)} m`
    : '--';

  const formattedTime = gpsData?.last_update || gpsData?.utc_time || '--';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      {/* Top Banner Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <Signal className={`w-4 h-4 ${isGpsOnline ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            GPS Module Status
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {!isGpsOnline ? (
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>GPS Offline</span>
            </span>
          ) : isLastKnown ? (
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Last Known Position</span>
            </span>
          ) : hasFix ? (
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
              ● 3D FIX ACTIVE
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
              Searching Satellites...
            </span>
          )}
        </div>
      </div>

      {/* Grid Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Satellites */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Signal className="w-3 h-3 text-emerald-600" /> Satellites
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1">
            {gpsData?.satellites ?? 0}
          </div>
        </div>

        {/* Speed */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Gauge className="w-3 h-3 text-blue-600" /> Speed
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1 font-mono">
            {formattedSpeed}
          </div>
        </div>

        {/* Heading / Course */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-purple-600" /> Heading
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1 font-mono">
            {gpsData?.course_deg !== null && gpsData?.course_deg !== undefined
              ? `${Number(gpsData.course_deg).toFixed(0)}°`
              : '--'}
          </div>
        </div>

        {/* Altitude */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-indigo-600" /> Altitude
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1 font-mono">
            {formattedAlt}
          </div>
        </div>
      </div>

      {/* Latitude & Longitude Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 font-semibold">Latitude:</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {formattedLat}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 font-semibold">Longitude:</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {formattedLng}
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Last Update:
        </span>
        <span className="font-mono font-semibold text-slate-700">{formattedTime}</span>
      </div>
    </div>
  );
};
