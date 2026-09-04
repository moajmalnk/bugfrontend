import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import {
  ListPageHeader,
  ListPageShell,
} from '@/components/layout/list-page';
import { EventFormModal } from '@/components/bugdates/EventFormModal';
import { DayDrawer } from '@/components/bugdates/DayDrawer';
import {
  deleteBugDatesEvent,
  getBugDatesCalendar,
  listGrowthSessions,
  type BugDatesCalendarItem,
  type BugDatesEvent,
  type GrowthProgramSession,
} from '@/services/bugDatesService';
import { bugDatesItemChipClass } from '@/lib/bugDatesUi';
import { cn, getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';

const FILTERS: { key: string; label: string; dot: string }[] = [
  { key: 'growth_program', label: 'Programs', dot: 'bg-teal-500' },
  { key: 'observance', label: 'Observances', dot: 'bg-amber-500' },
  { key: 'holiday', label: 'Holidays', dot: 'bg-rose-500' },
  { key: 'company_event', label: 'Company', dot: 'bg-indigo-500' },
  { key: 'leave', label: 'Leave', dot: 'bg-sky-500' },
  { key: 'wfh', label: 'WFH', dot: 'bg-cyan-600' },
  { key: 'birthday', label: 'Birthdays', dot: 'bg-pink-500' },
  { key: 'anniversary', label: 'Anniversaries', dot: 'bg-fuchsia-500' },
  { key: 'project_milestone', label: 'Milestones', dot: 'bg-orange-500' },
];

function ConfirmDeleteModal({
  open,
  title,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-transparent to-orange-50/50 dark:from-rose-950/20 dark:via-transparent dark:to-orange-950/20 pointer-events-none" />
        <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete event?</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Remove{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{title}</span> from
            BugDates. This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl h-11 border-gray-200 dark:border-gray-700"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl h-11 font-semibold shadow-lg"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BugDates() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser);
  const canView =
    hasPermissionOrAdmin(role, hasPermission, 'BUGDATES_VIEW') ||
    hasPermissionOrAdmin(role, hasPermission, 'LEAVE_VIEW') ||
    role === 'developer' ||
    role === 'creator';
  const canManage = hasPermissionOrAdmin(role, hasPermission, 'BUGDATES_MANAGE');
  const canCreative =
    hasPermissionOrAdmin(role, hasPermission, 'CREATIVE_CREATE') || canManage;

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [items, setItems] = useState<BugDatesCalendarItem[]>([]);
  const [sessions, setSessions] = useState<GrowthProgramSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BugDatesEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BugDatesCalendarItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return {
      from: format(gridStart, 'yyyy-MM-dd'),
      to: format(gridEnd, 'yyyy-MM-dd'),
      days: eachDayOfInterval({ start: gridStart, end: gridEnd }),
    };
  }, [cursor]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [cal, sess] = await Promise.all([
        getBugDatesCalendar({
          from: range.from,
          to: range.to,
          categories: filters.length ? filters : undefined,
        }),
        listGrowthSessions({ from: range.from, to: range.to }),
      ]);
      setItems(cal.items || []);
      setSessions(sess || []);
    } catch (e) {
      toast({
        title: 'Failed to load BugDates',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [canView, range.from, range.to, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, BugDatesCalendarItem[]>();
    for (const item of items) {
      const key = item.occurrence_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const selectedItems = selectedDate ? byDate.get(selectedDate) || [] : [];
  const eventCount = useMemo(
    () => items.filter((i) => i.source === 'event' || !i.source).length || items.length,
    [items]
  );

  const toggleFilter = (key: string) => {
    setFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    try {
      await deleteBugDatesEvent(deleteTarget.id);
      toast({ title: 'Event deleted' });
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!canView) {
    return (
      <ListPageShell>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-cyan-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-cyan-950/20 rounded-2xl" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl">
              <CalendarDays className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
              Access restricted
            </h3>
            <p className="mx-auto max-w-md text-lg text-gray-600 dark:text-gray-400">
              You do not have permission to view BugDates.
            </p>
          </div>
        </div>
      </ListPageShell>
    );
  }

  return (
    <ListPageShell>
      <ListPageHeader
        icon={<CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />}
        title="BugDates"
        description="Programs, observances, holidays, leave & team milestones"
        accentBarClassName="from-blue-600 to-indigo-700"
        underlayClassName="from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20"
        count={eventCount}
        countIcon={<CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-300" />}
        countClassName="from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
        loading={loading}
        actions={
          canManage ? (
            <Button
              type="button"
              variant="default"
              size="lg"
              className="h-11 sm:h-12 w-full sm:w-auto px-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              New event
            </Button>
          ) : undefined
        }
      />

      {/* Filter panel — Bugs/Fixes glass card pattern */}
      <div className="relative w-full min-w-0">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
          <div className="space-y-3 sm:space-y-4 min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                Filter calendar
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const on = filters.includes(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleFilter(f.key)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md',
                      on
                        ? 'border-blue-500/60 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 ring-2 ring-blue-500/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full shrink-0', f.dot)} />
                    {f.label}
                  </button>
                );
              })}
            </div>

            {filters.length > 0 ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters([])}
                  className="h-10 sm:h-11 w-full sm:w-auto px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                >
                  Clear filters
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Calendar — glass card */}
      <div className="relative w-full min-w-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-indigo-50/30 dark:from-gray-800/30 dark:to-indigo-900/30 rounded-2xl pointer-events-none" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200/50 dark:border-gray-700/50 px-3 sm:px-5 py-3 sm:py-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md"
              onClick={() => setCursor((c) => subMonths(c, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {format(cursor, 'MMMM yyyy')}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200/60 dark:bg-gray-700/60 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="bg-white/90 dark:bg-gray-900/90 py-2 sm:py-2.5">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-px bg-gray-200/60 dark:bg-gray-700/60">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[72px] sm:min-h-[96px] bg-white dark:bg-gray-900 p-2"
                >
                  <Skeleton className="mb-2 h-5 w-6 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="mt-1 h-4 w-3/4 rounded-lg hidden sm:block" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-200/60 dark:bg-gray-700/60">
              {range.days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayItems = byDate.get(key) || [];
                const inMonth = isSameMonth(day, cursor);
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      'min-h-[72px] sm:min-h-[96px] p-1 sm:p-1.5 text-left transition-all duration-200',
                      'bg-white dark:bg-gray-900 hover:bg-blue-50/60 dark:hover:bg-blue-950/30',
                      !inMonth && 'opacity-40 bg-gray-50 dark:bg-gray-950/50',
                      selectedDate === key &&
                        'ring-2 ring-inset ring-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20'
                    )}
                  >
                    <div
                      className={cn(
                        'mb-1 inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl text-xs font-bold',
                        isToday
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md'
                          : 'text-gray-800 dark:text-gray-200'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayItems.slice(0, 3).map((item, idx) => {
                        return (
                          <span
                            key={`${key}-${idx}`}
                            className={cn(
                              'truncate rounded-lg px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold shadow-sm',
                              bugDatesItemChipClass(item)
                            )}
                            title={item.title}
                          >
                            {item.title}
                          </span>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <span className="px-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          +{dayItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {canManage && selectedItems.some((i) => i.source === 'event') && (
        <div className="relative w-full min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 flex flex-wrap gap-2">
            {selectedItems
              .filter((i) => i.source === 'event' && i.id)
              .slice(0, 3)
              .map((item) => (
                <div key={`admin-${item.id}`} className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md font-medium"
                    onClick={() => {
                      setEditing(item);
                      setFormOpen(true);
                    }}
                  >
                    Edit {item.title.slice(0, 24)}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-10 w-10 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      <DayDrawer
        open={!!selectedDate}
        date={selectedDate}
        items={selectedItems}
        canManage={canManage}
        canCreative={canCreative}
        sessions={sessions}
        onClose={() => setSelectedDate(null)}
        onRefresh={load}
      />

      <EventFormModal
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={load}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={deleteTarget?.title || ''}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </ListPageShell>
  );
}
