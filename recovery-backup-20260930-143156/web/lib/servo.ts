export interface CompartmentStatus {
  state: string;
  commanded_angle: number | null;
}

export interface NozzleStatus {
  state: string;
  commanded_angle: number | null;
  sweep: boolean;
  sweep_min: number;
  sweep_max: number;
}

export interface PumpStatus {
  state: string;
}

export interface ServoStatusData {
  status: string;
  mode: string;
  hardware_feedback: boolean;
  compartment: CompartmentStatus;
  nozzle: NozzleStatus;
  pump: PumpStatus;
  last_command: string | null;
  last_updated: number | null;
}

const DEFAULT_SWEEP_MIN = 60;
const DEFAULT_SWEEP_MAX = 120;

function getServoBaseUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_ROVER_SERVO_URL?.trim() || '';

  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const vision =
    process.env.NEXT_PUBLIC_ROVER_VISION_URL?.trim() || '';

  if (vision) {
    try {
      const u = new URL(vision);
      return `${u.protocol}//${u.hostname}:8084`;
    } catch {
      return '';
    }
  }

  return '';
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchServoStatus(): Promise<ServoStatusData | null> {
  const baseUrl = getServoBaseUrl();

  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/servos`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const raw: any = await response.json();

    return {
      status:
        typeof raw?.status === 'string'
          ? raw.status
          : 'unknown',

      mode:
        typeof raw?.mode === 'string'
          ? raw.mode
          : 'COMMAND_SIMULATION',

      hardware_feedback:
        raw?.hardware_feedback === true,

      compartment: {
        state:
          typeof raw?.compartment?.state === 'string'
            ? raw.compartment.state
            : 'UNKNOWN',

        commanded_angle:
          numberOrNull(
            raw?.compartment?.commanded_angle
          ),
      },

      nozzle: {
        state:
          typeof raw?.nozzle?.state === 'string'
            ? raw.nozzle.state
            : 'UNKNOWN',

        commanded_angle:
          numberOrNull(
            raw?.nozzle?.commanded_angle
          ),

        sweep:
          raw?.nozzle?.sweep === true,

        sweep_min:
          numberOrNull(
            raw?.nozzle?.sweep_min ??
            raw?.nozzle?.min_angle
          ) ?? DEFAULT_SWEEP_MIN,

        sweep_max:
          numberOrNull(
            raw?.nozzle?.sweep_max ??
            raw?.nozzle?.max_angle
          ) ?? DEFAULT_SWEEP_MAX,
      },

      pump: {
        state:
          typeof raw?.pump?.state === 'string'
            ? raw.pump.state
            : 'UNKNOWN',
      },

      last_command:
        typeof raw?.last_command === 'string'
          ? raw.last_command
          : null,

      last_updated:
        numberOrNull(
          raw?.last_updated
        ),
    };

  } catch {
    return null;
  }
}
