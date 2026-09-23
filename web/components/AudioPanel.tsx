'use client';

import React from 'react';
import { Mic, MicOff, Volume2, PhoneOff, Radio, AlertCircle } from 'lucide-react';
import { AudioState, MicState } from '@/lib/webrtc';

interface AudioPanelProps {
  audioState: AudioState;
  micState: MicState;
  errorMessage: string | null;
  isPiOnline: boolean;
  onStartTalk: () => void;
  onMute: () => void;
  onStopTalk: () => void;
  onClearError: () => void;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({
  audioState,
  micState,
  errorMessage,
  isPiOnline,
  onStartTalk,
  onMute,
  onStopTalk,
  onClearError,
}) => {
  const isTalkActive = audioState === 'Connecting' || audioState === 'Connected' || audioState === 'Muted';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg ${isTalkActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-wide">AUDIO TRANSMISSION</h2>
            <p className="text-xs text-slate-500">Laptop Microphone → Raspberry Pi MAX98357A Speaker</p>
          </div>
        </div>

        {/* Live Status Indicator Badge */}
        <div className="flex items-center space-x-2">
          {audioState === 'Connected' && (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
              <span>LIVE AUDIO</span>
            </span>
          )}
        </div>
      </div>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between text-red-700 text-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onClearError}
            className="text-red-700 hover:text-red-900 text-xs font-bold ml-2 underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Microphone Status Indicator */}
      <div className="flex items-center justify-center my-4 space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-2">
          {micState === 'On' ? (
            <Mic className="w-4 h-4 text-emerald-600 animate-pulse" />
          ) : micState === 'Muted' ? (
            <MicOff className="w-4 h-4 text-amber-600" />
          ) : (
            <MicOff className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs text-slate-600 font-semibold">Microphone:</span>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded ${
            micState === 'On'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : micState === 'Muted'
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          {micState.toUpperCase()}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {/* START TALK */}
        <button
          onClick={onStartTalk}
          disabled={isTalkActive || !isPiOnline}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 shadow-sm ${
            isTalkActive
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : !isPiOnline
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 active:scale-95 shadow-md'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>{audioState === 'Connecting' ? 'CONNECTING...' : 'START TALK'}</span>
        </button>

        {/* MUTE */}
        <button
          onClick={onMute}
          disabled={!isTalkActive}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 ${
            !isTalkActive
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : micState === 'Muted'
              ? 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 shadow-sm'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
          }`}
        >
          {micState === 'Muted' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          <span>{micState === 'Muted' ? 'UNMUTE' : 'MUTE'}</span>
        </button>

        {/* STOP TALK */}
        <button
          onClick={onStopTalk}
          disabled={!isTalkActive}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 ${
            !isTalkActive
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-red-600 hover:bg-red-500 text-white border border-red-500 active:scale-95 shadow-sm'
          }`}
        >
          <PhoneOff className="w-4 h-4" />
          <span>STOP TALK</span>
        </button>
      </div>

      {!isPiOnline && (
        <p className="text-center text-xs text-amber-700 font-medium mt-4">
          ⚠️ Raspberry Pi is currently OFFLINE. Start Python agent on RPi to enable audio.
        </p>
      )}
    </div>
  );
};
