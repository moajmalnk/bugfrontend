/**
 * Why: Office check-in must prove the user is within 500 m of Wired In Coworks.
 * Server re-validates; this helper is for instant UI feedback only.
 */

export const DEFAULT_OFFICE_LAT = 10.98738553867724;
export const DEFAULT_OFFICE_LNG = 75.97612159776808;
export const DEFAULT_OFFICE_RADIUS_M = 500;
export const DEFAULT_OFFICE_LABEL = 'Wired In Coworks, Kottakkal';

export type OfficeGeoConfig = {
  lat: number;
  lng: number;
  radiusM: number;
  label: string;
};

export type CheckInPosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  distanceM: number;
};

export type OfficeLocationErrorCode = 'denied' | 'unavailable' | 'timeout' | 'out_of_range' | 'unsupported';

export type GeolocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

export class OfficeLocationError extends Error {
  code: OfficeLocationErrorCode;
  distanceM?: number;

  constructor(code: OfficeLocationErrorCode, message: string, distanceM?: number) {
    super(message);
    this.name = 'OfficeLocationError';
    this.code = code;
    this.distanceM = distanceM;
  }
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earth = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return earth * c;
}

export function resolveOfficeConfig(partial?: Partial<OfficeGeoConfig> | null): OfficeGeoConfig {
  return {
    lat: typeof partial?.lat === 'number' ? partial.lat : DEFAULT_OFFICE_LAT,
    lng: typeof partial?.lng === 'number' ? partial.lng : DEFAULT_OFFICE_LNG,
    radiusM: typeof partial?.radiusM === 'number' ? partial.radiusM : DEFAULT_OFFICE_RADIUS_M,
    label: partial?.label?.trim() || DEFAULT_OFFICE_LABEL,
  };
}

/** Why: Know if Retry can show the browser prompt vs needs Site Settings unlock. */
export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'unknown';
    }
    const result = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    });
    if (result.state === 'granted' || result.state === 'prompt' || result.state === 'denied') {
      return result.state;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

const LOCATION_DENIED_MESSAGE =
  'Location is blocked for this site. Follow the steps below for your device, then tap “I’ve allowed location”.';

/**
 * Why: When the user flips Location to Allow in system/site settings,
 * Chrome/Edge fire onchange — auto-retry without another click when possible.
 */
export function watchGeolocationPermission(
  onChange: (state: GeolocationPermissionState) => void
): () => void {
  let cancelled = false;
  let statusRef: PermissionStatus | null = null;

  const handleChange = () => {
    if (cancelled || !statusRef) return;
    const s = statusRef.state;
    if (s === 'granted' || s === 'prompt' || s === 'denied') {
      onChange(s);
    } else {
      onChange('unknown');
    }
  };

  void (async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
      const status = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });
      if (cancelled) return;
      statusRef = status;
      status.addEventListener('change', handleChange);
    } catch {
      // Safari / older browsers — no PermissionStatus events
    }
  })();

  return () => {
    cancelled = true;
    if (statusRef) {
      try {
        statusRef.removeEventListener('change', handleChange);
      } catch {
        /* ignore */
      }
    }
  };
}

/**
 * Request current GPS and verify it is within the office geofence.
 * Always asks for a fresh reading (maximumAge: 0) so Retry can re-prompt when allowed.
 */
export function getCheckInPosition(config?: Partial<OfficeGeoConfig> | null): Promise<CheckInPosition> {
  const office = resolveOfficeConfig(config);

  if (typeof window === 'undefined' || !navigator.geolocation) {
    return Promise.reject(
      new OfficeLocationError(
        'unsupported',
        'Location is not available in this browser. Use HTTPS or choose WFH.'
      )
    );
  }

  if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) {
    return Promise.reject(
      new OfficeLocationError(
        'unavailable',
        'Location requires a secure connection (HTTPS). Open the app over HTTPS, or choose WFH.'
      )
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const accuracy =
          typeof pos.coords.accuracy === 'number' && Number.isFinite(pos.coords.accuracy)
            ? pos.coords.accuracy
            : null;
        const distanceM = haversineMeters(latitude, longitude, office.lat, office.lng);

        if (distanceM > office.radiusM) {
          const distanceLabel =
            distanceM >= 1000
              ? `${(distanceM / 1000).toFixed(1)} km`
              : `${Math.round(distanceM)} m`;
          reject(
            new OfficeLocationError(
              'out_of_range',
              `You are about ${distanceLabel} from ${office.label}. Move within ${office.radiusM} m to check in as Office.`,
              distanceM
            )
          );
          return;
        }

        resolve({ latitude, longitude, accuracy, distanceM });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new OfficeLocationError('denied', LOCATION_DENIED_MESSAGE));
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(
            new OfficeLocationError(
              'timeout',
              'Location timed out. Move near a window or try again, or choose WFH.'
            )
          );
          return;
        }
        reject(
          new OfficeLocationError(
            'unavailable',
            'Could not read your location. Enable GPS and try again, or choose WFH.'
          )
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  });
}
