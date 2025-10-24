import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submitWork, WorkSubmission, listMyTasks, UserTask, updateTask, listMySubmissions } from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, ClipboardCopy, Clock, FileText, ListTodo, Share2, User, AlertTriangle, ArrowLeft, Plus, Bell } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { HourPicker } from '@/components/ui/HourPicker';
import { useAuth } from '@/context/AuthContext';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T } | T;

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DailyWorkUpdate() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;
  
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
      toast({ title: isEditing ? 'Daily submission updated' : 'Daily submission saved' });
      // Navigate back to daily update page
      navigate(`/${currentUser?.role}/daily-update`);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit');
    } finally {
      setLoading(false);
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
      `⏱ Today's Working Hours: ${Number(form.hours_today || 0)} Hours`;

    // Compute totals for current CODO period up to selected date
    const since = getCodoPeriodStart(form.submission_date);
    const sinceLabel = new Date(since).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    header += `\n📊 Total Working Days (Since ${sinceLabel}): 0 Days`;
    header += `\n🧮 Total Hours Completed : 0 hours`;

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
  }, [form.submission_date, form.start_time, form.hours_today, form.completed_tasks, form.pending_tasks, form.ongoing_tasks, form.notes]);

  useEffect(() => {
    (async () => {
      try {
        setTasksLoading(true);
        
        // Load tasks
        const res: any = await listMyTasks();
        const items: UserTask[] = (res && res.data) ? res.data : Array.isArray(res) ? res : [];
        const sorted = [...items].sort((a,b) => {
          const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          return da - db;
        });
        setPendingTasks(sorted.filter(t => t.status !== 'done').slice(0, 5));
        setCompletedTasks(sorted.filter(t => t.status === 'done').slice(0, 5));
        
        // Load existing submission data if editing
        if (isEditing && editId) {
          const submissionsRes = await listMySubmissions({ from: '2020-01-01', to: '2030-12-31' });
          const submissions: any[] = (submissionsRes && submissionsRes.data) ? submissionsRes.data : Array.isArray(submissionsRes) ? submissionsRes : [];
          const existingSubmission = submissions.find(s => s.id == editId);
          
          if (existingSubmission) {
            setForm({
              submission_date: existingSubmission.submission_date,
              start_time: existingSubmission.start_time || '10:00',
              hours_today: existingSubmission.hours_today || 8,
              completed_tasks: existingSubmission.completed_tasks || '',
              pending_tasks: existingSubmission.pending_tasks || '',
              ongoing_tasks: existingSubmission.ongoing_tasks || '',
              notes: existingSubmission.notes || '',
            });
          }
        }
      } catch (e) {
        setPendingTasks([]);
        setCompletedTasks([]);
      } finally {
        setTasksLoading(false);
      }
    })();
  }, [isEditing, editId]);

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
                {/* Back Navigation */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                  <button
                    onClick={() => navigate(`/${currentUser?.role}/daily-update`)}
                    className="flex items-center gap-1 hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Work Update
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      {isEditing ? 'Edit Daily Work Update' : 'Daily Work Update'}
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Fill out your daily work progress and tasks. All fields are required to submit.
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
                      <span>{isEditing ? 'Updating Daily...' : 'Saving Daily...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
                      <span>{isEditing ? 'Update Daily' : 'Save Daily'}</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Content */}
        <div className="space-y-6 sm:space-y-8">
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
                      <Label htmlFor="work-date" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        Work Date <span className="text-red-500">*</span>
                      </Label>
                      <div id="work-date">
                        <DatePicker 
                          value={form.submission_date} 
                          onChange={(v)=>setForm((p)=>({...p, submission_date:v}))} 
                          disableFuture 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="start-time" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        Start Time <span className="text-red-500">*</span>
                      </Label>
                      <div id="start-time">
                        <TimePicker 
                          value={form.start_time || ''} 
                          onChange={(v)=>setForm((p)=>({...p, start_time:v}))} 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="hours-worked" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        Hours Worked <span className="text-red-500">*</span>
                      </Label>
                      <div id="hours-worked">
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
                        <Label htmlFor="completed-tasks" className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-green-600">✅</span>
                          Completed Tasks
                        </Label>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full">
                          {countItems(form.completed_tasks)}
                        </span>
                      </div>
                      <Textarea
                        id="completed-tasks"
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-green-200 dark:border-green-800 focus:border-green-500 dark:focus:border-green-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.completed_tasks || ''}
                        onChange={(e) => setForm((p) => ({ ...p, completed_tasks: e.target.value }))}
                        placeholder="✅ What did you accomplish today?

Example:
• Fixed user authentication bug
• Completed code review for PR #123
• Updated project documentation
• Deployed new feature to staging"
                      />
                    </div>

                    {/* Pending Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg"></div>
                        <Label htmlFor="pending-tasks" className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-yellow-600">⏳</span>
                          Pending Tasks
                        </Label>
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-bold rounded-full">
                          {countItems(form.pending_tasks)}
                        </span>
                      </div>
                      <Textarea
                        id="pending-tasks"
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-yellow-200 dark:border-yellow-800 focus:border-yellow-500 dark:focus:border-yellow-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.pending_tasks || ''}
                        onChange={(e) => setForm((p) => ({ ...p, pending_tasks: e.target.value }))}
                        placeholder="⏳ What needs to be done?

Example:
• Write unit tests for new feature
• Update API documentation
• Fix responsive design issues
• Review teammate's pull request"
                      />
                    </div>

                    {/* Ongoing Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg"></div>
                        <Label htmlFor="ongoing-tasks" className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-blue-600">🔄</span>
                          Ongoing Tasks
                        </Label>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                          {countItems(form.ongoing_tasks)}
                        </span>
                      </div>
                      <Textarea
                        id="ongoing-tasks"
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.ongoing_tasks || ''}
                        onChange={(e) => setForm((p) => ({ ...p, ongoing_tasks: e.target.value }))}
                        placeholder="🔄 What are you currently working on?

Example:
• Refactoring authentication system
• Implementing new dashboard design
• Optimizing database queries
• Writing integration tests"
                      />
                    </div>

                    {/* Upcoming Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-purple-500 rounded-full shadow-lg"></div>
                        <Label htmlFor="upcoming-tasks" className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-purple-600">🔥</span>
                          Upcoming Tasks
                        </Label>
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                          {countItems(form.notes)}
                        </span>
                      </div>
                      <Textarea
                        id="upcoming-tasks"
                        className="min-h-[160px] lg:min-h-[180px] border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.notes || ''}
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="🔥 What's coming up next?

Example:
• Prepare release notes for v2.1
• Estimate new feature requirements
• Team sync meeting tomorrow
• Plan sprint retrospective"
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

        </div>
      </section>
    </main>
  );
}
