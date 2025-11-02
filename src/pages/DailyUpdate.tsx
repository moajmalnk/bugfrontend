import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { listMySubmissions, deleteSubmission } from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Calendar, ClipboardCopy, Clock, FileText, ListTodo, Share2, User, AlertTriangle, Undo2, Plus, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T } | T;

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DailyUpdate() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-submissions";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [activeMonth, setActiveMonth] = useState<string>(searchParams.get('month') || ''); // YYYY-MM
  const [submissionToDelete, setSubmissionToDelete] = useState<any | null>(null);

  // Initialize undo delete hook
  const undoDelete = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      if (submissionToDelete) {
        performActualDelete(submissionToDelete);
      }
    },
    onUndo: () => {
      setSubmissionToDelete(null);
      toast({
        title: "Deletion cancelled",
        description: "The submission has been restored.",
        variant: "default",
      });
    },
  });

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
    const { from, to } = getMonthRange(todayYMD());
    const totals = computeTotalsInRange(submissions, from, to);
    return { monthHours: totals.hours, monthDays: totals.days };
  }, [submissions]);

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

  function isCurrentMonth(submissionDate: string) {
    const submission = new Date(submissionDate);
    const current = new Date();
    return submission.getFullYear() === current.getFullYear() && 
           submission.getMonth() === current.getMonth();
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
      `⏱ Today's Working Hours: ${Number(s.hours_today || 0)} Hours`;
    
    // Add overtime breakdown if applicable
    const overtimeHours = Number(s.overtime_hours || 0);
    if (overtimeHours > 0) {
      const regularHours = Math.min(Number(s.hours_today || 0), 8);
      body += `\n📊 Regular Hours: ${regularHours} Hours`;
      body += `\n⏰ Overtime Hours: ${overtimeHours} Hours`;
    }

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

  async function loadSubmissions(refDate?: string) {
    try {
      setSubsLoading(true);
      const base = refDate ? new Date(refDate) : new Date();
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
        const mk = monthKey(refDate || todayYMD());
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
    loadSubmissions();
  }, []);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-submissions";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Filter submissions based on active tab
  const filteredSubmissions = useMemo(() => {
    if (activeTab === "today-submissions") {
      const today = todayYMD();
      return submissions.filter(s => s.submission_date === today);
    }
    return submissions;
  }, [submissions, activeTab]);

  // Get tab-specific count
  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-submissions":
        return submissions.length;
      case "today-submissions":
        const today = todayYMD();
        return submissions.filter(s => s.submission_date === today).length;
      default:
        return 0;
    }
  };

  function handleDeleteSubmission(submission: any) {
    setSubmissionToDelete(submission);
    undoDelete.startCountdown();
    
    toast({
      title: "Deleting submission",
      description: `Daily update for ${submission.submission_date} will be deleted in ${undoDelete.timeLeft} seconds.`,
      variant: "destructive",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => undoDelete.cancelCountdown()}
          className="gap-2"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </Button>
      ),
    });
  }

  async function performActualDelete(submission: any) {
    try {
      await deleteSubmission({ 
        id: submission.id, 
        submission_date: submission.submission_date 
      });
      setSubmissions((prev) => prev.filter((x) => x.id !== submission.id));
      toast({ title: 'Submission deleted' });
      setSubmissionToDelete(null);
    } catch (error) {
      toast({ title: 'Failed to delete submission', variant: 'destructive' });
      setSubmissionToDelete(null);
    }
  }

  // New Daily Update Button
  const NewDailyUpdateButton = () => (
    <Button 
      onClick={() => navigate(`/${currentUser?.role}/daily-work-update`)}
      className="h-12 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
    >
      <Plus className="mr-2 h-5 w-5" /> New Daily Update
    </Button>
  );

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
                      Work Update
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Track your daily progress and efficiently
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <NewDailyUpdateButton />
                
                
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

        {/* Submissions Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", val);
              return p as any;
            });
          }}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="all-submissions"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">All Submissions</span>
                  <span className="sm:hidden">All</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">{getTabCount("all-submissions")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="today-submissions"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Today Submissions</span>
                  <span className="sm:hidden">Today</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-green-300 rounded-full text-xs font-bold">{getTabCount("today-submissions")}</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
      {/* Saved Submissions */}
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
            
            {/* Month Tabs - Only show for All Submissions, not Today Submissions */}
                {!subsLoading && filteredSubmissions.length > 0 && activeTab === "all-submissions" && (
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {Array.from(new Set(filteredSubmissions.map((s)=>monthKey(s.submission_date))))
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
                          {monthLabel(key, filteredSubmissions)}
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
                ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {activeTab === "today-submissions" 
                        ? "No submissions found for today." 
                        : "No submissions found for this period."
                      }
                    </p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 ${activeTab === "today-submissions" ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
                    {filteredSubmissions.filter(s => !activeMonth || monthKey(s.submission_date)===activeMonth).map((s) => (
                  <div key={s.id ?? s.submission_date} className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {s.submission_date}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {s.start_time ? `Started at ${s.start_time}` : 'No start time'} • {s.hours_today ?? 0} hours
                          {Number(s.overtime_hours || 0) > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                              +{s.overtime_hours}h OT
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Edit button - only for current month */}
                        {isCurrentMonth(s.submission_date) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/${currentUser?.role}/daily-work-update?edit=${s.id}`)}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                        )}
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
                        {submissionToDelete?.id === s.id && undoDelete.isCountingDown ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Deleting in {undoDelete.timeLeft}s
                          </div>
                        ) : (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteSubmission(s)}
                            className="text-xs"
                          >
                            Delete
                          </Button>
                        )}
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
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}