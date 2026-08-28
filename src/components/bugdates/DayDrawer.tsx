import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Loader2,
  Palette,
  ListTodo,
  X,
  NotebookPen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  BUGDATES_LAYER_COLORS,
  generateBugCreativeCard,
  generateBugDatesTodo,
  saveGrowthSession,
  type BugDatesCalendarItem,
  type GrowthProgramSession,
} from '@/services/bugDatesService';
import { format, parseISO } from 'date-fns';

const MILESTONE_LABELS: Record<string, string> = {
  deadline_date: 'Deadline',
  expected_publish_date: 'Expected Publish',
};

/**
 * Why: overlay items (milestones, leave) may omit title in older API payloads;
 * drawer must still show readable labels on mobile.
 */
function getDayItemTitle(item: BugDatesCalendarItem): string {
  const title = String(item.title ?? '').trim();
  if (title) return title;

  const layer = item.layer || item.category || '';
  const name = String(item.username ?? '').trim();

  if (layer === 'leave') {
    const typeName = String(item.leave_type_name ?? 'Leave').trim();
    return name ? `${name} — ${typeName}` : typeName;
  }
  if (layer === 'wfh') {
    return name ? `${name} — WFH` : 'Work from home';
  }
  if (item.project_name) {
    const mk = item.milestone_key ? MILESTONE_LABELS[item.milestone_key] ?? item.milestone_key : 'Milestone';
    return `${item.project_name} — ${mk}`;
  }
  if (name) return name;
  return 'Scheduled item';
}

function getLayerLabel(layer: string): string {
  switch (layer) {
    case 'project_milestone':
      return 'Milestone';
    case 'growth_program':
      return 'Program';
    case 'company_event':
      return 'Company';
    default:
      return String(layer).replace(/_/g, ' ');
  }
}

type Props = {
  open: boolean;
  date: string | null;
  items: BugDatesCalendarItem[];
  canManage: boolean;
  canCreative: boolean;
  sessions: GrowthProgramSession[];
  onClose: () => void;
  onRefresh: () => void;
};

