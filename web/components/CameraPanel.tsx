'use client';

import React from 'react';
import { Camera, VideoOff } from 'lucide-react';

export const CameraPanel: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-full min-h-[220px]">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <Camera className="w-5 h-5 text-slate-500" />
        <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          LIVE CAMERA
        </h2>
      </div>

      <div className="flex flex-col items-center justify-center my-4 py-8 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center">
        <VideoOff className="w-8 h-8 text-slate-400 mb-2" />
        <span className="text-sm font-semibold text-slate-700">Camera Feed</span>
        <span className="text-xs text-slate-500 font-mono mt-1">Coming Soon</span>
      </div>
    </div>
  );
};
