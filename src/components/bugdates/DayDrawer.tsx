import { useEffect, useState } from 'react';
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

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose} role="presentation">
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bugdates-day-title"
      >
        <div className="relative border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20 pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3 px-4 py-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-1.5 text-white shadow-md">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <h2 id="bugdates-day-title" className="truncate text-lg font-bold text-gray-900 dark:text-white">
                  {label}
                </h2>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {items.length} item{items.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10 border-gray-200 dark:border-gray-700 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
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
            const key = `${item.source || 'x'}-${item.id || idx}-${item.occurrence_date}-${idx}`;
            return (
              <article
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/90 p-4 shadow-md transition-all hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="relative">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${chip}`}>
                    {String(layer).replace(/_/g, ' ')}
                  </span>
                  {item.status && item.status !== 'approved' && (
                    <span className="rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:text-gray-300">
                      {item.status}
                    </span>
                  )}
                </div>
                <h3 className="font-bold leading-snug text-gray-900 dark:text-white">{item.title}</h3>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{item.description}</p>
                )}
                {item.is_half_day && (
                  <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Half day · {item.half_day_type === 'second_half' ? 'Second half' : 'First half'}
                  </p>
                )}
                {item.location_or_link && (
                  <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">{item.location_or_link}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {(layer === 'observance' || layer === 'holiday' || layer === 'company_event') &&
                    canCreative &&
                    !!item.id && (
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl h-10 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-md"
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
                        className="rounded-xl h-10 border-gray-200 dark:border-gray-700 font-medium"
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
                    <Button asChild type="button" size="sm" variant="ghost" className="rounded-xl h-10">
                      <Link to={`../projects/${item.project_id}`}>Open project</Link>
                    </Button>
                  )}
                </div>
                </div>
              </article>
            );
          })}

          {sessionForm.event_id > 0 && canManage && (
            <section className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/90 p-4 shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-lg bg-teal-500 p-1.5 text-white">
                  <NotebookPen className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Growth Glimpse session</h3>
              </div>
              <div className="flex flex-col gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sess-agenda" className="text-sm font-semibold">Agenda topic</Label>
                  <Input
                    id="sess-agenda"
                    className="rounded-xl h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
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
                  <Label htmlFor="sess-notes" className="text-sm font-semibold">Summary notes</Label>
                  <Textarea
                    id="sess-notes"
                    className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
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
                  <Label htmlFor="sess-link" className="text-sm font-semibold">Recording / Drive link</Label>
                  <Input
                    id="sess-link"
                    className="rounded-xl h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="rounded-xl h-11 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-md"
                    disabled={!!busy}
                    onClick={() => handleSaveSession(false)}
                  >
                    {busy === 'session' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save session'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 border-gray-200 dark:border-gray-700 font-medium"
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
    </div>
  );
}
