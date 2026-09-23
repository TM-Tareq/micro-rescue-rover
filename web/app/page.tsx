'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { WebRTCClient, AudioState, MicState } from '@/lib/webrtc';
import { DeviceStatus } from '@/components/DeviceStatus';
import { AudioPanel } from '@/components/AudioPanel';
import { CameraPanel } from '@/components/CameraPanel';
import { ThermalPanel } from '@/components/ThermalPanel';
import { DetectionPanel } from '@/components/DetectionPanel';
import { RoverControls } from '@/components/RoverControls';
import { Bot, Radio } from 'lucide-react';

const TARGET_DEVICE_ID = 'rover-01';

export default function RoverDashboard() {
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [isPiOnline, setIsPiOnline] = useState<boolean>(false);
  const [audioState, setAudioState] = useState<AudioState>('Idle');
  const [micState, setMicState] = useState<MicState>('Off');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const webRtcClientRef = useRef<WebRTCClient | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      console.log('[Socket] Connected to NestJS signaling server');
      setIsSocketConnected(true);

      socket.emit('device:status', { deviceId: TARGET_DEVICE_ID }, (response: any) => {
        if (response && response.status === 'online') {
          setIsPiOnline(true);
        } else {
          setIsPiOnline(false);
        }
      });
    };

    const onDisconnect = () => {
      console.log('[Socket] Disconnected from signaling server');
      setIsSocketConnected(false);
      setIsPiOnline(false);
    };

    const onDeviceOnline = (data: { deviceId: string }) => {
      if (data.deviceId === TARGET_DEVICE_ID) {
        console.log(`[Socket] Device ${TARGET_DEVICE_ID} came ONLINE`);
        setIsPiOnline(true);
      }
    };

    const onDeviceOffline = (data: { deviceId: string }) => {
      if (data.deviceId === TARGET_DEVICE_ID) {
        console.log(`[Socket] Device ${TARGET_DEVICE_ID} went OFFLINE`);
        setIsPiOnline(false);
        if (webRtcClientRef.current) {
          webRtcClientRef.current.stopTalk();
        }
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('device:online', onDeviceOnline);
    socket.on('device:offline', onDeviceOffline);

    if (socket.connected) {
      onConnect();
    }

    const rtcClient = new WebRTCClient(socket, TARGET_DEVICE_ID, {
      onAudioStateChange: (state) => setAudioState(state),
      onMicStateChange: (state) => setMicState(state),
      onError: (msg) => setErrorMessage(msg),
    });
    webRtcClientRef.current = rtcClient;

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('device:online', onDeviceOnline);
      socket.off('device:offline', onDeviceOffline);
      if (webRtcClientRef.current) {
        webRtcClientRef.current.destroy();
      }
    };
  }, []);

  const handleStartTalk = async () => {
    setErrorMessage(null);
    if (webRtcClientRef.current) {
      await webRtcClientRef.current.startTalk();
    }
  };

  const handleMute = () => {
    if (webRtcClientRef.current) {
      webRtcClientRef.current.toggleMute();
    }
  };

  const handleStopTalk = () => {
    if (webRtcClientRef.current) {
      webRtcClientRef.current.stopTalk();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER BAR */}
      <header className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-slate-900 rounded-xl text-white shadow-sm">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              ROVER CONTROL
            </h1>
            <p className="text-xs text-slate-500 font-mono">Raspberry Pi 5 Mission Command Console</p>
          </div>
        </div>

        {/* Dynamic Rover Device Badge */}
        <div className="flex items-center space-x-4 bg-slate-100/80 px-4 py-2 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-slate-500" />
            <span className="font-mono text-xs font-bold text-slate-700">ROVER-01</span>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span
              className={`text-xs font-bold tracking-wider uppercase ${
                isPiOnline ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              ● {isPiOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* TOP SECTION: LIVE CAMERA & DEVICE STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <CameraPanel />
        </div>
        <div className="md:col-span-1">
          <DeviceStatus
            isPiOnline={isPiOnline}
            audioState={audioState}
            isSocketConnected={isSocketConnected}
          />
        </div>
      </div>

      {/* MIDDLE SECTION: AUDIO STREAM CONTROLLER */}
      <AudioPanel
        audioState={audioState}
        micState={micState}
        errorMessage={errorMessage}
        isPiOnline={isPiOnline}
        onStartTalk={handleStartTalk}
        onMute={handleMute}
        onStopTalk={handleStopTalk}
        onClearError={() => setErrorMessage(null)}
      />

      {/* BOTTOM SECTION: EXPANSION MODULE PLACEHOLDERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <ThermalPanel />
        <DetectionPanel />
        <RoverControls />
      </div>
    </main>
  );
}
