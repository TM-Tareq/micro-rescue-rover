'use client';

import React from 'react';
import { Scan } from 'lucide-react';

export const DetectionPanel: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5 mb-3">
        <Scan className="w-4 h-4 text-purple-600" />
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Object Detection
        </h3>
      </div>
      <div className="py-5 text-center rounded bg-slate-50 border border-slate-200">
        <span className="text-xs text-purple-600 font-mono font-semibold">Coming Soon</span>
      </div>
    </div>
  );
};
