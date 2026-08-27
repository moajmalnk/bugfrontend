/**
 * Why: Checkout must allocate hours_today across optional non-project slots
 * (lunch, breaks, Growth Glimpse) plus per-project hours so totals always tally.
 * Users mark Attended / Skipped; skipped slots free 0.5h into projects or Other.
 */

export const LUNCH_HOURS = 0.5;
export const BREAK_HOURS = 0.5;
export const GROWTH_GLIMPSE_HOURS = 0.5;
export const HOURS_TALLY_TOLERANCE = 0.05;

export type AttendanceSlot = 'lunch' | 'breaks' | 'growth_glimpse';

export type TimeAllocation = {
  lunch_hours: number;
  break_hours: number;
  growth_glimpse_hours: number;
  other_hours: number;
  lunch_attended: boolean;
  breaks_attended: boolean;
  growth_glimpse_attended: boolean;
};

function coerceAttended(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === '0' || value === 'false' || value === 'no') return false;
  if (value === 1 || value === '1' || value === 'true' || value === 'yes') return true;
  return fallback;
}

/** Tue / Thu / Sat in Asia/Kolkata (Growth Glimpse days). */
export function isGrowthGlimpseDay(dateStr: string): boolean {
  const raw = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  // Midday UTC avoids DST edge cases; weekday is resolved in IST.
  const d = new Date(`${raw}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return false;
  const weekday = d.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Kolkata',
  });
  return weekday === 'Tue' || weekday === 'Thu' || weekday === 'Sat';
}

/**
 * Build fixed-slot hours from attendance flags + weekday gate.
 * Legacy callers without flags default to attended.
 */
export function buildFixedTimeAllocation(
  dateStr: string,
  attendance?: Partial<
    Pick<TimeAllocation, 'lunch_attended' | 'breaks_attended' | 'growth_glimpse_attended'>
  >
): Omit<TimeAllocation, 'other_hours'> {
  const glimpseDay = isGrowthGlimpseDay(dateStr);
  const lunchAttended = attendance?.lunch_attended ?? true;
  const breaksAttended = attendance?.breaks_attended ?? true;
  const glimpseAttended = attendance?.growth_glimpse_attended ?? true;

  return {
    lunch_attended: lunchAttended,
    breaks_attended: breaksAttended,
    growth_glimpse_attended: glimpseDay ? glimpseAttended : false,
    lunch_hours: lunchAttended ? LUNCH_HOURS : 0,
    break_hours: breaksAttended ? BREAK_HOURS : 0,
    growth_glimpse_hours: glimpseDay && glimpseAttended ? GROWTH_GLIMPSE_HOURS : 0,
  };
}

export function defaultTimeAllocation(
  dateStr: string,
  otherHours = 0,
  attendance?: Partial<
    Pick<TimeAllocation, 'lunch_attended' | 'breaks_attended' | 'growth_glimpse_attended'>
  >
): TimeAllocation {
  return {
    ...buildFixedTimeAllocation(dateStr, attendance),
    other_hours: clampHours(otherHours),
  };
}

/**
 * Toggle a fixed slot; hours are derived from attendance (never free-typed).
 */
export function withSlotAttendance(
  allocation: TimeAllocation,
  dateStr: string,
  slot: AttendanceSlot,
  attended: boolean
): TimeAllocation {
  const nextAttendance = {
    lunch_attended: allocation.lunch_attended,
    breaks_attended: allocation.breaks_attended,
    growth_glimpse_attended: allocation.growth_glimpse_attended,
  };
  if (slot === 'lunch') nextAttendance.lunch_attended = attended;
  if (slot === 'breaks') nextAttendance.breaks_attended = attended;
  if (slot === 'growth_glimpse') nextAttendance.growth_glimpse_attended = attended;

  return {
    ...buildFixedTimeAllocation(dateStr, nextAttendance),
    other_hours: clampHours(allocation.other_hours),
  };
}

export function clampHours(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(24, Math.round(value * 10) / 10);
}

export function sumProjectHours(hoursList: Array<number | undefined | null>): number {
  return hoursList.reduce<number>((sum, h) => sum + clampHours(Number(h) || 0), 0);
}

export function allocationFixedTotal(allocation: TimeAllocation): number {
  return (
    clampHours(allocation.lunch_hours) +
    clampHours(allocation.break_hours) +
    clampHours(allocation.growth_glimpse_hours) +
    clampHours(allocation.other_hours)
  );
}

export function allocationTotal(
  allocation: TimeAllocation,
  projectHours: Array<number | undefined | null>
): number {
  return Math.round((allocationFixedTotal(allocation) + sumProjectHours(projectHours)) * 10) / 10;
}

export function hoursTallyMatches(
  hoursToday: number,
  allocation: TimeAllocation,
  projectHours: Array<number | undefined | null>
): boolean {
  const target = clampHours(hoursToday);
  const allocated = allocationTotal(allocation, projectHours);
  return Math.abs(target - allocated) <= HOURS_TALLY_TOLERANCE;
}

export function formatHoursShort(value: number): string {
  const n = clampHours(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function parseTimeAllocationFromRow(raw: unknown, dateStr: string): TimeAllocation {
  const defaults = defaultTimeAllocation(dateStr, 0);
  if (!raw) return defaults;
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return defaults;
    }
  }
  if (!obj || typeof obj !== 'object') return defaults;
  const row = obj as Record<string, unknown>;
  return defaultTimeAllocation(dateStr, Number(row.other_hours) || 0, {
    lunch_attended: coerceAttended(row.lunch_attended, true),
    breaks_attended: coerceAttended(row.breaks_attended, true),
    growth_glimpse_attended: coerceAttended(row.growth_glimpse_attended, true),
  });
}
