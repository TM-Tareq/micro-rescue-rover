'use client';

import React, { useState, useEffect } from 'react';
import { Camera, VideoOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VISION_BASE_URL, getLiveVideoUrl, fetchVisionStatus, VisionStatus } from '@/lib/vision';

export const CameraPanel: React.FC = () => {
  const [streamError, setStreamError] = useState<boolean>(false);
  const [visionStatus, setVisionStatus] = useState<VisionStatus | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const videoUrl = getLiveVideoUrl();
  const isConfigured = Boolean(VISION_BASE_URL);

  const checkStatus = async () => {
    if (!isConfigured) return;
    setIsChecking(true);
    const status = await fetchVisionStatus();
    setVisionStatus(status);
    if (!status) {
      setStreamError(true);
    } else {
      setStreamError(false);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-full min-h-[300px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-slate-700" />
          <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            LIVE CAMERA FEED
          </h2>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          {!isConfigured ? (
            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Not Configured</span>
            </span>
          ) : streamError ? (
            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <VideoOff className="w-3.5 h-3.5" />
              <span>Camera Offline</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>LIVE</span>
            </span>
          )}

          <button
            onClick={checkStatus}
            disabled={isChecking}
            title="Refresh Camera Connection"
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full aspect-[4/3] flex flex-col items-center justify-center my-2 rounded-lg bg-slate-900 overflow-hidden">
        {isConfigured && !streamError && videoUrl ? (
          <img
            src={videoUrl}
            alt="Raspberry Pi Live Stream"
            onError={() => setStreamError(true)}
            onLoad={() => setStreamError(false)}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <VideoOff className="w-10 h-10 text-slate-500 mb-3" />
            <h3 className="text-sm font-bold text-slate-200">
              {!isConfigured ? 'Camera URL Not Configured' : 'Raspberry Pi Camera Offline'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {!isConfigured
                ? 'Please set NEXT_PUBLIC_ROVER_VISION_URL in your .env.local file.'
                : `Unable to connect to Vision Server at ${VISION_BASE_URL}. Verify Pi camera stream.`}
            </p>
            {isConfigured && (
              <span className="mt-3 text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Stream Target: {videoUrl}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
