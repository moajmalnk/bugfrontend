import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTemplate, submitWork, WorkSubmission, listMyTasks, UserTask, updateTask, listMySubmissions, deleteSubmission } from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, ClipboardCopy, Clock, FileText, ListTodo, Share2, User, AlertTriangle } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { HourPicker } from '@/components/ui/HourPicker';
import { useAuth } from '@/context/AuthContext';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T } | T;

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DailyUpdate() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState<WorkSubmission>({
    submission_date: todayYMD(),
    start_time: '10:00',
    hours_today: 8,
    completed_tasks: '',
    pending_tasks: '',
    ongoing_tasks: '',
    notes: '',
  });
  // Upcoming tasks preview
  const [tasksLoading, setTasksLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<UserTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<UserTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<string>('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(searchParams.get('month') || ''); // YYYY-MM
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, submission: any | null}>({show: false, submission: null});
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);

  const canSubmit = useMemo(() => {
    const hasDate = !!form.submission_date;
    const hasStart = !!(form.start_time && String(form.start_time).trim());
    const hrs = Number(form.hours_today);
    const hasHours = hrs >= 1 && hrs <= 24;
    
    // Check if at least one task field has content
    const hasTasks = countItems(form.completed_tasks) > 0 || 
                     countItems(form.pending_tasks) > 0 || 
                     countItems(form.ongoing_tasks) > 0 || 
                     countItems(form.notes) > 0;
    
    return hasDate && hasStart && hasHours && hasTasks;
  }, [form]);

  function countItems(text?: string) {
    if (!text) return 0;
    return text
      .split('\n')
      .map((x) => x.trim())
      .filter((x) => x.length > 0).length;
  }

  function formatTime12h(t?: string | null) {
    if (!t) return '----';
    try {
      const d = new Date(`1970-01-01T${t}`);
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return t;
    }
  }

  function getCodoPeriodStart(dateStr: string) {
    const d = new Date(dateStr);
    const day = d.getDate();
    const since = new Date(d);
    if (day <= 5) {
      // previous month 6th
      since.setMonth(since.getMonth() - 1);
      since.setDate(6);
    } else {
      // current month 6th
      since.setDate(6);
    }
    return since.toISOString().slice(0, 10);
  }

  function getCodoPeriodEnd(dateStr: string) {
    const d = new Date(dateStr);
    const day = d.getDate();
    const end = new Date(d);
    if (day <= 5) {
      // current month 5th
      end.setDate(5);
    } else {
      // next month 5th
      end.setMonth(end.getMonth() + 1);
      end.setDate(5);
    }
    return end.toISOString().slice(0, 10);
  }

  // Handle month tab clicks and update URL
  const handleMonthTabClick = (monthKey: string) => {
    setActiveMonth(monthKey);
    const newParams = new URLSearchParams(searchParams);
    if (monthKey) {
      newParams.set('month', monthKey);
    } else {
      newParams.delete('month');
    }
    setSearchParams(newParams);
  };

  function computeTotalsInRange(list: any[], from: string, to: string) {
    const fromTs = new Date(from).getTime();
    const toTs = new Date(to).getTime();
    let days = 0;
    let hours = 0;
    for (const s of list) {
      const t = new Date(s.submission_date).getTime();
      if (t >= fromTs && t <= toTs) {
        days += 1;
        hours += Number(s.hours_today || 0);
      }
    }
    return { days, hours };
  }

  function getMonthRange(dateStr: string) {
    const base = new Date(dateStr);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }

  const { monthHours, monthDays } = useMemo(() => {
    const { from, to } = getMonthRange(form.submission_date);
    const totals = computeTotalsInRange(submissions, from, to);
    return { monthHours: totals.hours, monthDays: totals.days };
  }, [form.submission_date, submissions]);

  function monthKey(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  function monthLabel(key: string, list: any[]) {
    const [y,m] = key.split('-').map(Number);
    const d = new Date(y, (m||1)-1, 1);
    const name = d.toLocaleDateString(undefined, { month: 'short' }).toLowerCase();
    const rangeStart = new Date(y, (m||1)-1, 1).toISOString().slice(0,10);
    const rangeEnd = new Date(y, (m||1), 0).toISOString().slice(0,10);
    const { days, hours } = computeTotalsInRange(list, rangeStart, rangeEnd);
    return `${name} ${y} (${hours} hours) (${days} days)`;
  }

  function formatSubmissionText(s: any) {
    const d = new Date(s.submission_date);
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
    const dateText = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${weekday}`;
    const startText = formatTime12h(s.start_time);
    const c = (s.completed_tasks || '').trim();
    const p = (s.pending_tasks || '').trim();
    const o = (s.ongoing_tasks || '').trim();
    const u = (s.notes || '').trim();
    const cCount = countItems(c);
    const pCount = countItems(p);
    const oCount = countItems(o);
    const uCount = countItems(u);
    let body =
      `🧾 CODO Daily Work Update — User\n` +
      `📅 Date: ${dateText}\n` +
      `🕘 Start Time: ${startText}\n` +
      `⏱ Today’s Working Hours: ${Number(s.hours_today || 0)} Hours`;

    // Totals for CODO period
    const since = getCodoPeriodStart(s.submission_date);
    const to = s.submission_date;
    const { days, hours } = computeTotalsInRange(submissions, since, to);
    const sinceLabel = new Date(since).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    body += `\n📊 Total Working Days (Since ${sinceLabel}): ${days} ${days===1?'Day':'Days'}`;
    body += `\n🧮 Total Hours Completed : ${hours} hours`;

    const sections: string[] = [];
    if (cCount > 0) sections.push(`✅ Completed (${cCount})\n\n${c}`);
    if (pCount > 0) sections.push(`⌛ Pending (${pCount})\n\n${p}`);
    if (oCount > 0) sections.push(`🔄 Ongoing (${oCount})\n\n${o}`);
    if (uCount > 0) sections.push(`🔥 Upcoming (${uCount})\n\n${u}`);

    if (sections.length) body += `\n\n` + sections.join(`\n\n`);
    return body;
  }

  async function onSubmit() {
    try {
      setLoading(true);
      setError(null);
      // Client-side validation for mandatory fields
      if (!form.submission_date) {
        throw new Error('Date is required');
      }
      if (!form.start_time || String(form.start_time).trim() === '') {
        throw new Error('Start Time is required');
      }
      const hoursNum = Number(form.hours_today);
      if (!(hoursNum >= 1 && hoursNum <= 24)) {
        throw new Error("Today's Hours must be between 1 and 24");
      }
      
      // Validate that at least one task field has content
      const hasTasks = countItems(form.completed_tasks) > 0 || 
                       countItems(form.pending_tasks) > 0 || 
                       countItems(form.ongoing_tasks) > 0 || 
                       countItems(form.notes) > 0;
      if (!hasTasks) {
        throw new Error('Please enter at least one task in Completed, Pending, Ongoing, or Upcoming fields');
      }
      const payload = { ...form };
      const res = await submitWork(payload);
      if ((res as any)?.success === false) throw new Error((res as any)?.message || 'Failed');
      toast({ title: 'Daily submission saved' });
      // Optimistically merge into local submissions so tabs/cards update immediately
      setSubmissions((prev) => {
        const existsIdx = prev.findIndex((x) => x.submission_date === form.submission_date);
        const merged = [...prev];
        const record = {
          submission_date: form.submission_date,
          start_time: form.start_time,
          hours_today: form.hours_today,
          completed_tasks: form.completed_tasks,
          pending_tasks: form.pending_tasks,
          ongoing_tasks: form.ongoing_tasks,
          notes: form.notes,
        } as any;
        if (existsIdx >= 0) merged[existsIdx] = { ...merged[existsIdx], ...record };
        else merged.push(record);
        // sort desc by date
        merged.sort((a,b)=> new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime());
        return merged;
      });
      // Ensure active tab is the month just saved
      setActiveMonth(monthKey(form.submission_date));
      // Then refresh from server in background
      loadSubmissions(form.submission_date);
      // Reset editing flag
      setIsEditingSubmission(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }

  async function onCopyTemplate() {
    try {
      setLoading(true);
      setError(null);
      const { data }: any = await getTemplate(form.submission_date);
      const text = data?.text || '';
      setTemplate(text);
      await navigator.clipboard.writeText(text);
      toast({ title: 'WhatsApp text copied' });
    } catch (e: any) {
      setError(e?.message || 'Failed to generate template');
    } finally {
      setLoading(false);
    }
  }

  async function onCopyPreview() {
    try {
      await navigator.clipboard.writeText(template || '');
      toast({ title: 'Preview copied' });
    } catch (e) {
      toast({ title: 'Copy failed' });
    }
  }

  async function onSharePreview() {
    const text = template || '';
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Daily Work Update', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Copied – paste to share' });
      }
    } catch {
      // user cancelled or share failed; noop
    }
  }

  // Live local preview (does not require backend)
  useEffect(() => {
    const weekday = new Date(form.submission_date).toLocaleDateString(undefined, { weekday: 'long' });
    const d = new Date(form.submission_date);
    const dateText = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${weekday}`;
    const startText = form.start_time ? new Date(`1970-01-01T${form.start_time}`).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '----';
    const cCount = countItems(form.completed_tasks);
    const pCount = countItems(form.pending_tasks);
    const oCount = countItems(form.ongoing_tasks);
    const uCount = countItems(form.notes);

    let header = `🧾 CODO Daily Work Update — User\n` +
      `📅 Date: ${dateText}\n` +
      `🕘 Start Time: ${startText}\n` +
      `⏱ Today’s Working Hours: ${Number(form.hours_today || 0)} Hours`;

    // Compute totals for current CODO period up to selected date
    const since = getCodoPeriodStart(form.submission_date);
    const to = form.submission_date;
    const { days, hours } = computeTotalsInRange(submissions, since, to);
    const sinceLabel = new Date(since).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    header += `\n📊 Total Working Days (Since ${sinceLabel}): ${days} ${days===1?'Day':'Days'}`;
    header += `\n🧮 Total Hours Completed : ${hours} hours`;

    const sec: string[] = [];
    const cTxt = (form.completed_tasks || '').trim();
    const pTxt = (form.pending_tasks || '').trim();
    const oTxt = (form.ongoing_tasks || '').trim();
    const uTxt = (form.notes || '').trim();
    if (cCount > 0) sec.push(`✅ Completed (${cCount})\n\n${cTxt}`);
    if (pCount > 0) sec.push(`⌛ Pending (${pCount})\n\n${pTxt}`);
    if (oCount > 0) sec.push(`🔄 Ongoing (${oCount})\n\n${oTxt}`);
    if (uCount > 0) sec.push(`🔥 Upcoming (${uCount})\n\n${uTxt}`);

    const text = sec.length ? header + `\n\n` + sec.join(`\n\n`) : header;
    setTemplate(text);
  }, [form.submission_date, form.start_time, form.hours_today, form.completed_tasks, form.pending_tasks, form.notes]);

  useEffect(() => {
    (async () => {
      try {
        setTasksLoading(true);
        const res: any = await listMyTasks();
        const items: UserTask[] = (res && res.data) ? res.data : Array.isArray(res) ? res : [];
        const sorted = [...items].sort((a,b) => {
          const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          return da - db;
        });
        setPendingTasks(sorted.filter(t => t.status !== 'done').slice(0, 5));
        setCompletedTasks(sorted.filter(t => t.status === 'done').slice(0, 5));
      } catch (e) {
        setPendingTasks([]);
        setCompletedTasks([]);
      } finally {
        setTasksLoading(false);
      }
    })();
  }, []);


  async function loadSubmissions(refDate?: string) {
    try {
      setSubsLoading(true);
      const base = refDate ? new Date(refDate) : new Date(form.submission_date);
      // Load a 12-month window ending at end of the base month
      const windowEnd = new Date(base.getFullYear(), base.getMonth()+1, 0);
      const windowStart = new Date(base.getFullYear(), base.getMonth()-11, 1);
      const from = windowStart.toISOString().slice(0, 10);
      const to = windowEnd.toISOString().slice(0, 10);
      const res: any = await listMySubmissions({ from, to });
      const items: any[] = (res && res.data) ? res.data : Array.isArray(res) ? res : [];
      setSubmissions(items);
      // Only set default active tab if no month is specified in URL
      const monthFromUrl = searchParams.get('month');
      if (!monthFromUrl) {
        const mk = monthKey(refDate || form.submission_date);
        setActiveMonth(mk);
        // Update URL to reflect the default month
        const newParams = new URLSearchParams(searchParams);
        newParams.set('month', mk);
        setSearchParams(newParams);
      }
    } catch (e) {
      setSubmissions([]);
    } finally {
      setSubsLoading(false);
    }
  }

  // Load my submissions for current month
  useEffect(() => {
    if (!isEditingSubmission) {
      loadSubmissions(form.submission_date);
    }
  }, [form.submission_date, isEditingSubmission]);

  function showDeleteConfirmation(s: any) {
    setDeleteConfirm({show: true, submission: s});
  }

  async function confirmDelete() {
    if (!deleteConfirm.submission) return;
    
    try {
      await deleteSubmission({ 
        id: deleteConfirm.submission.id, 
        submission_date: deleteConfirm.submission.submission_date 
      });
      setSubmissions((prev) => prev.filter((x) => x.id !== deleteConfirm.submission.id));
      toast({ title: 'Submission deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete submission', variant: 'destructive' });
    } finally {
      setDeleteConfirm({show: false, submission: null});
    }
  }

  function cancelDelete() {
    setDeleteConfirm({show: false, submission: null});
  }

  async function startEdit(t: UserTask) {
    setEditingTaskId((t.id as number) ?? null);
    setEditingTitle(t.title || '');
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setEditingTitle('');
  }

  async function saveEdit(t: UserTask) {
    if (!t.id) return;
    const newTitle = editingTitle.trim();
    if (!newTitle) return;
    await updateTask({ id: t.id as number, title: newTitle });
    // refresh local lists
    setPendingTasks((prev) => prev.map(pt => (pt.id === t.id ? { ...pt, title: newTitle } : pt)));
    setCompletedTasks((prev) => prev.map(pt => (pt.id === t.id ? { ...pt, title: newTitle } : pt)));
    setEditingTaskId(null);
  }

  async function markDone(t: UserTask) {
    if (!t.id) return;
    await updateTask({ id: t.id as number, status: 'done' });
    setPendingTasks((prev) => prev.filter(pt => pt.id !== t.id));
    const updated: UserTask = { ...t, status: 'done' } as UserTask;
    setCompletedTasks((prev) => [updated, ...prev].slice(0, 5));
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Daily
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Track your daily progress, manage tasks efficiently
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button 
                  disabled={!canSubmit || loading} 
                  onClick={onSubmit} 
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-emerald-700 hover:from-blue-700 hover:to-emerald-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Daily...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
                      <span>Save Daily</span>
                    </div>
                  )}
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-emerald-600 rounded-lg">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {monthHours}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {error && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6">
              <div className="absolute inset-0 bg-red-500/5"></div>
              <div className="relative flex items-start gap-4">
                <div className="p-2 bg-red-500 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-1">Error</h3>
                  <p className="text-red-700 dark:text-red-300 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 items-stretch">
            {/* Main Form Section */}
            <div className="xl:col-span-2 space-y-6 sm:space-y-8 lg:space-y-10">
              {/* Enhanced Basic Information Card */}
              <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-emerald-600/3 to-purple-600/5 dark:from-blue-600/10 dark:via-emerald-600/5 dark:to-purple-600/10"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjNjM2NmYxIiBmaWxsLW9wYWNpdHk9IjAuMDMiPjxwYXRoIGQ9Ik0yMCAyMGMwLTUuNS00LjUtMTAtMTAtMTBzLTEwIDQuNS0xMCAxMCA0LjUgMTAgMTAgMTAgMTAtNC41IDEwLTEwem0xMCAwYzAtNS41LTQuNS0xMC0xMC0xMHMtMTAgNC41LTEwIDEwIDQuNSAxMCAxMCAxMCAxMC00LjUgMTAtMTAiLz48L2c+PC9zdmc+')] opacity-60"></div>
                <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 lg:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Basic Information</h2>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Enter your work details for today</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        Work Date <span className="text-red-500">*</span>
                      </Label>
                      <DatePicker 
                        value={form.submission_date} 
                        onChange={(v)=>setForm((p)=>({...p, submission_date:v}))} 
                        disableFuture 
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        Start Time <span className="text-red-500">*</span>
                      </Label>
                      <TimePicker 
                        value={form.start_time || ''} 
                        onChange={(v)=>setForm((p)=>({...p, start_time:v}))} 
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        Hours Worked <span className="text-red-500">*</span>
                      </Label>
                      <HourPicker
                        value={form.hours_today}
                        onChange={(v) => setForm((p) => ({ ...p, hours_today: v }))}
                        min={1}
                        max={24}
                        step={0.25}
                        placeholder="Select hours"
                      />
                    </div>
                  </div>
                  
                  {!canSubmit && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-red-500 rounded-lg">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">
                          Please complete all required fields: Date, Start Time, Hours (1–24), and at least one task field.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Tasks Section */}
              <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-blue-600/3 to-purple-600/5 dark:from-emerald-600/10 dark:via-blue-600/5 dark:to-purple-600/10"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxMGI5ODEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTMwIDMwcDAtOC4zLTYuNy0xNS0xNS0xNXMxNSA2LjcgMTUgMTUtNi43IDE1LTE1IDE1LTE1LTYuNy0xNS0xNXptMTUgMGMwLTguMy02LjctMTUtMTUtMTVzLTE1IDYuNy0xNSAxNSA2LjcgMTUgMTUgMTUgMTUtNi43IDE1LTE1Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-60"></div>
                <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 lg:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-2xl shadow-lg ring-4 ring-emerald-600/20">
                      <ListTodo className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Tasks</h2>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Organize your work by category (one task per line)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                    {/* Completed Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg"></div>
                        <Label className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-green-600">✅</span>
                          Completed Tasks
                        </Label>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full">
                          {countItems(form.completed_tasks)}
                        </span>
                      </div>
                      <Textarea
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-green-200 dark:border-green-800 focus:border-green-500 dark:focus:border-green-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.completed_tasks || ''}
                        onChange={(e) => setForm((p) => ({ ...p, completed_tasks: e.target.value }))}
                        placeholder="✅ What did you accomplish today?\n\nExample:\n• Fixed user authentication bug\n• Completed code review for PR #123\n• Updated project documentation\n• Deployed new feature to staging"
                      />
                    </div>

                    {/* Pending Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg"></div>
                        <Label className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-yellow-600">⏳</span>
                          Pending Tasks
                        </Label>
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-bold rounded-full">
                          {countItems(form.pending_tasks)}
                        </span>
                      </div>
                      <Textarea
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-yellow-200 dark:border-yellow-800 focus:border-yellow-500 dark:focus:border-yellow-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.pending_tasks || ''}
                        onChange={(e) => setForm((p) => ({ ...p, pending_tasks: e.target.value }))}
                        placeholder="⏳ What needs to be done?\n\nExample:\n• Write unit tests for new feature\n• Update API documentation\n• Fix responsive design issues\n• Review teammate's pull request"
                      />
                    </div>

                    {/* Ongoing Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg"></div>
                        <Label className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-blue-600">🔄</span>
                          Ongoing Tasks
                        </Label>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                          {countItems(form.ongoing_tasks)}
                        </span>
                      </div>
                      <Textarea
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.ongoing_tasks || ''}
                        onChange={(e) => setForm((p) => ({ ...p, ongoing_tasks: e.target.value }))}
                        placeholder="🔄 What are you currently working on?\n\nExample:\n• Refactoring authentication system\n• Implementing new dashboard design\n• Optimizing database queries\n• Writing integration tests"
                      />
                    </div>

                    {/* Upcoming Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-purple-500 rounded-full shadow-lg"></div>
                        <Label className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-purple-600">🔥</span>
                          Upcoming Tasks
                        </Label>
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                          {countItems(form.notes)}
                        </span>
                      </div>
                      <Textarea
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.notes || ''}
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="🔥 What's coming up next?\n\nExample:\n• Prepare release notes for v2.1\n• Estimate new feature requirements\n• Team sync meeting tomorrow\n• Plan sprint retrospective"
                      />
                    </div>
                  </div>
                </div>
              </div>
          </div>

            {/* Enhanced Sidebar Section */}
            <div className="xl:col-span-1 flex flex-col h-full mt-8 xl:mt-0">
              {/* Enhanced Preview Card */}
              <div className="relative overflow-hidden rounded-2xl shadow-lg h-full flex flex-col border border-gray-200/40 dark:border-gray-700/40 min-h-[600px] xl:min-h-0">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-blue-600/3 to-emerald-600/5 dark:from-purple-600/10 dark:via-blue-600/5 dark:to-emerald-600/10"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjOGI1Y2Y2IiBmaWxsLW9wYWNpdHk9IjAuMDMiPjxwYXRoIGQ9Ik0yNSAyNWMwLTguMy02LjctMTUtMTUtMTVzLTE1IDYuNy0xNSAxNSA2LjcgMTUgMTUgMTUgMTUtNi43IDE1LTE1em0xNSAwYzAtOC4zLTYuNy0xNS0xNS0xNXMtMTUgNi43LTE1IDE1IDYuNyAxNSAxNSAxNSAxNS02LjcgMTUtMTUiLz48L2c+PC9zdmc+')] opacity-60"></div>
                <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg ring-4 ring-purple-600/20">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Live Preview</h2>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Generated message preview</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 mb-6 lg:mb-8">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onSharePreview} 
                      className="gap-2 text-sm h-10 rounded-xl border-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    >
                      <Share2 className="h-4 w-4" /> Share Message
                    </Button>
                  </div>
                  
                  <div className={`flex-1 min-h-0 ${!canSubmit ? 'max-h-[50rem]' : 'max-h-[44rem]'} overflow-y-auto overflow-x-hidden rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 lg:p-5 border-2 border-gray-200 dark:border-gray-700 no-scrollbar`}>
                    <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed font-mono">
                      {template || 'Start filling the form above to see your daily update preview...'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>
      {/* Saved Submissions */}
      <section className="mx-auto w-full max-w-7xl mt-10 space-y-8">
        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Saved Submissions</h2>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Your previous daily work updates</p>
              </div>
            </div>
            
            {/* Month Tabs */}
            {!subsLoading && submissions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {Array.from(new Set(submissions.map((s)=>monthKey(s.submission_date))))
                  .sort((a,b)=> a < b ? 1 : -1)
                  .map((key)=> (
                    <button
                      key={key}
                      onClick={()=>handleMonthTabClick(key)}
                      className={`px-6 py-3 text-sm font-medium rounded-xl border-2 transition-all duration-200 ${
                        activeMonth===key 
                          ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-blue-600 shadow-lg' 
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {monthLabel(key, submissions)}
                    </button>
                  ))}
              </div>
            )}
            
            {/* Submissions List */}
            {subsLoading ? (
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No submissions found for this period.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                {submissions.filter(s => !activeMonth || monthKey(s.submission_date)===activeMonth).map((s) => (
                  <div key={s.id ?? s.submission_date} className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {s.submission_date}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {s.start_time ? `Started at ${s.start_time}` : 'No start time'} • {s.hours_today ?? 0} hours
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setIsEditingSubmission(true);
                            setForm({
                              submission_date: s.submission_date,
                              start_time: s.start_time || '',
                              hours_today: Number(s.hours_today || 0),
                              total_working_days: s.total_working_days ?? undefined,
                              total_hours_cumulative: s.total_hours_cumulative ?? undefined,
                              completed_tasks: s.completed_tasks || '',
                              pending_tasks: s.pending_tasks || '',
                              ongoing_tasks: s.ongoing_tasks || '',
                              notes: s.notes || '',
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-xs"
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            const text = formatSubmissionText(s);
                            await navigator.clipboard.writeText(text);
                            toast({ title: 'Copied submission text' });
                          }}
                          className="text-xs"
                        >
                          <ClipboardCopy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => showDeleteConfirmation(s)}
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-50 dark:bg-gray-800 p-3 no-scrollbar">
                      <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                        {formatSubmissionText(s)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Submission</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300">
                  Are you sure you want to delete the submission for{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {deleteConfirm.submission?.submission_date}
                  </span>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  This will permanently remove the daily update from your records.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={cancelDelete}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDelete}
                  className="px-6"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


