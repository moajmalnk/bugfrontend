import type { BugDatesCalendarItem } from '@/services/bugDatesService';
import { BUGDATES_LAYER_COLORS } from '@/services/bugDatesService';

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