export function DayDrawer({
  open,
  date,
  items,
  canManage,
  canCreative,
  sessions,
  onClose,
  onRefresh,
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [sessionForm, setSessionForm] = useState({
    event_id: 0,
    agenda_topic: '',
    summary_notes: '',
    recording_or_drive_link: '',
  });

  useEffect(() => {
    if (!open) return;
    const onPop = () => onClose();
    window.history.pushState({ modal: 'bugdates-day' }, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    const growth = items.find((i) => i.layer === 'growth_program' || i.category === 'growth_program');
    const existing = growth
      ? sessions.find((s) => s.event_id === growth.id && s.session_date === date)
      : null;
    setSessionForm({
      event_id: growth?.id || 0,
      agenda_topic: existing?.agenda_topic || '',
      summary_notes: existing?.summary_notes || '',
      recording_or_drive_link: existing?.recording_or_drive_link || '',
    });
  }, [items, sessions, date]);

  if (!open || !date) return null;

  const label = (() => {
    try {
      return format(parseISO(date), 'EEEE, MMM d, yyyy');
    } catch {
      return date;
    }
  })();

  const handleCreative = async (item: BugDatesCalendarItem) => {
    if (!item.id || busy) return;
    setBusy(`creative-${item.id}`);
    try {
      const res = await generateBugCreativeCard({
        event_id: item.id,
        occurrence_date: date,
      });
      toast({
        title: res.already_exists ? 'Creative card already queued' : 'Creative card created',
        description: 'Opening BugCreative…',
      });
      navigate('../bugcreative');
    } catch (e) {
      toast({
        title: 'Could not generate creative',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleTodo = async (item: BugDatesCalendarItem) => {
    if (!item.id || busy) return;
    setBusy(`todo-${item.id}`);
    try {
      const res = await generateBugDatesTodo({
        event_id: item.id,
        occurrence_date: date,
      });
      toast({
        title: res.already_exists ? 'Task already exists' : 'Shared task created',
      });
      onRefresh();
    } catch (e) {
      toast({
        title: 'Could not create task',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleSaveSession = async (generateTodo = false) => {
    if (!sessionForm.event_id || !date || busy) return;
    setBusy('session');
    try {
      await saveGrowthSession({
        event_id: sessionForm.event_id,
        session_date: date,
        agenda_topic: sessionForm.agenda_topic.slice(0, 255) || null,
        summary_notes: sessionForm.summary_notes.slice(0, 10000) || null,
        recording_or_drive_link: sessionForm.recording_or_drive_link.slice(0, 2000) || null,
        generate_todo: generateTodo,
      });
      toast({ title: 'Session saved' });
      onRefresh();
    } catch (e) {
      toast({
        title: 'Could not save session',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/50 sm:bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden border-l border-gray-200/50 bg-white shadow-2xl supports-[height:100dvh]:h-[100dvh] dark:border-gray-700/50 dark:bg-gray-900 sm:w-[28rem] sm:max-w-[28rem] sm:bg-white/95 sm:dark:bg-gray-900/95 sm:backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bugdates-day-title"
      >
        <div className="relative shrink-0 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-3 px-4 py-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex min-w-0 items-start gap-2">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-1.5 text-white shadow-md">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <h2
                  id="bugdates-day-title"
                  className="min-w-0 break-words text-base font-bold leading-snug text-gray-900 dark:text-white sm:text-lg"
                >
                  {label}
                </h2>
              </div>
              <p className="ps-9 text-xs font-medium text-gray-500 dark:text-gray-400">
                {items.length} item{items.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl border-gray-200 dark:border-gray-700"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-4 py-4 pb-6 custom-scrollbar sm:gap-4 sm:pb-4">
          {items.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Nothing scheduled for this day.
              </p>
            </div>
          )}

          {items.map((item, idx) => {
            const layer = item.layer || item.category || 'company_event';
            const chip = BUGDATES_LAYER_COLORS[layer] || 'bg-slate-500 text-white';
            const displayTitle = getDayItemTitle(item);
            const key = `${item.source || 'x'}-${item.id || item.project_id || idx}-${item.occurrence_date}-${idx}`;
            return (
              <article
                key={key}
                className="rounded-2xl border border-gray-200/60 bg-white p-3 shadow-md dark:border-gray-700/60 dark:bg-gray-900 sm:p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded-xl px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:px-2.5 sm:py-1 ${chip}`}
                  >
                    {getLayerLabel(layer)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="break-words text-sm font-bold leading-snug text-gray-900 dark:text-white sm:text-base">
                      {displayTitle}
                    </p>
                    {item.status && item.status !== 'approved' && (
                      <span className="inline-flex rounded-xl border border-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {item.status}
                      </span>
                    )}
                    {item.description && (
                      <p className="break-words text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {item.description}
                      </p>
                    )}
                    {item.is_half_day && (
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Half day · {item.half_day_type === 'second_half' ? 'Second half' : 'First half'}
                      </p>
                    )}
                    {item.location_or_link && (
                      <p className="break-all text-xs text-gray-500 dark:text-gray-400">
                        {item.location_or_link}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                      {(layer === 'observance' || layer === 'holiday' || layer === 'company_event') &&
                        canCreative &&
                        !!item.id && (
                          <Button
                            type="button"
                            size="sm"
                            className="h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-800 sm:w-auto"
                            disabled={!!busy}
                            onClick={() => handleCreative(item)}
                          >
                            {busy === `creative-${item.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Palette className="h-3.5 w-3.5" />
                            )}
                            <span className="ms-1.5">Generate BugCreative Card</span>
                          </Button>
                        )}
                      {(layer === 'growth_program' || layer === 'milestone' || layer === 'project_milestone') &&
                        canManage &&
                        !!item.id && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-10 w-full rounded-xl border-gray-200 font-medium dark:border-gray-700 sm:w-auto"
                            disabled={!!busy}
                            onClick={() => handleTodo(item)}
                          >
                            {busy === `todo-${item.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ListTodo className="h-3.5 w-3.5" />
                            )}
                            <span className="ms-1.5">Create BugToDo</span>
                          </Button>
                        )}
                      {item.project_id && (
                        <Button
                          asChild
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-10 w-full justify-start rounded-xl sm:w-auto"
                        >
                          <Link to={`../projects/${item.project_id}`}>Open project</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {sessionForm.event_id > 0 && canManage && (
            <section className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-md dark:border-gray-700/60 dark:bg-gray-900">
              <div className="mb-4 flex min-w-0 items-start gap-2">
                <div className="shrink-0 rounded-lg bg-teal-500 p-1.5 text-white">
                  <NotebookPen className="h-4 w-4" />
                </div>
                <h3 className="min-w-0 break-words font-bold text-gray-900 dark:text-white">
                  Growth Glimpse session
                </h3>
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sess-agenda" className="text-sm font-semibold">
                    Agenda topic
                  </Label>
                  <Input
                    id="sess-agenda"
                    className="h-11 w-full rounded-xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    maxLength={255}
                    value={sessionForm.agenda_topic}
                    onChange={(e) =>
                      setSessionForm((p) => ({
                        ...p,
                        agenda_topic: e.target.value.slice(0, 255),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sess-notes" className="text-sm font-semibold">
                    Summary notes
                  </Label>
                  <Textarea
                    id="sess-notes"
                    className="min-h-[96px] w-full rounded-xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    maxLength={10000}
                    value={sessionForm.summary_notes}
                    onChange={(e) =>
                      setSessionForm((p) => ({
                        ...p,
                        summary_notes: e.target.value.slice(0, 10000),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sess-link" className="text-sm font-semibold">
                    Recording / Drive link
                  </Label>
                  <Input
                    id="sess-link"
                    className="h-11 w-full rounded-xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    maxLength={2000}
                    value={sessionForm.recording_or_drive_link}
                    onChange={(e) =>
                      setSessionForm((p) => ({
                        ...p,
                        recording_or_drive_link: e.target.value.slice(0, 2000),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 font-semibold text-white shadow-md hover:from-teal-700 hover:to-cyan-700 sm:w-auto"
                    disabled={!!busy}
                    onClick={() => handleSaveSession(false)}
                  >
                    {busy === 'session' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save session'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-gray-200 font-medium dark:border-gray-700 sm:w-auto"
                    disabled={!!busy}
                    onClick={() => handleSaveSession(true)}
                  >
                    Save + weekly report task
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
