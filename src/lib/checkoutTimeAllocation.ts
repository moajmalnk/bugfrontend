/**
 * Why: Checkout must allocate hours_today across fixed non-project slots
 * (lunch, breaks, Growth Glimpse) plus per-project hours so totals always tally.
 */

export const LUNCH_HOURS = 0.5;
export const BREAK_HOURS = 0.5;
export const GROWTH_GLIMPSE_HOURS = 0.5;
export const HOURS_TALLY_TOLERANCE = 0.05;

export type TimeAllocation = {
  lunch_hours: number;
  break_hours: number;
  growth_glimpse_hours: number;
  other_hours: number;
};

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

export function buildFixedTimeAllocation(dateStr: string): Omit<TimeAllocation, 'other_hours'> {
  return {
    lunch_hours: LUNCH_HOURS,
    break_hours: BREAK_HOURS,
    growth_glimpse_hours: isGrowthGlimpseDay(dateStr) ? GROWTH_GLIMPSE_HOURS : 0,
  };
}

export function defaultTimeAllocation(dateStr: string, otherHours = 0): TimeAllocation {
  return {
    ...buildFixedTimeAllocation(dateStr),
    other_hours: clampHours(otherHours),
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
  const fixed = buildFixedTimeAllocation(dateStr);
  return {
    lunch_hours: fixed.lunch_hours,
    break_hours: fixed.break_hours,
    growth_glimpse_hours: fixed.growth_glimpse_hours,
    other_hours: clampHours(Number(row.other_hours) || 0),
  };
}
