import { ENV } from '@/lib/env';
import { toLocalCalendarDateString } from '@/lib/dateUtils';
import { readApiJson } from '@/lib/apiError';

export type ServerClock = {
  server_today: string;
  server_now?: string;
  server_time?: string;
  timezone?: string;
};

export type DeviceClockSkew = {
  mismatched: boolean;
  message: string;
  clientToday: string;
  serverToday: string;
  clientLabel: string;
  serverLabel: string;
};

function formatCalendarLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function buildDeviceClockSkewMessage(clientToday: string, serverToday: string): string {
  const clientLabel = formatCalendarLabel(clientToday);
  const serverLabel = formatCalendarLabel(serverToday);
  return `Your device shows ${clientLabel}, but the server date is ${serverLabel}. Turn on "Set time and date automatically" in system settings, then try again.`;
}

export async function fetchServerClock(): Promise<ServerClock> {
  const res = await fetch(`${ENV.API_URL}/server_time.php`, {
    method: 'GET',
    cache: 'no-store',
  });
  const data = await readApiJson<{
    success?: boolean;
    server_today?: string;
    server_now?: string;
    server_time?: string;
    timezone?: string;
    message?: string;
  }>(res);

  if (!res.ok || !data.server_today) {
    throw new Error(data.message || 'Could not verify server time.');
  }

  return {
    server_today: data.server_today,
    server_now: data.server_now,
    server_time: data.server_time,
    timezone: data.timezone,
  };
}

export async function getDeviceClockSkewDetails(): Promise<DeviceClockSkew | null> {
  try {
    const server = await fetchServerClock();
    const clientToday = toLocalCalendarDateString(new Date());
    const serverToday = server.server_today;

    if (clientToday === serverToday) {
      return null;
    }

    return {
      mismatched: true,
      clientToday,
      serverToday,
      clientLabel: formatCalendarLabel(clientToday),
      serverLabel: formatCalendarLabel(serverToday),
      message: buildDeviceClockSkewMessage(clientToday, serverToday),
    };
  } catch {
    return null;
  }
}

export async function assertDeviceClockMatchesServer(actionLabel = 'continue'): Promise<void> {
  const skew = await getDeviceClockSkewDetails();
  if (skew?.mismatched) {
    throw new Error(`${skew.message} You cannot ${actionLabel} until the device clock is corrected.`);
  }
}
