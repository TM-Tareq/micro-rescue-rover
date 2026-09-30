export const SERVO_BASE_URL = process.env.NEXT_PUBLIC_ROVER_SERVO_URL || '';

export interface CompartmentServoStatus {
  state: 'OPEN' | 'CLOSED' | 'Offline' | 'Unknown' | string;
  commanded_angle: number | null;
}

export interface NozzleServoStatus {
  state: 'LEFT' | 'CENTER' | 'RIGHT' | 'SWEEP ACTIVE' | 'Offline' | 'Unknown' | string;
  commanded_angle: number | null;
  sweep?: boolean;
  sweep_min?: number;
  sweep_max?: number;
}

export interface ServoStatusData {
  compartment: CompartmentServoStatus;
  nozzle: NozzleServoStatus;
}

let cachedWorkingUrl: string | null = null;

export const getServoCandidateUrls = (): string[] => {
  const urls: string[] = [];

  if (cachedWorkingUrl) {
    urls.push(cachedWorkingUrl);
  }

  if (SERVO_BASE_URL) {
    urls.push(SERVO_BASE_URL);
    if (!SERVO_BASE_URL.endsWith('/api/servos') && !SERVO_BASE_URL.endsWith('/api/servo')) {
      urls.push(`${SERVO_BASE_URL.replace(/\/+$/, '')}/api/servos`);
      urls.push(`${SERVO_BASE_URL.replace(/\/+$/, '')}/api/servo`);
    }
  }

  const visionUrl = process.env.NEXT_PUBLIC_ROVER_VISION_URL || '';
  if (visionUrl) {
    const cleanVision = visionUrl.replace(/\/+$/, '');
    urls.push(`${cleanVision}/api/servos`);
    urls.push(`${cleanVision}/api/servo`);
    try {
      const u = new URL(visionUrl);
      urls.push(`${u.protocol}//${u.hostname}:8084/api/servos`);
      urls.push(`${u.protocol}//${u.hostname}:8084/api/servo`);
    } catch {}
  }

  const gpsUrl = process.env.NEXT_PUBLIC_ROVER_GPS_URL || '';
  if (gpsUrl) {
    const cleanGps = gpsUrl.replace(/\/+$/, '');
    urls.push(`${cleanGps}/api/servos`);
    try {
      const u = new URL(gpsUrl);
      urls.push(`${u.protocol}//${u.hostname}:8084/api/servos`);
    } catch {}
  }

  urls.push('http://localhost:4000/api/servos');

  // Deduplicate array preserving order
  return Array.from(new Set(urls));
};

export const fetchServoStatus = async (): Promise<ServoStatusData | null> => {
  const candidates = getServoCandidateUrls();

  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) continue;

      const data = await res.json();
      if (!data || typeof data !== 'object') continue;

      // Ensure expected object structure is present or valid
      if ('compartment' in data || 'nozzle' in data) {
        cachedWorkingUrl = url;

        const compartmentState = data.compartment?.state
          ? String(data.compartment.state).toUpperCase()
          : 'UNKNOWN';

        let nozzleState = data.nozzle?.state
          ? String(data.nozzle.state).toUpperCase()
          : 'UNKNOWN';

        if (data.nozzle?.sweep) {
          nozzleState = 'SWEEP ACTIVE';
        }

        const compartment: CompartmentServoStatus = {
          state: compartmentState,
          commanded_angle: typeof data.compartment?.commanded_angle === 'number' ? data.compartment.commanded_angle : null,
        };

        const nozzle: NozzleServoStatus = {
          state: nozzleState,
          commanded_angle: typeof data.nozzle?.commanded_angle === 'number' ? data.nozzle.commanded_angle : null,
          sweep: Boolean(data.nozzle?.sweep),
          sweep_min: typeof data.nozzle?.sweep_min === 'number' ? data.nozzle.sweep_min : 60,
          sweep_max: typeof data.nozzle?.sweep_max === 'number' ? data.nozzle.sweep_max : 120,
        };

        return { compartment, nozzle };
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
};
