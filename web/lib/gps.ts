export const GPS_BASE_URL = process.env.NEXT_PUBLIC_ROVER_GPS_URL || '';

export interface GPSData {
  altitude_m: number | null;
  connected: boolean;
  course_deg: number | null;
  fix: boolean;
  fix_quality: number;
  hdop: number;
  last_update: string | null;
  latitude: number | null;
  longitude: number | null;
  satellites: number;
  speed_kmh: number | null;
  speed_knots: number | null;
  status: string;
  utc_time: string | null;
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export interface GPSHealthResponse {
  status: string;
  [key: string]: any;
}

export const getGPSApiUrl = (): string | null => {
  if (!GPS_BASE_URL) return null;
  return `${GPS_BASE_URL}/api/gps`;
};

export const getGPSTrackUrl = (): string | null => {
  if (!GPS_BASE_URL) return null;
  return `${GPS_BASE_URL}/api/track`;
};

export const getGPSHealthUrl = (): string | null => {
  if (!GPS_BASE_URL) return null;
  return `${GPS_BASE_URL}/health`;
};

export const fetchGPSData = async (): Promise<GPSData | null> => {
  const url = getGPSApiUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
};

export const fetchGPSTrack = async (): Promise<TrackPoint[]> => {
  const url = getGPSTrackUrl();
  if (!url) return [];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};

export const fetchGPSHealth = async (): Promise<boolean> => {
  const url = getGPSHealthUrl();
  if (!url) return false;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({ status: 'ok' }));
    return data?.status === 'ok' || res.status === 200;
  } catch (error) {
    return false;
  }
};
