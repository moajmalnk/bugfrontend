import type { BugDatesCalendarItem } from '@/services/bugDatesService';
import { BUGDATES_LAYER_COLORS } from '@/services/bugDatesService';

/**
 * Why: A busy day can carry 10+ items; the month grid shows only three, so
 * holidays and observances must outrank deadlines and leave or they hide behind "+N more".
 */
const LAYER_PRIORITY: Record<string, number> = {
  holiday: 0,
  observance: 1,
  company_event: 2,
  growth_program: 3,
  project_milestone: 4,
  milestone: 4,
  birthday: 5,
  anniversary: 5,
  leave: 6,
  wfh: 7,
};

export function sortBugDatesDayItems<T extends Pick<BugDatesCalendarItem, 'layer' | 'category' | 'title'>>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const pa = LAYER_PRIORITY[a.layer || a.category || ''] ?? 9;
    const pb = LAYER_PRIORITY[b.layer || b.category || ''] ?? 9;
    return pa !== pb ? pa - pb : String(a.title || '').localeCompare(String(b.title || ''));
  });
}

/** Content-calendar layers listed under the month grid. */
export const BUGDATES_CONTENT_LAYERS = ['holiday', 'observance', 'company_event'] as const;

export function isTentativeBugDatesItem(item: Pick<BugDatesCalendarItem, 'description'>): boolean {
  return /^\s*tentative\b/i.test(String(item.description || ''));
}

/** Calendar / drawer chip class for a BugDates item (Official Leave uses amber). */
export function bugDatesItemChipClass(
  item: Pick<BugDatesCalendarItem, 'layer' | 'category' | 'leave_type_code' | 'is_official_leave'>
): string {
  const isOfficial =
    item.is_official_leave === true ||
    String(item.leave_type_code || '').toLowerCase() === 'corporate';
  if (isOfficial) {
    return BUGDATES_LAYER_COLORS.official_leave || 'bg-amber-500/90 text-white';
  }
  const layer = item.layer || item.category || 'company_event';
  return BUGDATES_LAYER_COLORS[layer] || 'bg-slate-500 text-white';
}
