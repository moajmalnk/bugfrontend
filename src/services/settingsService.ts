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

export type AppSettings = OfficeLocationSettings & {
  email_notifications_enabled: boolean;
  office_defaults?: OfficeLocationSettings & {
    lat?: number;
    lng?: number;
    radius_m?: number;
    label?: string;
  };
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

export async function getAppSettings(): Promise<AppSettings> {
  const res = await fetch(`${ENV.API_URL}/settings/get.php`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  const data = await parseJson(res);
  const raw = data.data || {};
  const defaults = defaultOfficeLocationSettings();
  const officeDefaults = raw.office_defaults || {};

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
    office_defaults: {
      office_lat: officeDefaults.lat ?? defaults.office_lat,
      office_lng: officeDefaults.lng ?? defaults.office_lng,
      office_radius_m: officeDefaults.radius_m ?? defaults.office_radius_m,
      office_label: officeDefaults.label ?? defaults.office_label,
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
