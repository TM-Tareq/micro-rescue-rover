export const VISION_BASE_URL = process.env.NEXT_PUBLIC_ROVER_VISION_URL || '';

export interface VisionStatus {
  status: 'online' | 'offline';
  fps?: number;
  camera_id?: string;
  resolution?: string;
}

export interface DetectionEvent {
  id: string;
  label: string;
  confidence: number;
  timestamp: string;
  image_url: string;
}

export const getLiveVideoUrl = (): string | null => {
  if (!VISION_BASE_URL) return null;
  return `${VISION_BASE_URL}/video`;
};

export const getVisionHealthUrl = (): string | null => {
  if (!VISION_BASE_URL) return null;
  return `${VISION_BASE_URL}/health`;
};

export const getVisionStatusUrl = (): string | null => {
  if (!VISION_BASE_URL) return null;
  return `${VISION_BASE_URL}/api/status`;
};

export const getDetectionsUrl = (): string | null => {
  if (!VISION_BASE_URL) return null;
  return `${VISION_BASE_URL}/api/detections`;
};

export const getSavedImageUrl = (imageUrl: string): string | null => {
  if (!VISION_BASE_URL || !imageUrl) return null;
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${VISION_BASE_URL}${path}`;
};

export interface VisionHealthResponse {
  status: string;
  camera?: boolean;
  model?: boolean;
  [key: string]: any;
}

export const fetchVisionHealth = async (): Promise<VisionHealthResponse | null> => {
  const url = getVisionHealthUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({ status: 'ok' }));
    return data && typeof data === 'object' ? data : { status: 'ok' };
  } catch {
    return null;
  }
};

export const fetchVisionStatus = async (): Promise<VisionStatus | null> => {
  const url = getVisionStatusUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('[Vision] Vision server unreachable:', error);
    return null;
  }
};

export const fetchDetections = async (): Promise<DetectionEvent[]> => {
  const url = getDetectionsUrl();
  if (!url) return [];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn('[Vision] Detection history unreachable:', error);
    return [];
  }
};
