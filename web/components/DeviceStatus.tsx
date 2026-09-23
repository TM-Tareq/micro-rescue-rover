'use client';

import React from 'react';
import { Wifi, Cpu, Volume2, ShieldCheck } from 'lucide-react';
import { AudioState } from '@/lib/webrtc';

interface DeviceStatusProps {
  isPiOnline: boolean;
  audioState: AudioState;
  isSocketConnected: boolean;
}

export const DeviceStatus: React.FC<DeviceStatusProps> = ({
  isPiOnline,
  audioState,
  isSocketConnected,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
        <ShieldCheck className="w-5 h-5 text-slate-700" />
        <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Device Status
        </h2>
      </div>

      <div className="space-y-3 text-sm">
        {/* Raspberry Pi Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center space-x-3">
            <Cpu className={`w-4 h-4 ${isPiOnline ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-slate-700 font-semibold text-xs">Raspberry Pi</span>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span
              className={`font-semibold text-xs px-2 py-0.5 rounded ${
                isPiOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {isPiOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Audio System Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center space-x-3">
            <Volume2 className={`w-4 h-4 ${audioState === 'Connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-slate-700 font-semibold text-xs">Audio System</span>
          </div>
          <span
            className={`font-semibold text-xs px-2 py-0.5 rounded ${
              audioState === 'Connected'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : audioState === 'Muted'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : audioState === 'Connecting'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 animate-pulse'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {audioState === 'Connected' ? 'Active Stream' : audioState}
          </span>
        </div>

        {/* Network Connectivity */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center space-x-3">
            <Wifi className={`w-4 h-4 ${isSocketConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-slate-700 font-semibold text-xs">Signaling Network</span>
          </div>
          <span
            className={`font-semibold text-xs px-2 py-0.5 rounded ${
              isSocketConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {isSocketConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>
    </div>
  );
};
