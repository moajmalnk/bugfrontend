import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  listMySubmissions,
  listAllRequestSubmissions,
  deleteSubmission,
  normalizeAllRequestSubmissionsResponse,
} from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Calendar, ClipboardCopy, Clock, FileText, ListTodo, Share2, User, AlertTriangle, Bell, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DailyWorkFlowPanel } from '@/pages/DailyWorkUpdate';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { UndoDeleteNotificationPortal } from '@/components/ui/UndoDeleteNotification';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toLocalCalendarDateString } from '@/lib/dateUtils';
import {
  formatProjectUpdatesForText,
  parseProjectUpdatesFromRow,
} from '@/lib/projectWorkUpdates';
import {
  buildProjectNameLookup,
  resolveSubmissionProjectNames,
} from '@/lib/periodDetailsFilters';
import { projectService } from '@/services/projectService';
import {
  calendarMonthKey,
  computeMonthTotalsToDate,
  formatCalendarMonthRange,
  formatCalendarMonthTitle,
  formatWorkingDaysPeriodLabel,
  getCalendarMonthPeriod,
  getCalendarMonthStart,
} from '@/lib/workPeriodUtils';

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
  const [liveCheckInTime, setLiveCheckInTime] = useState<string | null>(null);
  const [catalogProjects, setCatalogProjects] = useState<Array<{ id: string; name: string }>>([]);
  const didNormalizeMonth = useRef(false);

  const projectNameById = useMemo(
    () => buildProjectNameLookup([catalogProjects]),
    [catalogProjects]
  );

  const projectNameRecord = useMemo(() => {
    const rec: Record<string, string> = {};
    catalogProjects.forEach((p) => {
      rec[p.id] = p.name;
    });
    return rec;
  }, [catalogProjects]);

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

  function formatCheckInTime(raw?: string | null) {
    if (!raw) return null;
    try {
      const d =
        raw.includes('T') || raw.includes(' ')
          ? new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
          : new Date(`1970-01-01T${raw}`);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return null;
    }
  }

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

  function getMonthRange(dateStr: string) {
    const base = new Date(dateStr);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      from: toLocalCalendarDateString(start),
      to: toLocalCalendarDateString(end),
    };
  }

  function getSubmissionWindow(refDate?: string) {
    const base = refDate ? new Date(refDate) : new Date();
    const windowEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const windowStart = new Date(base.getFullYear(), base.getMonth() - 11, 1);
    return {
      from: toLocalCalendarDateString(windowStart),
      to: toLocalCalendarDateString(windowEnd),
    };
  }

  const { monthHours, monthDays } = useMemo(() => {
    const { from, to } = getMonthRange(todayYMD());
    const totals = computeTotalsInRange(submissions, from, to);
    return { monthHours: totals.hours, monthDays: totals.days };
  }, [submissions]);

  function monthLabel(key: string, list: any[]) {
    const { from, to } = getCalendarMonthPeriod(key);
    const { days, hours } = computeTotalsInRange(list, from, to);
    const title = formatCalendarMonthTitle(key);
    const range = formatCalendarMonthRange(key);
    return `${title} · ${range} · ${hours} hours · ${days} ${days === 1 ? 'day' : 'days'}`;
  }

  function monthTabLines(key: string, list: any[]) {
    const { from, to } = getCalendarMonthPeriod(key);
    const { days, hours } = computeTotalsInRange(list, from, to);
    const title = formatCalendarMonthTitle(key);
    const range = formatCalendarMonthRange(key);
    return {
      full: monthLabel(key, list),
      compactTitle: title,
      compactMeta: `${range} · ${hours} h · ${days} ${days === 1 ? 'day' : 'days'}`,
    };
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
    const startText = formatCheckInTime(s.check_in_time) || formatTime12h(s.start_time);
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

    // Totals for current calendar month
    const since = getCalendarMonthStart(s.submission_date);
    const to = s.submission_date;
    const { days, hours } = computeTotalsInRange(submissions, since, to);
    const periodLabel = formatWorkingDaysPeriodLabel(s.submission_date);
    body += `\n📊 Total Working Days (${periodLabel}): ${days} ${days===1?'Day':'Days'}`;
    body += `\n🧮 Total Hours Completed : ${hours} hours`;

    const sections: string[] = [];
    const projectNames = resolveSubmissionProjectNames(s, projectNameById);
    if (projectNames.length > 0) {
      sections.push(`📁 *Projects:* ${projectNames.join(', ')}`);
    }
    if ((s.planned_work || '').trim()) {
      sections.push(`📝 *Planned Work:*\n${String(s.planned_work).trim()}`);
    }
    const projectUpdates = parseProjectUpdatesFromRow(s.project_updates);
    const projectUpdatesText = formatProjectUpdatesForText(projectUpdates, projectNameRecord);
    if (projectUpdatesText) {
      sections.push(`📂 *Project Progress*\n\n${projectUpdatesText}`);
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

  /** Same idea as backend `br_work_submission_has_extra_request` (row fields only). */
  function workSubmissionHasExtraRequestRow(s: any): boolean {
    const req = Number(s?.requested_extra_hours ?? s?.requestedExtraHours ?? 0) > 0;
    const reason = String(s?.approval_reason ?? s?.approvalReason ?? '').trim();
    return req || reason.length > 0;
  }

  /** Same idea as backend `br_effective_overtime_hours_for_stats` (reports / period totals). */
  function effectiveOvertimeHoursForStats(s: any): number {
    const ot = Number(s?.overtime_hours ?? 0);
    const safeOt = Number.isFinite(ot) ? ot : 0;
    if (!workSubmissionHasExtraRequestRow(s)) {
      return safeOt;
    }
    const stRaw = s?.extra_hours_approval_status ?? s?.extraHoursApprovalStatus;
    if (stRaw === undefined || stRaw === null || String(stRaw).trim() === '') {
      return safeOt;
    }
    const st = String(stRaw).toLowerCase().trim();
    if (st === 'pending') return 0;
    if (st === 'rejected') return 0;
    if (st === 'approved' || st === 'changed') return safeOt;
    if (st === 'none') return workSubmissionHasExtraRequestRow(s) ? safeOt : 0;
    return 0;
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
        const mk = calendarMonthKey(refDate || todayYMD());
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
      const fallback = getSubmissionWindow(refDate);
      const res: unknown = await listAllRequestSubmissions({});
      const { submissions } = normalizeAllRequestSubmissionsResponse(res, fallback);
      setAllUserRequestSubmissions(submissions as any[]);
    } catch {
      setAllUserRequestSubmissions([]);
    } finally {
      setSubsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    projectService
      .getProjects()
      .then((projects) => {
        if (!cancelled) setCatalogProjects(projects);
      })
      .catch(() => {
        if (!cancelled) setCatalogProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    const urlMonth = searchParams.get('month');
    if (urlMonth && urlMonth !== activeMonth) setActiveMonth(urlMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // On first load, prefer the current calendar month (fixes stale ?month= from old 6th–5th cycle)
  useEffect(() => {
    if (subsLoading || didNormalizeMonth.current) return;
    const source =
      currentUser?.role === 'admin' && showRequestsOnly
        ? allUserRequestSubmissions
        : submissions;
    if (source.length === 0) return;
    didNormalizeMonth.current = true;

    const monthKeys = Array.from(
      new Set(source.map((s) => calendarMonthKey(String(s.submission_date || ''))))
    ).filter(Boolean);
    const currentMonth = calendarMonthKey(todayYMD());
    const urlMonth = searchParams.get('month');
    const preferred =
      (urlMonth && monthKeys.includes(urlMonth) && urlMonth) ||
      (monthKeys.includes(currentMonth) ? currentMonth : monthKeys.sort().reverse()[0]);

    if (!preferred || preferred === activeMonth) return;
    setActiveMonth(preferred);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('month', preferred);
      return p as any;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions, allUserRequestSubmissions, subsLoading, showRequestsOnly, currentUser?.role]);

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
      const { from, to } = getCalendarMonthPeriod(activeMonth);
      const submissionDate = String(s.submission_date || "");
      return submissionDate >= from && submissionDate <= to;
    });
  }, [filteredSubmissions, showRequestsOnly, activeMonth]);

  const activeMonthSummary = useMemo(() => {
    if (!activeMonth) return null;
    const source =
      currentUser?.role === 'admin' && showRequestsOnly
        ? allUserRequestSubmissions.filter(hasApprovalRequest)
        : submissions;
    const { from, to } = getCalendarMonthPeriod(activeMonth);
    const { days, hours } = computeTotalsInRange(source, from, to);
    return {
      title: formatCalendarMonthTitle(activeMonth),
      range: formatCalendarMonthRange(activeMonth),
      days,
      hours,
    };
  }, [activeMonth, submissions, allUserRequestSubmissions, currentUser?.role, showRequestsOnly]);

  const totalOtVisible = useMemo(() => {
    let sum = 0;
    for (const s of visibleSubmissions) {
      sum += effectiveOvertimeHoursForStats(s);
    }
    return Math.round(sum * 100) / 100;
  }, [visibleSubmissions]);

  const requestCount = useMemo(
    () => filteredSubmissions.filter(hasApprovalRequest).length,
    [filteredSubmissions]
  );

  const todayCheckInLabel = useMemo(
    () => formatCheckInTime(liveCheckInTime),
    [liveCheckInTime]
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

  function clearWorkFlowParams() {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('action');
      p.delete('edit');
      return p as any;
    });
  }

  function setWorkFlowAction(action: 'checkin' | 'checkout' | null) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (action) {
        p.set('action', action);
        if (action === 'checkin') {
          p.delete('edit');
        }
      } else {
        p.delete('action');
      }
      return p as any;
    });
  }

  const flowActionParam = searchParams.get('action');
  const flowAction =
    flowActionParam === 'checkin' || flowActionParam === 'checkout'
      ? flowActionParam
      : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto min-w-0 space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 lg:gap-6 min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                      Work Update
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl leading-relaxed">
                  Track your daily progress, log hours.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                {!(currentUser?.role === 'admin' && showRequestsOnly) && (
                  <DailyWorkFlowPanel
                    layout="header"
                    editId={searchParams.get('edit')}
                    flowAction={flowAction}
                    onFlowActionChange={setWorkFlowAction}
                    onSaved={() => void loadSubmissions()}
                    onCheckInTimeChange={setLiveCheckInTime}
                    onEditClose={clearWorkFlowParams}
                  />
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
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
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm p-1.5 sm:p-2">
              <div className="relative min-w-0">
                {/* indicator */}
                <div
                  className={`absolute top-1 bottom-1 left-1 w-1/2 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200/70 dark:border-gray-700/70 transition-transform duration-300 ease-out ${
                    activeTab === 'all-submissions' ? 'translate-x-0' : 'translate-x-full'
                  }`}
                  aria-hidden="true"
                />
                {/* tab buttons */}
                <div className="relative grid grid-cols-2 gap-1.5 sm:gap-2 min-w-0">
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
                    className="z-10 min-h-12 sm:min-h-14 px-2 sm:px-4 rounded-xl text-xs sm:text-base font-semibold flex items-center justify-center gap-1 sm:gap-2 transition-colors min-w-0"
                  >
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="hidden sm:inline truncate">All Submissions</span>
                    <span className="sm:hidden truncate">All</span>
                    <span className="ml-0.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 tabular-nums shrink-0">
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
                    className="z-10 min-h-12 sm:min-h-14 px-2 sm:px-4 rounded-xl text-xs sm:text-base font-semibold flex items-center justify-center gap-1 sm:gap-2 transition-colors min-w-0"
                  >
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="hidden sm:inline truncate">Today Submissions</span>
                    <span className="sm:hidden truncate">Today</span>
                    <span className="ml-0.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-green-300 tabular-nums shrink-0">
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
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 min-w-0">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20 shrink-0 self-start">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                    Saved Submissions
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 break-words leading-relaxed">
                    Your previous daily work updates
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col items-stretch gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end shrink-0">
                {todayCheckInLabel && !(currentUser?.role === 'admin' && showRequestsOnly) ? (
                  <div
                    className="inline-flex h-12 w-full sm:w-44 items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/95 px-3 shadow-sm dark:border-emerald-900/55 dark:bg-emerald-950/35"
                    title={`Checked in at ${todayCheckInLabel}`}
                  >
                    <Clock className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                      {todayCheckInLabel}
                    </span>
                  </div>
                ) : null}
                <div
                  className="inline-flex h-12 w-full sm:w-44 items-center justify-center rounded-xl border border-orange-200/90 bg-orange-50/95 px-3 shadow-sm dark:border-orange-900/55 dark:bg-orange-950/35"
                  title="Overtime that counts in period totals: approved or adjusted. Pending and rejected extra-hour requests count as 0."
                >
                  <span className="text-sm font-bold tabular-nums text-orange-700 dark:text-orange-200">
                    {totalOtVisible.toFixed(2)}h
                  </span>
                </div>
                {currentUser?.role === 'admin' && (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/${currentUser.role}/overtime-requests`)}
                      className="h-10 w-full sm:w-auto justify-center px-4 rounded-xl text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Timer className="h-4 w-4 mr-2 shrink-0" />
                      Admin requests
                    </Button>
                    <Button
                      type="button"
                      variant={showRequestsOnly ? 'default' : 'outline'}
                      onClick={() => setShowRequestsOnly((prev) => !prev)}
                      className={`h-10 w-full sm:w-auto shrink-0 justify-center px-4 rounded-xl text-xs sm:text-sm whitespace-nowrap ${
                        showRequestsOnly
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700'
                          : ''
                      }`}
                    >
                      <Bell className="h-4 w-4 mr-2 shrink-0" />
                      Filter
                      <span className="ml-2 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/20 text-[11px] font-semibold tabular-nums">
                        {requestCount}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Month Tabs - Only show for All Submissions, not Today Submissions */}
                {!subsLoading && filteredSubmissions.length > 0 && activeTab === "all-submissions" && (() => {
              const listForMonths = showRequestsOnly
                ? filteredSubmissions.filter(hasApprovalRequest)
                : filteredSubmissions;
              return (
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 min-w-0">
                    {Array.from(new Set(listForMonths.map((s) => calendarMonthKey(s.submission_date))))
                  .sort((a,b)=> a < b ? 1 : -1)
                  .map((key)=> {
                    const lines = monthTabLines(key, listForMonths);
                    return (
                    <button
                      key={key}
                      onClick={()=>handleMonthTabClick(key)}
                      className={`min-h-[4.25rem] flex-1 min-w-[calc(100%-0.5rem)] xs:min-w-[12rem] sm:min-w-[14rem] max-w-full px-4 py-3 text-left sm:text-center rounded-xl border-2 transition-all duration-200 ${
                        activeMonth===key 
                          ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-blue-600 shadow-lg' 
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="hidden sm:block text-sm font-medium leading-snug whitespace-normal">
                        {lines.full}
                      </span>
                      <span className="sm:hidden flex flex-col gap-1 w-full min-w-0">
                        <span className="text-sm font-semibold leading-snug break-words">
                          {lines.compactTitle}
                        </span>
                        <span className="text-xs font-normal opacity-90 leading-snug">
                          {lines.compactMeta}
                        </span>
                      </span>
                    </button>
                    );
                  })}
              </div>
              );
            })()}

            {activeTab === 'all-submissions' && activeMonthSummary && (
              <div className="mb-6 rounded-2xl border border-blue-200/60 dark:border-blue-800/50 bg-gradient-to-r from-blue-600/95 to-emerald-600/95 text-white shadow-lg overflow-hidden">
                <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold tracking-tight">{activeMonthSummary.title}</p>
                    <p className="text-sm text-white/85 mt-0.5">{activeMonthSummary.range}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                    <span className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold tabular-nums">
                      {activeMonthSummary.hours} hours
                    </span>
                    <span className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold tabular-nums">
                      {activeMonthSummary.days} {activeMonthSummary.days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
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
                    {visibleSubmissions.map((s) => {
                      const checkInLabel = formatCheckInTime(s.check_in_time);
                      return (
                  <div key={s.id ?? s.submission_date} className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-4 sm:p-6 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white break-words">
                          {s.submission_date}
                        </div>
                        {currentUser?.role === 'admin' && showRequestsOnly && (
                          <div className="text-xs text-blue-600 dark:text-blue-300 font-medium mt-0.5">
                            {s.username || 'User'} {s.role ? `• ${String(s.role).toUpperCase()}` : ''}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400 break-words mt-1">
                          {checkInLabel
                            ? `Checked in at ${checkInLabel}`
                            : s.start_time
                              ? `Started at ${s.start_time}`
                              : 'No check-in time'}{' '}
                          • {s.hours_today ?? 0} hours
                          {Number(s.overtime_hours || 0) > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                              +{s.overtime_hours}h OT
                            </span>
                          )}
                          {hasApprovalRequest(s) && (
                            <span
                              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                String(s.extra_hours_approval_status || '').toLowerCase() === 'pending'
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                                  : String(s.extra_hours_approval_status || '').toLowerCase() === 'rejected'
                                    ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {String(s.extra_hours_approval_status || 'none').replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:justify-end shrink-0">
                        {/* Edit button - only for today */}
                        {!(currentUser?.role === 'admin' && showRequestsOnly) && isToday(s.submission_date) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSearchParams((prev) => {
                                const p = new URLSearchParams(prev);
                                p.set('edit', String(s.id));
                                p.set('action', 'checkout');
                                return p as any;
                              });
                            }}
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
                        {!(currentUser?.role === 'admin' && showRequestsOnly) ? (
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
                    <div className="max-h-48 min-w-0 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-50 dark:bg-gray-800 p-3 no-scrollbar">
                      <pre className="max-w-full min-w-0 text-xs whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-700 dark:text-gray-300 leading-relaxed">
                        {formatSubmissionText(s)}
                      </pre>
                    </div>
                  </div>
                );
                    })}
              </div>
            )}
          </div>
        </div>
          </TabsContent>
        </Tabs>
      </section>

      <UndoDeleteNotificationPortal
        open={undoDelete.isCountingDown && !!submissionToDelete}
        title="Submission Deleted"
        itemName={submissionToDelete ? `Daily update for ${submissionToDelete.submission_date}` : ""}
        timeLeft={undoDelete.timeLeft}
        duration={10}
        onUndo={undoDelete.cancelCountdown}
        onConfirmNow={undoDelete.confirmDelete}
      />
    </main>
  );
}