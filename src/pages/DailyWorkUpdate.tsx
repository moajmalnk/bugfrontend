import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submitWork, WorkSubmission, listMyTasks, UserTask, updateTask, listMySubmissions, checkIn } from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, ClipboardCopy, Clock, FileText, ListTodo, Share2, User, AlertTriangle, ArrowLeft, Plus, Bell, FolderKanban, PauseCircle, PlayCircle, Search, X } from 'lucide-react';
import { projectService, Project } from '@/services/projectService';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateDropdown } from '@/components/ui/DateDropdown';
import { HourPicker } from '@/components/ui/HourPicker';
import { StatusDropdown, type StatusOption } from '@/components/ui/StatusDropdown';
import { useAuth } from '@/context/AuthContext';
import { bugService } from '@/services/bugService';
import { updateService } from '@/services/updateService';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T } | T;

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

export default function DailyWorkUpdate() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  const [form, setForm] = useState<WorkSubmission>({
    submission_date: todayYMD(),
    hours_today: 4,
    overtime_hours: 0,
    completed_tasks: '',
    pending_tasks: '',
    ongoing_tasks: '',
    notes: '',
    planned_work_status: 'not_started',
    planned_work_notes: '',
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
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [plannedWork, setPlannedWork] = useState<string>('');
  const [plannedWorkStatus, setPlannedWorkStatus] = useState<StatusOption>('not_started');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingProjectStats, setLoadingProjectStats] = useState(false);
  const [projectStats, setProjectStats] = useState<Record<string, { bugs: number; updates: number }>>({});
  const [projectSearch, setProjectSearch] = useState('');
  const [requestAdminApproval, setRequestAdminApproval] = useState(false);
  const [requestedExtraHours, setRequestedExtraHours] = useState<number>(0);
  const [approvalReason, setApprovalReason] = useState('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartedAt, setBreakStartedAt] = useState<Date | null>(null);
  const [breakEntries, setBreakEntries] = useState<string[]>([]);

  const overtimeHours = useMemo(() => requestedExtraHours, [requestedExtraHours]);
  const regularHours = useMemo(() => Math.min(Number(form.hours_today), 8), [form.hours_today]);
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, projectSearch]);

  const mapWithConcurrency = async <T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let currentIndex = 0;
    const workers = new Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(async () => {
        while (currentIndex < items.length) {
          const index = currentIndex++;
          results[index] = await mapper(items[index]);
        }
      });
    await Promise.all(workers);
    return results;
  };

  const fetchProjectStats = useCallback(async (projectList: Project[]) => {
    if (projectList.length === 0) {
      setProjectStats({});
      return;
    }
    setLoadingProjectStats(true);
    try {
      const statResults = await mapWithConcurrency(projectList, 4, async (project) => {
        try {
          const [bugResponse, updates] = await Promise.all([
            bugService.getBugs({ projectId: project.id, page: 1, limit: 1 }),
            updateService.getUpdatesByProject(project.id),
          ]);
          return {
            projectId: project.id,
            bugs: Number(bugResponse?.pagination?.totalBugs ?? bugResponse?.bugs?.length ?? 0),
            updates: Array.isArray(updates) ? updates.length : 0,
          };
        } catch {
          return {
            projectId: project.id,
            bugs: 0,
            updates: 0,
          };
        }
      });

      const nextStats: Record<string, { bugs: number; updates: number }> = {};
      statResults.forEach((result) => {
        nextStats[result.projectId] = { bugs: result.bugs, updates: result.updates };
      });
      setProjectStats(nextStats);
    } finally {
      setLoadingProjectStats(false);
    }
  }, []);

  const canSubmit = useMemo(() => {
    const hasDate = !!form.submission_date;
    const hrs = Number(form.hours_today);
    const hasHours = hrs >= 1 && hrs <= 8;
    const overtimeRequestValid = !requestAdminApproval
      ? true
      : requestedExtraHours > 0 && requestedExtraHours <= 16 && approvalReason.trim().length > 0;

    // Check if at least one task field has content
    const hasTasks = countItems(form.completed_tasks) > 0 ||
      countItems(form.pending_tasks) > 0 ||
      countItems(form.ongoing_tasks) > 0 ||
      countItems(form.notes) > 0;

    return hasDate && hasHours && hasTasks && overtimeRequestValid;
  }, [form, requestAdminApproval, requestedExtraHours, approvalReason]);

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

  function to12hTime(d: Date) {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  }

  function onToggleBreak() {
    if (!isOnBreak) {
      const now = new Date();
      setIsOnBreak(true);
      setBreakStartedAt(now);
      toast({
        title: 'Break started',
        description: `Started at ${to12hTime(now)}`,
      });
      return;
    }

    const endedAt = new Date();
    const startedAt = breakStartedAt ?? endedAt;
    const durationMins = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
    const breakLine = `[BREAK] ${to12hTime(startedAt)} - ${to12hTime(endedAt)} (${durationMins} min)`;
    setBreakEntries((prev) => {
      if (prev.includes(breakLine)) return prev;
      return [...prev, breakLine];
    });
    setIsOnBreak(false);
    setBreakStartedAt(null);
    toast({
      title: 'Break ended',
      description: `Break recorded (${durationMins} min).`,
    });
  }

  function parseOvertimeRequestFromNotes(notes?: string) {
    const source = notes || '';
    const blockRegex = /\n?\[OVERTIME APPROVAL REQUEST\][\s\S]*?(?=\n\[[A-Z _-]+\]|\s*$)/i;
    const blockMatch = source.match(blockRegex);
    const block = blockMatch?.[0] || '';

    const requestedFromBlock = block.match(/Requested Extra Hours:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const reasonFromBlock = block.match(/Reason:\s*([^\n\r]+)/i)?.[1]?.trim() || '';

    return {
      requestedFromBlock,
      reasonFromBlock,
      cleanNotes: source.replace(blockRegex, '').trim(),
    };
  }

  function parseBreakLinesFromNotes(notes?: string) {
    const source = notes || '';
    const breakLines = (source.match(/^\[BREAK\].*$/gim) || [])
      .map((line) => line.trim())
      .filter(Boolean);
    const cleanNotes = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('[BREAK]'))
      .join('\n')
      .trim();
    return { breakLines, cleanNotes };
  }

  function getBreakMinutes(lines: string[]) {
    return lines.reduce((sum, line) => {
      const mins = Number(line.match(/\((\d+)\s*min\)/i)?.[1] || 0);
      return sum + (Number.isFinite(mins) ? mins : 0);
    }, 0);
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
      const hoursNum = Number(form.hours_today);
      if (!(hoursNum >= 1 && hoursNum <= 8)) {
        throw new Error("Today's Hours must be between 1 and 8");
      }
      if (requestAdminApproval) {
        if (!(requestedExtraHours > 0 && requestedExtraHours <= 16)) {
          throw new Error('Requested extra hours must be between 0.25 and 16');
        }
        if (approvalReason.trim().length === 0) {
          throw new Error('Please provide a reason for admin approval');
        }
      }

      // Validate that at least one task field has content
      const hasTasks = countItems(form.completed_tasks) > 0 ||
        countItems(form.pending_tasks) > 0 ||
        countItems(form.ongoing_tasks) > 0 ||
        countItems(form.notes) > 0;
      if (!hasTasks) {
        throw new Error('Please enter at least one task in Completed, Pending, Ongoing, or Upcoming fields');
      }
      
      // Optimistic UI update - show feedback immediately for faster perceived performance
      toast({ 
        title: isEditing ? 'Updating...' : 'Saving...',
        description: 'Processing your submission'
      });
      
      // Get planned projects and work from check-in data if available
      const noteParts: string[] = [];
      if (requestAdminApproval) {
        noteParts.push(
          `\n[OVERTIME APPROVAL REQUEST]\nRequested Extra Hours: ${requestedExtraHours}\nReason: ${approvalReason.trim()}`
        );
      }

      const cleanedNotes = parseBreakLinesFromNotes(form.notes || '').cleanNotes;
      const payload: any = {
        ...form,
        notes: `${cleanedNotes}${noteParts.join('\n')}`.trim(),
        requested_extra_hours: requestAdminApproval ? requestedExtraHours : 0,
        approval_reason: requestAdminApproval ? approvalReason.trim() : '',
        break_entries: breakEntries,
        total_break_minutes: getBreakMinutes(breakEntries),
        planned_projects: selectedProjects.length > 0 ? selectedProjects : undefined,
        planned_work: plannedWork.trim() || undefined
      };
      
      // Make API call (now returns immediately, notifications happen in background)
      const res = await submitWork(payload);
      if ((res as any)?.success === false) throw new Error((res as any)?.message || 'Failed');
      
      // Update toast with success
      toast({ 
        title: isEditing ? 'Daily submission updated' : 'Daily submission saved',
        description: 'Your work update has been saved successfully'
      });
      
      // Reset planning details after successful submission
      setSelectedProjects([]);
      setPlannedWork('');
      
      // Small delay for better UX before navigation (allows user to see success message)
      setTimeout(() => {
        navigate(`/${currentUser?.role}/daily-update`);
      }, 500);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit');
      toast({
        title: 'Failed to save',
        description: e?.message || 'An error occurred while saving',
        variant: 'destructive'
      });
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

  const handleCheckIn = useCallback(async () => {
    try {
      setIsCheckingIn(true);
      
      // Optimistic UI update - show success immediately for faster perceived performance
      const optimisticCheckInTime = new Date().toISOString();
      setForm((prev) => ({
        ...prev,
        check_in_time: optimisticCheckInTime,
      }));

      // Close dialog immediately for instant feedback
      setIsCheckInDialogOpen(false);
      
      // Show optimistic success toast
      const optimisticTime = new Date(optimisticCheckInTime).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
      
      toast({
        title: 'Checking in...',
        description: 'Processing your check-in',
      });

      // Make API call in background
      const result = await checkIn(form.submission_date, selectedProjects, plannedWork, form.planned_work_status || 'not_started');

      // Update with actual server time
      setForm((prev) => ({
        ...prev,
        check_in_time: result.check_in_time,
      }));

      const checkInDate = new Date(result.check_in_time);
      const formattedTime = checkInDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });

      // Update toast with success
      toast({
        title: 'Checked in successfully',
        description: `Check-in time: ${formattedTime}`,
      });

      // Keep selectedProjects and plannedWork for preview and submission
      // Don't reset them - they should persist until daily work is saved
    } catch (e: any) {
      // Revert optimistic update on error
      setForm((prev) => ({
        ...prev,
        check_in_time: undefined,
      }));
      
      // Reopen dialog on error
      setIsCheckInDialogOpen(true);
      
      toast({
        title: 'Failed to check in',
        description: e?.message || 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsCheckingIn(false);
    }
  }, [form.submission_date, selectedProjects, plannedWork, form.planned_work_status]);

  function handleProjectToggle(projectId: string) {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  }

  // Live local preview (does not require backend)
  useEffect(() => {
    const weekday = new Date(form.submission_date).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
    const d = new Date(form.submission_date);
    const dateText = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${weekday}`;

    // Format check-in time if available, otherwise show placeholder
    let checkInText = '----';
    if (form.check_in_time) {
      try {
        const checkInDate = new Date(form.check_in_time);
        checkInText = checkInDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
      } catch {
        checkInText = '----';
      }
    }

    const cCount = countItems(form.completed_tasks);
    const pCount = countItems(form.pending_tasks);
    const oCount = countItems(form.ongoing_tasks);
    const uCount = countItems(form.notes);

    let header = `🧾 CODO Daily Work Update — User\n` +
      `📅 Date: ${dateText}\n` +
      `🕘 Check-in Time: ${checkInText}\n` +
      `⏱ Today's Working Hours: ${Number(form.hours_today || 0)} Hours`;

    // Add overtime breakdown if applicable
    if (overtimeHours > 0) {
      header += `\n📊 Regular Hours: ${regularHours} Hours`;
      header += `\n⏰ Overtime Hours: ${overtimeHours} Hours`;
    }
    if (requestAdminApproval && requestedExtraHours > 0) {
      header += `\n🧾 Requested Extra Hours: ${requestedExtraHours} Hours`;
      if (approvalReason.trim()) {
        header += `\n📝 Approval Reason: ${approvalReason.trim()}`;
      }
    }
    if (breakEntries.length > 0) {
      header += `\n☕ Total Break Time: ${getBreakMinutes(breakEntries)} min`;
    }

    // Compute totals for current CODO period up to selected date
    const since = getCodoPeriodStart(form.submission_date);
    const sinceLabel = new Date(since).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
    header += `\n📊 Total Working Days (Since ${sinceLabel}): 0 Days`;
    header += `\n🧮 Total Hours Completed : 0 hours`;

    const sec: string[] = [];

    // Add planned projects and work if available
    if (selectedProjects.length > 0 || plannedWork.trim()) {
      let plannedSection = `📋 *Planning Details:*\n\n`;

      if (selectedProjects.length > 0) {
        const projectNames = projects
          .filter(p => selectedProjects.includes(p.id))
          .map(p => p.name)
          .join(', ');
        plannedSection += `📁 *Projects:* ${projectNames}\n`;
      }

      if (plannedWork.trim()) {
        plannedSection += `\n📝 *Planned Work:*\n${plannedWork.trim()}\n`;
      }

      sec.push(plannedSection);
    }

    const cTxt = (form.completed_tasks || '').trim();
    const pTxt = (form.pending_tasks || '').trim();
    const oTxt = (form.ongoing_tasks || '').trim();
    const uTxt = parseBreakLinesFromNotes(form.notes || '').cleanNotes;
    if (cCount > 0) sec.push(`✅ Completed (${cCount})\n\n${cTxt}`);
    if (pCount > 0) sec.push(`⌛ Pending (${pCount})\n\n${pTxt}`);
    if (oCount > 0) sec.push(`🔄 Ongoing (${oCount})\n\n${oTxt}`);
    if (uCount > 0) sec.push(`🔥 Upcoming (${uCount})\n\n${uTxt}`);
    if (breakEntries.length > 0) sec.push(`☕ Breaks (${breakEntries.length})\n\n${breakEntries.join('\n')}`);

    // Add Work Notes (always show if there's content)
    const workNotesTxt = (form.planned_work_notes || '').trim();
    const workNotesCount = countItems(form.planned_work_notes);
    if (workNotesCount > 0) {
      sec.push(`📝 Work Notes (${workNotesCount})\n\n${workNotesTxt}`);
    }

    // Add Planned Work Status (always show if set)
    if (form.planned_work_status) {
      const statusLabels: Record<string, string> = {
        'not_started': 'Not Started',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'on_hold': 'On Hold',
        'blocked': 'Blocked'
      };
      const statusLabel = statusLabels[form.planned_work_status] || form.planned_work_status;
      sec.push(`📊 Planned Work Status: ${statusLabel}`);
    }

    const text = sec.length ? header + `\n\n` + sec.join(`\n\n`) : header;
    setTemplate(text);
  }, [form.submission_date, form.check_in_time, form.hours_today, form.completed_tasks, form.pending_tasks, form.ongoing_tasks, form.notes, form.planned_work_notes, form.planned_work_status, selectedProjects, plannedWork, projects, requestAdminApproval, requestedExtraHours, approvalReason, overtimeHours, regularHours, breakEntries]);

  // Load projects when check-in dialog opens or when we need them for preview
  useEffect(() => {
    if (isCheckInDialogOpen || selectedProjects.length > 0) {
      (async () => {
        try {
          setLoadingProjects(true);
          const projectsData = await projectService.getProjects();
          // Filter to show only active projects
          const activeProjects = projectsData.filter(p => p.status === 'active' || !p.status);
          setProjects(activeProjects);
          fetchProjectStats(activeProjects);
          console.log('Loaded projects:', activeProjects.length, 'out of', projectsData.length);
        } catch (error: any) {
          console.error('Failed to load projects:', error);
          if (isCheckInDialogOpen) {
            toast({
              title: 'Error',
              description: error?.message || 'Failed to load projects. Please try again.',
              variant: 'destructive'
            });
          }
          setProjects([]);
          setProjectStats({});
        } finally {
          setLoadingProjects(false);
        }
      })();
    }
  }, [isCheckInDialogOpen, selectedProjects.length, fetchProjectStats]);

  // Load check-in data when date changes (for non-editing mode)
  useEffect(() => {
    if (!isEditing && form.submission_date) {
      (async () => {
        try {
          const currentDate = form.submission_date;
          const submissionsRes = await listMySubmissions({ 
            from: currentDate, 
            to: currentDate 
          });
          const submissions: any[] = (submissionsRes && submissionsRes.data) 
            ? submissionsRes.data 
            : Array.isArray(submissionsRes) 
              ? submissionsRes 
              : [];
          
          // Find submission for current date
          const existingSubmission = submissions.find(s => s.submission_date === currentDate);

          if (existingSubmission) {
            const parsedBreaks = parseBreakLinesFromNotes(existingSubmission.notes || '');
            const breaksFromRow = (() => {
              const raw = existingSubmission.break_entries;
              if (Array.isArray(raw)) return raw;
              if (typeof raw === 'string') {
                try {
                  const parsed = JSON.parse(raw);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              }
              return [];
            })();
            // Load check-in time if available
            if (existingSubmission.check_in_time) {
              setForm((prev) => ({
                ...prev,
                check_in_time: existingSubmission.check_in_time,
              }));
            }
            setBreakEntries(breaksFromRow.length > 0 ? breaksFromRow : parsedBreaks.breakLines);

            // Load planned projects if available
            if (existingSubmission.planned_projects) {
              try {
                const plannedProjectsArray = typeof existingSubmission.planned_projects === 'string'
                  ? JSON.parse(existingSubmission.planned_projects)
                  : existingSubmission.planned_projects;
                if (Array.isArray(plannedProjectsArray) && plannedProjectsArray.length > 0) {
                  setSelectedProjects(plannedProjectsArray);
                }
              } catch (e) {
                console.error('Failed to parse planned_projects:', e);
              }
            }

            // Load planned work if available
            if (existingSubmission.planned_work) {
              setPlannedWork(existingSubmission.planned_work);
            }
          } else {
            // No submission found for this date, clear check-in data
            setForm((prev) => ({
              ...prev,
              check_in_time: undefined,
            }));
            setSelectedProjects([]);
            setPlannedWork('');
            setBreakEntries([]);
          }
        } catch (error) {
          console.error('Failed to load check-in data for date:', error);
        }
      })();
    }
  }, [form.submission_date, isEditing]);

  useEffect(() => {
    (async () => {
      try {
        setTasksLoading(true);

        // Load tasks
        const res: any = await listMyTasks();
        const items: UserTask[] = (res && res.data) ? res.data : Array.isArray(res) ? res : [];
        const sorted = [...items].sort((a, b) => {
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
            const parsedOvertime = parseOvertimeRequestFromNotes(existingSubmission.notes || '');
            const parsedBreaks = parseBreakLinesFromNotes(parsedOvertime.cleanNotes || '');
            const requestedFromRow = Number(
              existingSubmission.requested_extra_hours ?? existingSubmission.requestedExtraHours ?? 0
            );
            const reasonFromRow = String(
              existingSubmission.approval_reason ?? existingSubmission.approvalReason ?? ''
            ).trim();
            const resolvedRequested = requestedFromRow > 0
              ? requestedFromRow
              : Number(parsedOvertime.requestedFromBlock || 0);
            const resolvedReason = reasonFromRow || parsedOvertime.reasonFromBlock;
            const hasApprovalRequest = resolvedRequested > 0 || resolvedReason.length > 0;

            setForm({
              submission_date: existingSubmission.submission_date,
              check_in_time: existingSubmission.check_in_time || undefined,
              hours_today: existingSubmission.hours_today || 8,
              overtime_hours: existingSubmission.overtime_hours || 0,
              completed_tasks: existingSubmission.completed_tasks || '',
              pending_tasks: existingSubmission.pending_tasks || '',
              ongoing_tasks: existingSubmission.ongoing_tasks || '',
              notes: parsedBreaks.cleanNotes || '',
            });
            setRequestAdminApproval(hasApprovalRequest);
            setRequestedExtraHours(hasApprovalRequest ? resolvedRequested : 0);
            setApprovalReason(hasApprovalRequest ? resolvedReason : '');
            const breaksFromRow = (() => {
              const raw = existingSubmission.break_entries;
              if (Array.isArray(raw)) return raw;
              if (typeof raw === 'string') {
                try {
                  const parsed = JSON.parse(raw);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              }
              return [];
            })();
            setBreakEntries(breaksFromRow.length > 0 ? breaksFromRow : parsedBreaks.breakLines);

            // Load planned projects and work if available
            if (existingSubmission.planned_projects) {
              try {
                const plannedProjectsArray = typeof existingSubmission.planned_projects === 'string'
                  ? JSON.parse(existingSubmission.planned_projects)
                  : existingSubmission.planned_projects;
                if (Array.isArray(plannedProjectsArray)) {
                  setSelectedProjects(plannedProjectsArray);
                }
              } catch (e) {
                console.error('Failed to parse planned_projects:', e);
              }
            }

            if (existingSubmission.planned_work) {
              setPlannedWork(existingSubmission.planned_work);
            }
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
        {/* Simplified Header */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/${currentUser?.role}/daily-update`)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {isEditing ? 'Edit Work Update' : 'Daily Work Update'}
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
                Fill out your daily work progress and tasks
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={onToggleBreak}
                type="button"
                variant={isOnBreak ? 'destructive' : 'outline'}
                className="flex-1 sm:flex-none border-2 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                {isOnBreak ? (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    End Break
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Break
                  </>
                )}
              </Button>
              <Button
                onClick={() => setIsCheckInDialogOpen(true)}
                disabled={isCheckingIn}
                variant="outline"
                className="flex-1 sm:flex-none border-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {isCheckingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Checking in...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Check-in
                  </>
                )}
              </Button>
              <Button
                disabled={!canSubmit || loading}
                onClick={onSubmit}
                className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditing ? 'Updating...' : 'Saving...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{isEditing ? 'Update' : 'Save'}</span>
                  </div>
                )}
              </Button>
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

          <div className="space-y-6 sm:space-y-8 lg:space-y-10">
            {/* Basic Information Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Work Date <span className="text-red-500">*</span>
                  </Label>
                  <DateDropdown
                    value={form.submission_date}
                    onChange={(v) => setForm((p) => ({ ...p, submission_date: v }))}
                    placeholder="Select date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours-worked" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hours Worked <span className="text-red-500">*</span>
                  </Label>
                  <HourPicker
                    value={form.hours_today}
                    onChange={(v) => setForm((p) => ({ ...p, hours_today: v }))}
                    min={1}
                    max={8}
                    step={0.25}
                    placeholder="Select hours"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start sm:items-center gap-3">
                  <Checkbox
                    id="request-admin-approval"
                    checked={requestAdminApproval}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked);
                      setRequestAdminApproval(enabled);
                      if (!enabled) {
                        setRequestedExtraHours(0);
                        setApprovalReason('');
                      }
                    }}
                  />
                  <div className="space-y-1 min-w-0">
                    <Label htmlFor="request-admin-approval" className="text-sm font-semibold text-blue-900 dark:text-blue-200 cursor-pointer">
                      Worked more than 8 hours? Request Admin Approval
                    </Label>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      Daily hours are capped at 8. Use this option to request extra-hour approval.
                    </p>
                  </div>
                </div>
              </div>

              {requestAdminApproval && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="space-y-2 md:col-span-4">
                    <Label htmlFor="requested-extra-hours" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Requested Extra Hours
                    </Label>
                    <Input
                      id="requested-extra-hours"
                      type="number"
                      min={0.25}
                      max={16}
                      step={0.25}
                      value={requestedExtraHours || ''}
                      onChange={(e) => {
                        const next = Number(e.target.value || 0);
                        setRequestedExtraHours(Math.max(0, Math.min(16, next)));
                      }}
                      placeholder="e.g. 2"
                      className="h-[110px] text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Range: 0.25 to 16 hours
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-8">
                    <Label htmlFor="approval-reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reason for Approval
                    </Label>
                    <Textarea
                      id="approval-reason"
                      className="min-h-[110px] border-2 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-400 rounded-xl text-sm leading-relaxed resize-none"
                      value={approvalReason}
                      onChange={(e) => setApprovalReason(e.target.value)}
                      placeholder="Explain why extra hours are needed..."
                    />
                  </div>
                </div>
              )}

              {/* Overtime Breakdown - Compact */}
              {requestAdminApproval && overtimeHours > 0 && (
                <div className="mt-4 p-3 sm:p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Regular Hours:</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right sm:text-left">{regularHours}h</span>
                    <span className="text-gray-600 dark:text-gray-400">Requested Extra:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400 text-right sm:text-left">{overtimeHours}h</span>
                  </div>
                </div>
              )}

              {!canSubmit && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Please complete: Date, Hours (1–8), and at least one task field.
                    {requestAdminApproval && ' For approval requests, add requested extra hours and a detailed reason.'}
                  </p>
                </div>
              )}
            </div>

            {/* Tasks and Preview Grid - Left: Tasks (8 cols), Right: Preview (4 cols) */}
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-10 lg:items-stretch">
              {/* Today's Tasks Section - Left Side, 8 columns equivalent */}
              <div className="flex-1 lg:flex-[8] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 sm:p-6 shadow-sm lg:h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                  <ListTodo className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Tasks</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">One task per line</span>
                </div>

                  <div className="grid grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
                    {/* Completed Tasks */}
                    <div className="col-span-12 lg:col-span-6 space-y-4">
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
                    <div className="col-span-12 lg:col-span-6 space-y-4">
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
                    <div className="col-span-12 lg:col-span-6 space-y-4">
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
                    <div className="col-span-12 lg:col-span-6 space-y-4">
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

                    {/* Work Notes */}
                    <div className="col-span-12 lg:col-span-6 space-y-4 flex flex-col">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-teal-500 rounded-full shadow-lg"></div>
                        <Label htmlFor="planned-work-notes" className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-teal-600">📝</span>
                          Work Notes
                        </Label>
                      </div>
                      <Textarea
                        id="planned-work-notes"
                        className="h-[180px] border-2 border-teal-200 dark:border-teal-800 focus:border-teal-500 dark:focus:border-teal-400 rounded-xl text-sm leading-relaxed resize-none"
                        value={form.planned_work_notes || ''}
                        onChange={(e) => setForm((p) => ({ ...p, planned_work_notes: e.target.value }))}
                        placeholder="📝 Add notes about the status (optional)...

Example:
• Waiting for API documentation
• Blocked by database migration
• Need code review before proceeding
• Dependencies not yet available"
                      />
                    </div>

                    {/* Planned Work Status */}
                    <div className="col-span-12 lg:col-span-6 space-y-4 flex flex-col">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-lg"></div>
                        <Label htmlFor="planned-work-status" className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-indigo-600">📊</span>
                          Planned Work Status
                        </Label>
                      </div>
                      <div className="h-[180px] p-4 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 flex flex-col justify-between">
                        <div>
                          <StatusDropdown
                            value={form.planned_work_status || 'not_started'}
                            onChange={(value) => setForm((p) => ({ ...p, planned_work_status: value }))}
                            placeholder="Select status"
                            className="w-full"
                          />
                        </div>
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Update the status to reflect your current progress on planned tasks.
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            This helps track progress from planning to completion and provides visibility into your work status throughout the day.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Section - Right Side, 4 columns equivalent, Matches Today's Tasks Height */}
              <div className="flex-1 lg:flex-[4] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 sm:p-6 shadow-sm lg:h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Preview
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSharePreview}
                    className="h-8 text-xs transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    <Share2 className="h-3 w-3 mr-1.5" />
                    Share
                  </Button>
                </div>

                {/* Scrollable Preview Content - Matches Tasks Section Height with Internal Scrolling */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9CA3AF transparent' }}>
                  <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed font-mono m-0">
                    {template || 'Start filling the form to see preview...'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* Professional Check-in Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={(open) => {
        setIsCheckInDialogOpen(open);
        if (!open) {
          setProjectSearch('');
        }
        // Don't reset selectedProjects and plannedWork when dialog closes
        // They should persist for preview and submission
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 [&>button[data-radix-dialog-close]]:hidden">
          {/* Header with gradient background */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-blue-600 to-indigo-600 p-6 text-white overflow-visible">
            <div className="absolute inset-0 bg-black/10"></div>
            {/* Close Button - Top Right */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCheckInDialogOpen(false);
                // Don't reset selectedProjects and plannedWork - keep them for preview
              }}
              className="absolute top-3 right-3 z-[100] p-2.5 bg-white/25 hover:bg-white/40 rounded-lg transition-all duration-200 group backdrop-blur-md border-2 border-white/40 hover:border-white/60 shadow-2xl hover:shadow-white/20 hover:scale-110 active:scale-95"
              aria-label="Close dialog"
              type="button"
              style={{ pointerEvents: 'auto' }}
            >
              <X className="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" strokeWidth={3} />
            </button>
            <div className="relative z-10">
              <DialogHeader className="space-y-2 pr-14">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Clock className="h-6 w-6" />
                  </div>
                  Check-in
                </DialogTitle>
                <DialogDescription className="text-emerald-50 text-base">
                  Select projects you plan to work on and describe your planned work.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-900/50">
            {/* Date and Time - Elegant Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {new Date(form.submission_date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'Asia/Kolkata'
                    })}
                  </span>
                </div>
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full"></div>
              </div>
              <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {new Date().toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Kolkata'
                    })}
                  </span>
                </div>
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
              </div>
            </div>

            {/* Project Selection - Enhanced */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Select Projects to Work On
                {selectedProjects.length > 0 && (
                  <span className="ml-auto px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                    {selectedProjects.length} selected
                  </span>
                )}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <Input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="h-10 pl-10 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-h-56 overflow-y-auto p-3">
                  {loadingProjects ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-3 text-sm text-gray-600 dark:text-gray-400 font-medium">Loading projects...</span>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderKanban className="h-10 w-10 text-gray-400 mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No projects available</p>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="h-8 w-8 text-gray-400 mx-auto mb-2 opacity-60" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No matching projects</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredProjects.map((project) => {
                        const isSelected = selectedProjects.includes(project.id);
                        return (
                          <div
                            key={project.id}
                            onClick={() => handleProjectToggle(project.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent'
                            }`}
                          >
                            <Checkbox
                              id={`project-${project.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleProjectToggle(project.id)}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <label
                              htmlFor={`project-${project.id}`}
                              className={`text-sm font-medium cursor-pointer flex-1 ${
                                isSelected
                                  ? 'text-blue-900 dark:text-blue-100'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {project.name}
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                {loadingProjectStats ? '...' : (projectStats[project.id]?.bugs ?? 0)} bugs
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {loadingProjectStats ? '...' : (projectStats[project.id]?.updates ?? 0)} updates
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Planned Work - Enhanced */}
            <div className="space-y-3">
              <Label htmlFor="planned-work" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Planned Work for Today
              </Label>
              <div className="relative">
                <Textarea
                  id="planned-work"
                  placeholder="Describe what you plan to work on today...&#10;&#10;Example:&#10;• Fix authentication bug in login module&#10;• Review PR #123 for new feature&#10;• Update API documentation&#10;• Write unit tests for user service"
                  value={plannedWork}
                  onChange={(e) => setPlannedWork(e.target.value)}
                  className="min-h-[140px] border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-sm leading-relaxed resize-none bg-white dark:bg-gray-800 shadow-sm focus:shadow-md transition-all"
                />
                {plannedWork.trim() && (
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {plannedWork.trim().split('\n').filter(l => l.trim()).length} line{plannedWork.trim().split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with Centered Action Button */}
          <DialogFooter className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="w-full flex justify-center">
              <Button
                onClick={handleCheckIn}
                disabled={isCheckingIn || (selectedProjects.length === 0 && !plannedWork.trim())}
                className="w-full sm:w-auto min-w-[200px] px-8 py-6 bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 hover:from-emerald-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {isCheckingIn ? (
                  <div className="flex items-center justify-center gap-3 animate-pulse">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">Checking in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Clock className="h-5 w-5 animate-pulse" />
                    <span className="font-medium">Confirm Check-in</span>
                  </div>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
