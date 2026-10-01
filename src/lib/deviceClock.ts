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

  // Why: During Vercel/Cloudflare rate-limit bursts, skip clock check instead of
  // showing a red console error on the login page.
  if (res.status === 429) {
    throw new Error('RATE_LIMITED');
  }

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

const CLOCK_CACHE_TTL_MS = 120_000;
let clockCache: { server: ServerClock; at: number; clientToday: string } | null = null;
let clockInflight: Promise<ServerClock> | null = null;

/**
 * Why: Check-in / checkout used to wait on a server_time round trip before the
 * real submit. A short cache (warmed when the dialog opens) makes submit instant;
 * it is dropped if the device calendar date or clock moves, so skew is still caught.
 */
async function getServerClockCached(): Promise<ServerClock> {
  const now = Date.now();
  const clientToday = toLocalCalendarDateString(new Date());
  if (
    clockCache &&
    now >= clockCache.at &&
    now - clockCache.at < CLOCK_CACHE_TTL_MS &&
    clockCache.clientToday === clientToday
  ) {
    return clockCache.server;
  }
  if (!clockInflight) {
    clockInflight = fetchServerClock()
      .then((server) => {
        clockCache = { server, at: Date.now(), clientToday: toLocalCalendarDateString(new Date()) };
        return server;
      })
      .finally(() => {
        clockInflight = null;
      });
  }
  return clockInflight;
}

export function prefetchServerClock(): void {
  void getServerClockCached().catch(() => undefined);
}

export async function getDeviceClockSkewDetails(): Promise<DeviceClockSkew | null> {
  try {
    const server = await getServerClockCached();
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
