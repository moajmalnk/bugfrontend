import { ENV } from '@/lib/env';
import {
  DEFAULT_OFFICE_LAT,
  DEFAULT_OFFICE_LNG,
  DEFAULT_OFFICE_RADIUS_M,
  DEFAULT_OFFICE_LABEL,
} from '@/lib/officeLocation';

export type OfficeLocationSettings = {
  office_lat: number;
  office_lng: number;
  office_radius_m: number;
  office_label: string;
};

export type CheckInCutoffSettings = {
  checkin_cutoff_enabled: boolean;
  /** HH:MM:SS (24h, Asia/Kolkata) */
  checkin_cutoff_time: string;
  checkin_cutoff_label?: string;
};

export type AppSettings = OfficeLocationSettings &
  CheckInCutoffSettings & {
    email_notifications_enabled: boolean;
    office_defaults?: OfficeLocationSettings & {
      lat?: number;
      lng?: number;
      radius_m?: number;
      label?: string;
    };
    checkin_cutoff_defaults?: CheckInCutoffSettings;
  };

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export function defaultOfficeLocationSettings(): OfficeLocationSettings {
  return {
    office_lat: DEFAULT_OFFICE_LAT,
    office_lng: DEFAULT_OFFICE_LNG,
    office_radius_m: DEFAULT_OFFICE_RADIUS_M,
    office_label: DEFAULT_OFFICE_LABEL,
  };
}

export function defaultCheckInCutoffSettings(): CheckInCutoffSettings {
  return {
    checkin_cutoff_enabled: true,
    checkin_cutoff_time: '10:00:00',
    checkin_cutoff_label: '10:00 AM IST',
  };
}

/** Format HH:MM[:SS] as "10:00 AM IST" for UI copy. */
export function formatCheckInCutoffLabel(time?: string | null): string {
  if (!time) return '10:00 AM IST';
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr || '10', 10);
  const m = parseInt(mStr || '0', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '10:00 AM IST';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm} IST`;
}

export async function getAppSettings(): Promise<AppSettings> {
  const res = await fetch(`${ENV.API_URL}/settings/get.php`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  const data = await parseJson(res);
  const raw = data.data || {};
  const defaults = defaultOfficeLocationSettings();
  const cutoffDefaults = defaultCheckInCutoffSettings();
  const officeDefaults = raw.office_defaults || {};
  const cutoffTime =
    typeof raw.checkin_cutoff_time === 'string' && raw.checkin_cutoff_time.trim()
      ? raw.checkin_cutoff_time
      : cutoffDefaults.checkin_cutoff_time;

  return {
    email_notifications_enabled: Boolean(raw.email_notifications_enabled),
    office_lat:
      typeof raw.office_lat === 'number' ? raw.office_lat : defaults.office_lat,
    office_lng:
      typeof raw.office_lng === 'number' ? raw.office_lng : defaults.office_lng,
    office_radius_m:
      typeof raw.office_radius_m === 'number'
        ? raw.office_radius_m
        : defaults.office_radius_m,
    office_label:
      typeof raw.office_label === 'string' && raw.office_label.trim()
        ? raw.office_label
        : defaults.office_label,
    checkin_cutoff_enabled:
      typeof raw.checkin_cutoff_enabled === 'boolean'
        ? raw.checkin_cutoff_enabled
        : cutoffDefaults.checkin_cutoff_enabled,
    checkin_cutoff_time: cutoffTime,
    checkin_cutoff_label:
      typeof raw.checkin_cutoff_label === 'string' && raw.checkin_cutoff_label.trim()
        ? raw.checkin_cutoff_label
        : formatCheckInCutoffLabel(cutoffTime),
    office_defaults: {
      office_lat: officeDefaults.lat ?? defaults.office_lat,
      office_lng: officeDefaults.lng ?? defaults.office_lng,
      office_radius_m: officeDefaults.radius_m ?? defaults.office_radius_m,
      office_label: officeDefaults.label ?? defaults.office_label,
    },
    checkin_cutoff_defaults: {
      checkin_cutoff_enabled: raw.checkin_cutoff_defaults?.enabled ?? true,
      checkin_cutoff_time:
        raw.checkin_cutoff_defaults?.time ?? cutoffDefaults.checkin_cutoff_time,
      checkin_cutoff_label:
        raw.checkin_cutoff_defaults?.label ?? cutoffDefaults.checkin_cutoff_label,
    },
  };
}

export async function updateOfficeLocationSettings(
  payload: OfficeLocationSettings
): Promise<OfficeLocationSettings> {
  const res = await fetch(`${ENV.API_URL}/settings/update.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  const raw = data.data || {};
  return {
    office_lat: Number(raw.office_lat),
    office_lng: Number(raw.office_lng),
    office_radius_m: Number(raw.office_radius_m),
    office_label: String(raw.office_label || ''),
  };
}

export async function updateCheckInCutoffSettings(
  payload: CheckInCutoffSettings
): Promise<CheckInCutoffSettings> {
  const res = await fetch(`${ENV.API_URL}/settings/update.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      checkin_cutoff_enabled: payload.checkin_cutoff_enabled,
      checkin_cutoff_time: payload.checkin_cutoff_time,
    }),
  });
  const data = await parseJson(res);
  const raw = data.data || {};
  const time = String(raw.checkin_cutoff_time || payload.checkin_cutoff_time);
  return {
    checkin_cutoff_enabled: Boolean(raw.checkin_cutoff_enabled),
    checkin_cutoff_time: time,
    checkin_cutoff_label:
      typeof raw.checkin_cutoff_label === 'string' && raw.checkin_cutoff_label.trim()
        ? raw.checkin_cutoff_label
        : formatCheckInCutoffLabel(time),
  };
}
