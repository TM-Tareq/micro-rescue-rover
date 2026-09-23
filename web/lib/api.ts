// Placeholder for future REST API endpoints (telemetry, configs, etc.)
export interface DeviceInfo {
  deviceId: string;
  type: string;
  status: 'online' | 'offline';
}

export const fetchDeviceStatus = async (deviceId: string = 'rover-01'): Promise<DeviceInfo | null> => {
  try {
    const serverUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:4000';
    const res = await fetch(`${serverUrl}/api/devices/${deviceId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch device status:', error);
    return null;
  }
};
