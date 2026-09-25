'use client';

import React, { useState, useEffect } from 'react';
import { Scan, AlertCircle } from 'lucide-react';
import { VISION_BASE_URL, fetchDetections, getSavedImageUrl, DetectionEvent } from '@/lib/vision';

export const DetectionPanel: React.FC = () => {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [isConfigured] = useState<boolean>(Boolean(VISION_BASE_URL));

  useEffect(() => {
    if (!isConfigured) return;
    const loadDetections = async () => {
      const data = await fetchDetections();
      setEvents(data);
    };
    loadDetections();
  }, [isConfigured]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <Scan className="w-4 h-4 text-purple-600" />
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Object Detection
          </h3>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
          {events.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-800">{item.label}</span>
              <span className="text-purple-600 font-mono">{(item.confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-5 text-center rounded bg-slate-50 border border-slate-200">
          <span className="text-xs text-purple-600 font-mono font-semibold">
            {isConfigured ? 'No Detections' : 'Vision Offline'}
          </span>
        </div>
      )}
    </div>
  );
};
