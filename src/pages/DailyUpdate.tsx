import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { listMySubmissions, listAllRequestSubmissions, deleteSubmission } from '@/services/todoService';
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
  const [allUserRequestSubmissions, setAllUserRequestSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [activeMonth, setActiveMonth] = useState<string>(searchParams.get('month') || ''); // YYYY-MM
  const [submissionToDelete, setSubmissionToDelete] = useState<any | null>(null);
  const [showRequestsOnly, setShowRequestsOnly] = useState(false);

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
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
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
    // Compare YYYY-MM-DD strings directly to avoid timezone drift
    const dateSet = new Set<string>();
    let hours = 0;
    for (const s of list) {
      const d = String(s.submission_date || "");
      if (!d) continue;
      if (d >= from && d <= to) {
        dateSet.add(d);
        hours += Number(s.hours_today || 0);
      }
    }
    return { days: dateSet.size, hours };
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

  function getSubmissionWindow(refDate?: string) {
    const base = refDate ? new Date(refDate) : new Date();
    const windowEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const windowStart = new Date(base.getFullYear(), base.getMonth() - 11, 1);
    return {
      from: windowStart.toISOString().slice(0, 10),
      to: windowEnd.toISOString().slice(0, 10),
    };
  }

  const { monthHours, monthDays } = useMemo(() => {
    const { from, to } = getMonthRange(todayYMD());
    const totals = computeTotalsInRange(submissions, from, to);
    return { monthHours: totals.hours, monthDays: totals.days };
  }, [submissions]);

  // Get CODO period key (YYYY-MM) for a given submission date
  // CODO periods: 6th of month to 5th of next month
  // Dates 1-5 belong to previous month's CODO period
  // Dates 6-31 belong to current month's CODO period
  function monthKey(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDate();
    let year = d.getFullYear();
    let month = d.getMonth() + 1;
    
    // If date is 1-5, it belongs to previous month's CODO period
    if (day <= 5) {
      month = month - 1;
      if (month === 0) {
        month = 12;
        year = year - 1;
      }
    }
    
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  // Get CODO period range for a given month (YYYY-MM format)
  // Returns dates from 6th of that month to 5th of next month
  function getCodoPeriodForMonth(monthKey: string) {
    const [y, m] = monthKey.split('-').map(Number);
    const monthIndex = m - 1;
    
    // Start: 6th of the given month
    const startDate = `${y}-${String(m).padStart(2, '0')}-06`;
    
    // End: 5th of next month
    let nextYear = y;
    let nextMonth = m + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = y + 1;
    }
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-05`;
    
    return { from: startDate, to: endDate };
  }

  // Format date for display (e.g., "October 6" or "November 5")
  function formatDateForDisplay(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    const monthName = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
    const day = d.getDate();
    return `${monthName} ${day}`;
  }

  function monthLabel(key: string, list: any[]) {
    const { from, to } = getCodoPeriodForMonth(key);
    const { days, hours } = computeTotalsInRange(list, from, to);
    
    // Format the date range for display
    const startDisplay = formatDateForDisplay(from);
    const endDisplay = formatDateForDisplay(to);
    
    return `${startDisplay} to ${endDisplay} (${hours} hours) (${days} ${days === 1 ? 'day' : 'days'})`;
  }

  function isToday(submissionDate: string) {
    const today = todayYMD();
    return submissionDate === today;
  }

  function parseOvertimeRequestFromNotes(notes?: string) {
    const text = (notes || '').trim();
    if (!text) return { requestedHours: '', reason: '' };

    const requestedMatch = text.match(/Requested Extra Hours:\s*([^\n\r]+)/i);
    const reasonMatch = text.match(/Reason:\s*([^\n\r]+)/i);

    return {
      requestedHours: requestedMatch?.[1]?.trim() || '',
      reason: reasonMatch?.[1]?.trim() || '',
    };
  }

  function parseBreakLinesFromNotes(notes?: string) {
    const text = (notes || '').trim();
    if (!text) return [];
    return (text.match(/^\[BREAK\].*$/gim) || []).map((line) => line.trim()).filter(Boolean);
  }

  function getBreakMinutes(lines: string[]) {
    return lines.reduce((sum, line) => {
      const mins = Number(line.match(/\((\d+)\s*min\)/i)?.[1] || 0);
      return sum + (Number.isFinite(mins) ? mins : 0);
    }, 0);
  }

  function formatSubmissionText(s: any) {
    const d = new Date(s.submission_date);
    const weekday = d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
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
    const { requestedHours, reason } = parseOvertimeRequestFromNotes(s.notes);
    const requestedHoursFromRow = s.requested_extra_hours ?? s.requestedExtraHours ?? '';
    const approvalReasonFromRow = (s.approval_reason ?? s.approvalReason ?? '').toString().trim();
    const requestedFromRowNum = Number(requestedHoursFromRow || 0);
    const requestedFromNotesNum = Number(requestedHours || 0);
    const finalRequestedHoursNum = requestedFromRowNum > 0 ? requestedFromRowNum : requestedFromNotesNum;
    const finalRequestedHours = finalRequestedHoursNum > 0 ? String(finalRequestedHoursNum) : '';
    const finalApprovalReason = approvalReasonFromRow || reason;
    const breaksFromRow = (() => {
      const raw = s.break_entries;
      if (Array.isArray(raw)) return raw.map((x: any) => String(x).trim()).filter(Boolean);
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.map((x: any) => String(x).trim()).filter(Boolean) : [];
        } catch {
          return [];
        }
      }
      return [];
    })();
    const breakLines = breaksFromRow.length > 0 ? breaksFromRow : parseBreakLinesFromNotes(s.notes);
    const totalBreakMinutes = Number(s.total_break_minutes || 0) > 0 ? Number(s.total_break_minutes || 0) : getBreakMinutes(breakLines);
    let body =
      `🧾 CODO Daily Work Update — User\n` +
      `📅 Date: ${dateText}\n` +
      `🕘 Start Time: ${startText}\n` +
      `⏱ Today's Working Hours: ${Number(s.hours_today || 0)} Hours`;
    
    // Add overtime breakdown if applicable
    // Keep before-save and after-save display aligned:
    // if dedicated overtime field is empty, fall back to requested extra hours.
    const overtimeHoursRaw = Number(s.overtime_hours || 0);
    const overtimeHours = overtimeHoursRaw > 0 ? overtimeHoursRaw : finalRequestedHoursNum;
    if (overtimeHours > 0) {
      const regularHours = Math.min(Number(s.hours_today || 0), 8);
      body += `\n📊 Regular Hours: ${regularHours} Hours`;
      body += `\n⏰ Overtime Hours: ${overtimeHours} Hours`;
    }
    if (finalRequestedHours) {
      body += `\n🧾 Requested Extra Hours: ${finalRequestedHours} Hours`;
    }
    if (finalApprovalReason) {
      body += `\n📝 Approval Reason: ${finalApprovalReason}`;
    }
    if (totalBreakMinutes > 0) {
      body += `\n☕ Total Break Time: ${totalBreakMinutes} min`;
    }

    // Totals for CODO period
    const since = getCodoPeriodStart(s.submission_date);
    const to = s.submission_date;
    const { days, hours } = computeTotalsInRange(submissions, since, to);
    const sinceLabel = new Date(since).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
    body += `\n📊 Total Working Days (Since ${sinceLabel}): ${days} ${days===1?'Day':'Days'}`;
    body += `\n🧮 Total Hours Completed : ${hours} hours`;

    const sections: string[] = [];
    // Include planning fields in saved-card details when present.
    if (s.planned_projects) {
      try {
        const projects = Array.isArray(s.planned_projects) ? s.planned_projects : JSON.parse(s.planned_projects);
        if (Array.isArray(projects) && projects.length > 0) {
          sections.push(`📁 *Projects:* ${projects.join(', ')}`);
        }
      } catch {
        // Ignore malformed planned_projects and keep rendering other details.
      }
    }
    if ((s.planned_work || '').trim()) {
      sections.push(`📝 *Planned Work:*\n${String(s.planned_work).trim()}`);
    }
    if (cCount > 0) sections.push(`✅ Completed (${cCount})\n\n${c}`);
    if (pCount > 0) sections.push(`⌛ Pending (${pCount})\n\n${p}`);
    if (oCount > 0) sections.push(`🔄 Ongoing (${oCount})\n\n${o}`);
    if (uCount > 0) sections.push(`🔥 Upcoming (${uCount})\n\n${u}`);
    if (breakLines.length > 0) sections.push(`☕ Breaks (${breakLines.length})\n\n${breakLines.join('\n')}`);
    if ((s.planned_work_notes || '').trim()) {
      sections.push(`📝 Work Notes\n\n${String(s.planned_work_notes).trim()}`);
    }
    if ((s.planned_work_status || '').trim()) {
      const statusMap: Record<string, string> = {
        not_started: 'Not Started',
        in_progress: 'In Progress',
        completed: 'Completed',
        on_hold: 'On Hold',
        blocked: 'Blocked',
      };
      const statusKey = String(s.planned_work_status).trim();
      sections.push(`📊 Planned Work Status: ${statusMap[statusKey] || statusKey}`);
    }

    if (sections.length) body += `\n\n` + sections.join(`\n\n`);
    return body;
  }

  function hasApprovalRequest(submission: any) {
    const requestedFromRow = Number(submission?.requested_extra_hours ?? submission?.requestedExtraHours ?? 0);
    const reasonFromRow = String(submission?.approval_reason ?? submission?.approvalReason ?? '').trim();
    if (requestedFromRow > 0 || reasonFromRow.length > 0) return true;

    const fromNotes = parseOvertimeRequestFromNotes(submission?.notes);
    return Number(fromNotes.requestedHours || 0) > 0 || fromNotes.reason.length > 0;
  }

  async function loadSubmissions(refDate?: string) {
    try {
      setSubsLoading(true);
      const { from, to } = getSubmissionWindow(refDate);
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

  async function loadAllUserRequestSubmissions(refDate?: string) {
    if (currentUser?.role !== 'admin') return;
    try {
      setSubsLoading(true);
      const { from, to } = getSubmissionWindow(refDate);
      const res: any = await listAllRequestSubmissions({ from, to });
      const items: any[] = (res && res.data) ? res.data : Array.isArray(res) ? res : [];
      setAllUserRequestSubmissions(items);
    } catch {
      setAllUserRequestSubmissions([]);
    } finally {
      setSubsLoading(false);
    }
  }

  // Load my submissions for current month
  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin' && showRequestsOnly) {
      loadAllUserRequestSubmissions();
    }
  }, [currentUser?.role, showRequestsOnly]);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-submissions";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Filter submissions based on active tab
  const filteredSubmissions = useMemo(() => {
    const source =
      currentUser?.role === 'admin' && showRequestsOnly
        ? allUserRequestSubmissions
        : submissions;
    if (activeTab === "today-submissions") {
      const today = todayYMD();
      return source.filter(s => s.submission_date === today);
    }
    return source;
  }, [submissions, allUserRequestSubmissions, activeTab, currentUser?.role, showRequestsOnly]);

  const visibleSubmissions = useMemo(() => {
    const byRequest = showRequestsOnly ? filteredSubmissions.filter(hasApprovalRequest) : filteredSubmissions;
    return byRequest.filter((s) => {
      if (!activeMonth) return true;
      const { from, to } = getCodoPeriodForMonth(activeMonth);
      const submissionDate = String(s.submission_date || "");
      return submissionDate >= from && submissionDate <= to;
    });
  }, [filteredSubmissions, showRequestsOnly, activeMonth]);

  const requestCount = useMemo(
    () => filteredSubmissions.filter(hasApprovalRequest).length,
    [filteredSubmissions]
  );

  // Get tab-specific count
  const getTabCount = (tabType: string) => {
    const source =
      currentUser?.role === 'admin' && showRequestsOnly
        ? allUserRequestSubmissions
        : submissions;
    switch (tabType) {
      case "all-submissions":
        return source.length;
      case "today-submissions":
        const today = todayYMD();
        return source.filter(s => s.submission_date === today).length;
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
          {/* Professional tab bar with sliding indicator */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm p-2">
              <div className="relative">
                {/* indicator */}
                <div
                  className={`absolute top-1 bottom-1 left-1 w-1/2 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200/70 dark:border-gray-700/70 transition-transform duration-300 ease-out ${
                    activeTab === 'all-submissions' ? 'translate-x-0' : 'translate-x-full'
                  }`}
                  aria-hidden="true"
                />
                {/* tab buttons */}
                <div className="relative grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'all-submissions'}
                    onClick={() => {
                      setActiveTab('all-submissions');
                      setSearchParams((prev) => {
                        const p = new URLSearchParams(prev);
                        p.set('tab', 'all-submissions');
                        return p as any;
                      });
                    }}
                    className="z-10 h-12 sm:h-14 px-3 sm:px-4 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">All Submissions</span>
                    <span className="sm:hidden">All</span>
                    <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {getTabCount('all-submissions')}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'today-submissions'}
                    onClick={() => {
                      setActiveTab('today-submissions');
                      setSearchParams((prev) => {
                        const p = new URLSearchParams(prev);
                        p.set('tab', 'today-submissions');
                        return p as any;
                      });
                    }}
                    className="z-10 h-12 sm:h-14 px-3 sm:px-4 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Today Submissions</span>
                    <span className="sm:hidden">Today</span>
                    <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-green-300">
                      {getTabCount('today-submissions')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
      {/* Saved Submissions */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="relative flex items-center justify-center mb-8 min-h-[56px]">
              <div className="absolute left-0 p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Saved Submissions</h2>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Your previous daily work updates</p>
              </div>
              {currentUser?.role === 'admin' && (
                <Button
                  type="button"
                  variant={showRequestsOnly ? 'default' : 'outline'}
                  onClick={() => setShowRequestsOnly((prev) => !prev)}
                  className={`absolute right-0 h-10 px-4 rounded-xl text-xs sm:text-sm ${
                    showRequestsOnly
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700'
                      : ''
                  }`}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Requests
                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/20 text-[11px] font-semibold">
                    {requestCount}
                  </span>
                </Button>
              )}
            </div>
            
            {/* Month Tabs - Only show for All Submissions, not Today Submissions */}
                {!subsLoading && filteredSubmissions.length > 0 && activeTab === "all-submissions" && (
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {Array.from(new Set((showRequestsOnly ? filteredSubmissions.filter(hasApprovalRequest) : filteredSubmissions).map((s)=>monthKey(s.submission_date))))
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
                ) : visibleSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {showRequestsOnly
                        ? "No approval requests found for this period."
                        : activeTab === "today-submissions" 
                        ? "No submissions found for today." 
                        : "No submissions found for this period."
                      }
                    </p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 ${activeTab === "today-submissions" ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
                    {visibleSubmissions.map((s) => (
                  <div key={s.id ?? s.submission_date} className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {s.submission_date}
                        </div>
                        {currentUser?.role === 'admin' && showRequestsOnly && (
                          <div className="text-xs text-blue-600 dark:text-blue-300 font-medium mt-0.5">
                            {s.username || 'User'} {s.role ? `• ${String(s.role).toUpperCase()}` : ''}
                          </div>
                        )}
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
                        {/* Edit button - only for today */}
                        {!(currentUser?.role === 'admin' && showRequestsOnly) && isToday(s.submission_date) && (
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
                        {!(currentUser?.role === 'admin' && showRequestsOnly) && submissionToDelete?.id === s.id && undoDelete.isCountingDown ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Deleting in {undoDelete.timeLeft}s
                          </div>
                        ) : !(currentUser?.role === 'admin' && showRequestsOnly) ? (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteSubmission(s)}
                            className="text-xs"
                          >
                            Delete
                          </Button>
                        ) : null}
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