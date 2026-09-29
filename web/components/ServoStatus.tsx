'use client';

import React, { useEffect, useState } from 'react';
import { Sliders } from 'lucide-react';
import { fetchServoStatus, ServoStatusData } from '@/lib/servo';

interface ServoStatusProps {
  pollIntervalMs?: number;
}

export const ServoStatus: React.FC<ServoStatusProps> = ({ pollIntervalMs = 2500 }) => {
  const [servoData, setServoData] = useState<ServoStatusData | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadServoStatus = async () => {
      const data = await fetchServoStatus();
      if (!isMounted) return;

      if (data) {
        setServoData(data);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    };

    loadServoStatus();
    const interval = setInterval(loadServoStatus, pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  // Helper to format state badges for Compartment Servo
  const getCompartmentStateBadge = (state: string | undefined, online: boolean) => {
    if (!online || !state || state === 'OFFLINE' || state === 'UNKNOWN') {
      return (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
          {!online ? 'Offline' : 'Unknown'}
        </span>
      );
    }

    if (state === 'OPEN') {
      return (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          OPEN
        </span>
      );
    }

    if (state === 'CLOSED') {
      return (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          CLOSED
        </span>
      );
    }

    return (
      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
        {state}
      </span>
    );
  };

  // Helper to format state badges for Nozzle Servo
  const getNozzleStateBadge = (state: string | undefined, isSweep: boolean | undefined, online: boolean) => {
    if (!online || !state || state === 'OFFLINE' || state === 'UNKNOWN') {
      return (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
          {!online ? 'Offline' : 'Unknown'}
        </span>
      );
    }

    if (isSweep || state === 'SWEEP ACTIVE') {
      return (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
          SWEEP ACTIVE
        </span>
      );
    }

    if (state === 'CENTER') {
      return (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          CENTER
        </span>
      );
    }

    if (state === 'LEFT') {
      return (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          LEFT
        </span>
      );
    }

    if (state === 'RIGHT') {
      return (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
          RIGHT
        </span>
      );
    }

    return (
      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
        {state}
      </span>
    );
  };

  // Helper to compute position bar percentage (min: 60, max: 120)
  const calculateAnglePercentage = (angle: number | null, min = 60, max = 120) => {
    if (angle === null || isNaN(angle)) return 0;
    const clamped = Math.min(Math.max(angle, min), max);
    return ((clamped - min) / (max - min)) * 100;
  };

  const compartmentAngle = isOnline && servoData?.compartment?.commanded_angle !== undefined
    ? servoData.compartment.commanded_angle
    : null;

  const nozzleAngle = isOnline && servoData?.nozzle?.commanded_angle !== undefined
    ? servoData.nozzle.commanded_angle
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Servo Status
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span
            className={`font-mono text-[11px] font-bold uppercase ${
              isOnline ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* SERVOS LIST */}
      <div className="space-y-4">
        {/* 1. COMPARTMENT SERVO */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-slate-800">Compartment Servo</span>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300/60">
                ESP32 GPIO 27
              </span>
            </div>
            {getCompartmentStateBadge(servoData?.compartment?.state, isOnline)}
          </div>

          {/* COMMANDED ANGLE VALUE & LABEL */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                Commanded Angle
              </span>
              <span className="text-lg font-bold font-mono text-slate-800">
                {compartmentAngle !== null ? `${compartmentAngle}°` : 'N/A'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 block">
                CLOSED: 60° | OPEN: 120°
              </span>
            </div>
          </div>

          {/* ANGLE GAUGE / POSITION BAR */}
          <div className="space-y-1">
            <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isOnline ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
                style={{
                  width: isOnline && compartmentAngle !== null ? `${calculateAnglePercentage(compartmentAngle)}%` : '0%',
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>60° (CLOSED)</span>
              <span>120° (OPEN)</span>
            </div>
          </div>
        </div>

        {/* 2. FIRE NOZZLE SERVO */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-slate-800">Fire Nozzle Servo</span>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300/60">
                ESP32 GPIO 13
              </span>
            </div>
            {getNozzleStateBadge(
              servoData?.nozzle?.state,
              servoData?.nozzle?.sweep,
              isOnline
            )}
          </div>

          {/* COMMANDED ANGLE VALUE & LABEL */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                Commanded Angle
              </span>
              <span className="text-lg font-bold font-mono text-slate-800">
                {nozzleAngle !== null ? `${nozzleAngle}°` : 'N/A'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 block">
                Sweep Range: 60°–120°
              </span>
            </div>
          </div>

          {/* ANGLE GAUGE / POSITION BAR */}
          <div className="space-y-1">
            <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  servoData?.nozzle?.sweep
                    ? 'bg-purple-600 animate-pulse'
                    : isOnline
                    ? 'bg-indigo-600'
                    : 'bg-slate-300'
                }`}
                style={{
                  width: isOnline && nozzleAngle !== null ? `${calculateAnglePercentage(nozzleAngle)}%` : '0%',
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>60° (LEFT)</span>
              <span>90° (CTR)</span>
              <span>120° (RIGHT)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
