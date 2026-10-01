import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { submitWork, WorkSubmission, listMyTasks, UserTask, updateTask, listMySubmissions, checkIn, notifyWorkActivity, parseSubmissionsListResponse } from '@/services/todoService';
import { CheckoutProjectUpdatesCard, checkoutHoursAllocationOk } from '@/components/daily-work/CheckoutProjectUpdatesCard';
import { WeeklyReportStep } from '@/components/daily-work/WeeklyReportStep';
import { isSaturdayYmd, getWeeklyReport } from '@/services/weeklyReportService';
import {
  formatProjectUpdatesForText,
  parseProjectUpdatesFromRow,
  projectUpdatesToPayload,
  type ProjectWorkUpdate,
} from '@/lib/projectWorkUpdates';
import {
  defaultTimeAllocation,
  formatHoursShort,
  isGrowthGlimpseDay,
  parseTimeAllocationFromRow,
  withSlotAttendance,
  type TimeAllocation,
} from '@/lib/checkoutTimeAllocation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClipboardCopy, Clock, FileText, Share2, FolderKanban, PauseCircle, PlayCircle, Search, X, LogOut, Calendar, ListTodo, AlertTriangle, Building2, Home, MapPin, Loader2, LocateFixed, RefreshCw, ShieldAlert, CheckCircle2, ClipboardList, Check } from 'lucide-react';
import { projectService, Project } from '@/services/projectService';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HourPicker } from '@/components/ui/HourPicker';
import { StatusDropdown, type StatusOption } from '@/components/ui/StatusDropdown';
import { useAuth } from '@/context/AuthContext';
import { cn, userRequiresOnboarding } from '@/lib/utils';
import { bugService } from '@/services/bugService';
import { updateService } from '@/services/updateService';
import { toLocalCalendarDateString } from '@/lib/dateUtils';
import { extractApiErrorMessage } from '@/lib/apiError';
import { assertDeviceClockMatchesServer, prefetchServerClock } from '@/lib/deviceClock';
import {
  getCheckInPosition,
  OfficeLocationError,
  queryGeolocationPermission,
  resolveOfficeConfig,
  watchGeolocationPermission,
  type CheckInPosition,
  type GeolocationPermissionState,
  type OfficeLocationErrorCode,
} from '@/lib/officeLocation';
import {
  detectLocationClient,
  getAlternateLocationHelpGuides,
  getLocationPermissionHelp,
  type LocationHelpGuide,
} from '@/lib/locationPermissionHelp';
import { ENV } from '@/lib/env';
import {
  getAttendanceStatus,
  type AttendanceStatus,
  type WorkMode,
} from '@/services/leaveService';
import { formatCheckInCutoffLabel } from '@/services/settingsService';
import { requestWfhForToday } from '@/services/wfhRequestService';
import {
  calendarMonthKey,
  computeMonthTotalsToDate,
  getCalendarMonthPeriod,
} from '@/lib/workPeriodUtils';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T } | T;

const DAILY_WORK_DRAFT_VERSION = 1;
/** Why: Bump when project stat meaning changes (open bugs / approved updates). */
const PROJECT_STATS_CACHE_VERSION = 2;

function dailyWorkDraftStorageKey(userId: string | number, date: string) {
  return `bugRicer:dailyWorkDraft:v${DAILY_WORK_DRAFT_VERSION}:${userId}:${date}`;
}

type DailyWorkDraftStored = {
  v: number;
  savedAt: number;
  submission_date: string;
  form: WorkSubmission;
  breakEntries: string[];
  selectedProjects: string[];
  plannedWork: string;
  requestAdminApproval: boolean;
  requestedExtraHours: number;
  approvalReason: string;
  isOnBreak: boolean;
  breakStartedAtIso: string | null;
  projectUpdates: Record<string, ProjectWorkUpdate>;
  timeAllocation?: TimeAllocation;
};

function clearDailyWorkDraft(userId: string | number, date: string) {
  try {
    localStorage.removeItem(dailyWorkDraftStorageKey(userId, date));
  } catch {
    /* ignore */
  }
}

/**
 * Why: After DB check-in rows are deleted, drafts can still force Checkout.
 * Strip phantom check_in_time from all drafts for this user when today has no open session.
 */
function stripPhantomCheckInDrafts(userId: string | number) {
  try {
    const prefix = `bugRicer:dailyWorkDraft:v${DAILY_WORK_DRAFT_VERSION}:${userId}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as DailyWorkDraftStored;
        if (!parsed?.form?.check_in_time) continue;
        parsed.form = { ...parsed.form, check_in_time: undefined };
        parsed.isOnBreak = false;
        parsed.breakStartedAtIso = null;
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        /* ignore bad draft keys */
      }
    }
  } catch {
    /* ignore */
  }
}

type CheckoutWizardStepKey = 'weekly_report' | 'form' | 'preview';

function countTaskLines(text?: string) {
  if (!text) return 0;
  return text
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.length > 0).length;
}

function emptyDailyTaskFields() {
  return {
    completed_tasks: '',
    pending_tasks: '',
    ongoing_tasks: '',
    notes: '',
  };
}

function emptyCheckoutFormFields() {
  return {
    ...emptyDailyTaskFields(),
    planned_work_notes: '',
  };
}

function clearProjectUpdateNotes(updates: Record<string, ProjectWorkUpdate>) {
  const next: Record<string, ProjectWorkUpdate> = {};
  for (const [projectId, update] of Object.entries(updates)) {
    next[projectId] = { ...update, notes: '' };
  }
  return next;
}

function isWorkSubmissionRowComplete(row: any) {
  // Why: Checkout is complete once hours are logged — tasks / WFH-office are not required.
  const hours = Number(row.hours_today || 0);
  return hours >= 1;
}

function parsePlannedProjectsFromRow(existingSubmission: any): string[] {
  if (!existingSubmission?.planned_projects) return [];
  try {
    const plannedProjectsArray =
      typeof existingSubmission.planned_projects === 'string'
        ? JSON.parse(existingSubmission.planned_projects)
        : existingSubmission.planned_projects;
    return Array.isArray(plannedProjectsArray) ? plannedProjectsArray : [];
  } catch {
    return [];
  }
}

function projectUpdatesMapFromRow(row: any): Record<string, ProjectWorkUpdate> {
  const parsed = parseProjectUpdatesFromRow(row?.project_updates);
  const map: Record<string, ProjectWorkUpdate> = {};
  parsed.forEach((u) => {
    map[u.project_id] = u;
  });
  return map;
}

/** Why: Unplanned checkout projects are those with updates that were not planned at check-in. */
function extraProjectIdsFromUpdates(
  updates: Record<string, ProjectWorkUpdate>,
  plannedIds: string[]
): string[] {
  const planned = new Set(plannedIds);
  return Object.keys(updates).filter((id) => id && !planned.has(id));
}

function breakEntriesFromSubmissionRow(existingSubmission: any): string[] {
  const raw = existingSubmission?.break_entries;
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
}

function todayYMD() {
  return toLocalCalendarDateString(new Date());
}

function formatAttendanceDateLabel(value?: string) {
  if (!value) return '—';
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function attendanceErrorToast(title: string, error: unknown) {
  return {
    title,
    description: extractApiErrorMessage(error, 'An error occurred'),
    variant: 'destructive' as const,
  };
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

export type WorkFlowAction = 'checkin' | 'checkout';

export type DailyWorkFlowPanelProps = {
  onSaved?: () => void;
  onCheckInTimeChange?: (checkInTime: string | null) => void;
  editId?: string | null;
  flowAction?: WorkFlowAction | null;
  onFlowActionChange?: (action: WorkFlowAction | null) => void;
  onEditClose?: () => void;
  layout?: 'header' | 'inline';
  /** Why: Header row aligns action buttons with trailing stats (e.g. month hours). */
  headerTrailing?: ReactNode;
};

export function DailyWorkFlowPanel({
  onSaved,
  onCheckInTimeChange,
  editId: editIdProp,
  flowAction = null,
  onFlowActionChange,
  onEditClose,
  layout = 'inline',
  headerTrailing,
}: DailyWorkFlowPanelProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = editIdProp ?? searchParams.get('edit');
  const isEditing = !!editId;
  const isEmbedded = Boolean(onSaved);

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
  const [monthSubmissions, setMonthSubmissions] = useState<any[]>([]);
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [extraCheckoutProjectIds, setExtraCheckoutProjectIds] = useState<string[]>([]);
  const [plannedWork, setPlannedWork] = useState<string>('');
  const [plannedWorkStatus, setPlannedWorkStatus] = useState<StatusOption>('not_started');
  const [workMode, setWorkMode] = useState<WorkMode | null>(null);
  const [officeGeoStatus, setOfficeGeoStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [officeGeoMessage, setOfficeGeoMessage] = useState<string | null>(null);
  const [officeGeoErrorCode, setOfficeGeoErrorCode] = useState<OfficeLocationErrorCode | null>(null);
  const [officeGeoPermission, setOfficeGeoPermission] =
    useState<GeolocationPermissionState>('unknown');
  const [officePosition, setOfficePosition] = useState<CheckInPosition | null>(null);
  const [locationHelpPreset, setLocationHelpPreset] = useState<string>('auto');
  const locationClient = useMemo(() => detectLocationClient(), []);
  const locationHelpAlternates = useMemo(() => getAlternateLocationHelpGuides(), []);
  const locationHelpGuide: LocationHelpGuide = useMemo(() => {
    if (locationHelpPreset !== 'auto') {
      const found = locationHelpAlternates.find((g) => g.key === locationHelpPreset);
      if (found) return found.guide;
    }
    return getLocationPermissionHelp(locationClient);
  }, [locationHelpPreset, locationHelpAlternates, locationClient]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingProjectStats, setLoadingProjectStats] = useState(false);
  const [projectStats, setProjectStats] = useState<Record<string, { bugs: number; updates: number }>>({});
  const [projectSearch, setProjectSearch] = useState('');
  const [serverToday, setServerToday] = useState<string>(todayYMD());
  const [requestAdminApproval, setRequestAdminApproval] = useState(false);
  const [requestedExtraHours, setRequestedExtraHours] = useState<number>(0);
  const [approvalReason, setApprovalReason] = useState('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartedAt, setBreakStartedAt] = useState<Date | null>(null);
  const [breakEntries, setBreakEntries] = useState<string[]>([]);
  const [draftHydrationEpoch, setDraftHydrationEpoch] = useState(0);
  const [isCheckoutWizardOpen, setIsCheckoutWizardOpen] = useState(false);
  const [checkoutWizardStep, setCheckoutWizardStep] = useState<CheckoutWizardStepKey>('form');
  useEffect(() => {
    if (isCheckoutWizardOpen || isCheckInDialogOpen) prefetchServerClock();
  }, [isCheckoutWizardOpen, isCheckInDialogOpen]);
  const [weeklyReportDirty, setWeeklyReportDirty] = useState(false);
  const [todaySubmissionComplete, setTodaySubmissionComplete] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState<Record<string, ProjectWorkUpdate>>({});
  const [timeAllocation, setTimeAllocation] = useState<TimeAllocation>(() =>
    defaultTimeAllocation(todayYMD(), 0)
  );
  const [attendanceGate, setAttendanceGate] = useState<AttendanceStatus | null>(null);
  const [wfhRequestDialogOpen, setWfhRequestDialogOpen] = useState(false);
  const [wfhRequestNote, setWfhRequestNote] = useState('');
  const [wfhRequestSubmitting, setWfhRequestSubmitting] = useState(false);
  const projectsCacheRef = useRef<{ at: number; items: Project[] } | null>(null);
  const projectStatsCacheRef = useRef<{
    version: number;
    entries: Record<string, { bugs: number; updates: number }>;
  }>({ version: PROJECT_STATS_CACHE_VERSION, entries: {} });
  const didAutoOpenEditRef = useRef(false);
  const didAutoOpenFlowRef = useRef<string | null>(null);
  const weeklyReportSatisfiedRef = useRef(false);
  const isCheckoutWizardOpenRef = useRef(false);

  const syncFlowAction = useCallback(
    (action: WorkFlowAction | null) => {
      onFlowActionChange?.(action);
    },
    [onFlowActionChange]
  );

  const clearWorkFlowUrl = useCallback(() => {
    syncFlowAction(null);
    onEditClose?.();
  }, [syncFlowAction, onEditClose]);

  const hasCheckedIn = !!form.check_in_time;
  const hasActiveWorkSession = hasCheckedIn && !todaySubmissionComplete && !isEditing;
  const attendanceBlocked = attendanceGate != null && attendanceGate.allowed === false;
  /** Why: Rejected verification locks check-in/checkout; pending + verified stay open. */
  const verificationRejected =
    userRequiresOnboarding(currentUser) &&
    Number(currentUser?.onboarding_completed ?? 0) === 1 &&
    String(currentUser?.onboarding_verification_status || '').toLowerCase() === 'rejected';
  const attendanceActionsBlocked = attendanceBlocked || verificationRejected;
  const officeOnlyActive = Boolean(attendanceGate?.office_only);
  const allowWfhToday = Boolean(attendanceGate?.allow_wfh_today);
  /** Why: WFH choice only when Attendance exceptions grant it for today. */
  const canChooseWfh = allowWfhToday;
  const workModeLockedToOffice = !canChooseWfh;
  const wfhRequestStatus = String(attendanceGate?.wfh_request_status ?? 'none').toLowerCase();
  const canRequestWfh = Boolean(attendanceGate?.can_request_wfh);
  const wfhRequestPending = wfhRequestStatus === 'pending';
  const showRequestWfhAction = !canChooseWfh && (canRequestWfh || wfhRequestPending);
  /** Why: When Office geo fails, always offer an admin WFH request escape hatch. */
  const showGeoAdminWfhRequest =
    !canChooseWfh &&
    wfhRequestStatus !== 'approved' &&
    (canRequestWfh || showRequestWfhAction || workModeLockedToOffice);
  const forgiveLateToday = Boolean(attendanceGate?.forgive_late_today);
  const lateCount = attendanceGate?.late_count ?? 0;
  const lateLimit = attendanceGate?.late_limit ?? 3;
  const isSundayHoliday = Boolean(attendanceGate?.is_sunday);
  const upcomingOfficeWeek = attendanceGate?.upcoming_office_only_week ?? null;
  const checkInCutoffEnabled = attendanceGate?.checkin_cutoff_enabled !== false;
  const checkInCutoffLabel =
    attendanceGate?.checkin_cutoff_label ||
    formatCheckInCutoffLabel(attendanceGate?.checkin_cutoff);
  const officeGeoConfig = useMemo(
    () =>
      resolveOfficeConfig({
        lat: attendanceGate?.office_lat,
        lng: attendanceGate?.office_lng,
        radiusM: attendanceGate?.office_radius_m,
        label: attendanceGate?.office_label,
      }),
    [
      attendanceGate?.office_lat,
      attendanceGate?.office_lng,
      attendanceGate?.office_radius_m,
      attendanceGate?.office_label,
    ]
  );
  const officeGeoVerified = workMode === 'office' && officeGeoStatus === 'ok' && !!officePosition;
  const checkInLocationReady =
    !!workMode && (workMode === 'wfh' || officeGeoVerified) && officeGeoStatus !== 'checking';
  const checkInPlanReady = selectedProjects.length > 0 || !!plannedWork.trim();
  const canConfirmCheckIn = !verificationRejected && checkInLocationReady && checkInPlanReady;

  const clearOfficeGeoState = useCallback(() => {
    setOfficeGeoStatus('idle');
    setOfficeGeoMessage(null);
    setOfficeGeoErrorCode(null);
    setOfficeGeoPermission('unknown');
    setOfficePosition(null);
    setLocationHelpPreset('auto');
  }, []);

  const verifyOfficeLocation = useCallback(async () => {
    setOfficeGeoStatus('checking');
    setOfficePosition(null);
    setOfficeGeoErrorCode(null);

    const permission = await queryGeolocationPermission();
    setOfficeGeoPermission(permission);
    if (permission === 'denied') {
      setOfficeGeoMessage(
        'Location is blocked for this site. Use the device steps below, then tap “I’ve allowed location”.'
      );
    } else if (permission === 'prompt') {
      setOfficeGeoMessage('Waiting for location access… Choose Allow when your browser asks.');
    } else {
      setOfficeGeoMessage('Checking your distance from the office…');
    }

    try {
      const pos = await getCheckInPosition(officeGeoConfig);
      setOfficePosition(pos);
      setOfficeGeoStatus('ok');
      setOfficeGeoErrorCode(null);
      setOfficeGeoPermission('granted');
      setOfficeGeoMessage(
        `Verified near ${officeGeoConfig.label} (~${Math.round(pos.distanceM)} m)`
      );
      return pos;
    } catch (e) {
      const code = e instanceof OfficeLocationError ? e.code : 'unavailable';
      const msg =
        e instanceof OfficeLocationError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not verify office location.';
      setOfficePosition(null);
      setOfficeGeoStatus('error');
      setOfficeGeoErrorCode(code);
      if (code === 'denied') {
        setOfficeGeoPermission('denied');
      } else if (permission === 'granted' || code === 'out_of_range') {
        setOfficeGeoPermission('granted');
      }
      setOfficeGeoMessage(msg);
      throw e instanceof Error ? e : new Error(msg);
    }
  }, [officeGeoConfig]);

  /** Why: Retry must re-trigger geolocation from a user click so the browser can show Allow. */
  const retryOfficeLocation = useCallback(async () => {
    try {
      await verifyOfficeLocation();
    } catch {
      // status/message already set by verifyOfficeLocation
    }
  }, [verifyOfficeLocation]);

  /** Why: After user unlocks Location in OS/browser settings, auto-retry when PermissionStatus flips. */
  useEffect(() => {
    if (workMode !== 'office') return;
    if (officeGeoStatus !== 'error') return;
    if (officeGeoErrorCode !== 'denied' && officeGeoPermission !== 'denied') return;

    return watchGeolocationPermission((state) => {
      setOfficeGeoPermission(state);
      if (state === 'granted' || state === 'prompt') {
        void retryOfficeLocation();
      }
    });
  }, [
    workMode,
    officeGeoStatus,
    officeGeoErrorCode,
    officeGeoPermission,
    retryOfficeLocation,
  ]);

  const locationDenied =
    officeGeoErrorCode === 'denied' || officeGeoPermission === 'denied';

  const officeLocationAction = useMemo(() => {
    if (officeGeoErrorCode === 'out_of_range' || officeGeoPermission === 'granted') {
      return {
        label: 'Check location again',
        icon: RefreshCw,
        hint: null as string | null,
      };
    }
    if (locationDenied) {
      return {
        label: 'I’ve allowed location',
        icon: CheckCircle2,
        hint: null as string | null,
      };
    }
    if (officeGeoErrorCode === 'timeout' || officeGeoErrorCode === 'unavailable') {
      return {
        label: 'Try again',
        icon: RefreshCw,
        hint: null as string | null,
      };
    }
    return {
      label: 'Share location',
      icon: LocateFixed,
      hint: null as string | null,
    };
  }, [officeGeoErrorCode, officeGeoPermission, locationDenied]);

  const selectWorkMode = useCallback(
    async (mode: WorkMode) => {
      if (mode === 'wfh') {
        if (!canChooseWfh) return;
        setWorkMode('wfh');
        clearOfficeGeoState();
        return;
      }
      setWorkMode('office');
      try {
        await verifyOfficeLocation();
      } catch {
        // status/message already set
      }
    },
    [canChooseWfh, clearOfficeGeoState, verifyOfficeLocation]
  );

  const openWfhRequestDialog = useCallback(() => {
    const existing = attendanceGate?.wfh_request?.user_note ?? '';
    setWfhRequestNote(
      existing ||
        (officeGeoStatus === 'error'
          ? 'Unable to check in at office location — requesting WFH for today.'
          : '')
    );
    setWfhRequestDialogOpen(true);
  }, [attendanceGate?.wfh_request?.user_note, officeGeoStatus]);

  const closeWfhRequestDialog = useCallback(() => {
    if (wfhRequestSubmitting) return;
    setWfhRequestDialogOpen(false);
    setWfhRequestNote('');
  }, [wfhRequestSubmitting]);

  const submitWfhRequest = useCallback(async () => {
    if (wfhRequestSubmitting) return;
    setWfhRequestSubmitting(true);

    const note = wfhRequestNote.trim().slice(0, 255) || undefined;

    // Why: Close immediately so "Sending…" never feels stuck while the API finishes.
    setWfhRequestDialogOpen(false);
    setWfhRequestNote('');
    setAttendanceGate((prev) =>
      prev
        ? {
            ...prev,
            wfh_request_status: 'pending',
            can_request_wfh: false,
            wfh_request: {
              ...(prev.wfh_request ?? {}),
              status: 'pending',
              user_note: note ?? prev.wfh_request?.user_note ?? null,
              request_date: serverToday,
            },
          }
        : prev
    );
    toast({
      title: 'WFH request sent',
      description: 'Waiting for admin approval.',
    });

    try {
      const result = await requestWfhForToday({
        date: serverToday,
        user_note: note,
      });
      const policy = result.policy as Record<string, unknown> | undefined;
      setAttendanceGate((prev) => {
        if (!prev) return prev;
        const fromPolicy =
          policy && typeof policy === 'object'
            ? {
                wfh_request_status: String(policy.wfh_request_status ?? 'pending'),
                can_request_wfh: Boolean(policy.can_request_wfh),
                allow_wfh_today: Boolean(policy.allow_wfh_today ?? prev.allow_wfh_today),
              }
            : {
                wfh_request_status: 'pending' as const,
                can_request_wfh: false,
              };
        return {
          ...prev,
          ...fromPolicy,
          wfh_request: result.request
            ? {
                id: result.request.id,
                status: result.request.status,
                user_note: result.request.user_note,
                request_date: result.request.request_date,
              }
            : prev.wfh_request,
        };
      });
    } catch (e) {
      setAttendanceGate((prev) =>
        prev
          ? {
              ...prev,
              wfh_request_status: prev.wfh_request?.status === 'pending' ? 'none' : prev.wfh_request_status,
              can_request_wfh: true,
            }
          : prev
      );
      toast({
        title: 'Could not request WFH',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setWfhRequestSubmitting(false);
    }
  }, [wfhRequestSubmitting, serverToday, wfhRequestNote]);


  useEffect(() => {
    if (!currentUser?.id) {
      setAttendanceGate(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const date = serverToday || todayYMD();
        const status = await getAttendanceStatus(String(currentUser.id), date);
        if (!cancelled) setAttendanceGate(status);
      } catch {
        if (!cancelled) setAttendanceGate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, serverToday]);

  useEffect(() => {
    if (todaySubmissionComplete && !isEditing) {
      onCheckInTimeChange?.(null);
      return;
    }
    onCheckInTimeChange?.(form.check_in_time ?? null);
  }, [form.check_in_time, onCheckInTimeChange, todaySubmissionComplete, isEditing]);

  const overtimeHours = useMemo(() => requestedExtraHours, [requestedExtraHours]);
  const regularHours = useMemo(() => Math.min(Number(form.hours_today), 8), [form.hours_today]);
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    const list = query
      ? projects.filter((project) => project.name.toLowerCase().includes(query))
      : [...projects];

    // Active first, then most open bugs, then most approved updates, then name.
    const statusRank = (status?: string | null) => {
      const s = String(status || 'active').toLowerCase();
      if (s === 'active' || s === '') return 0;
      if (s === 'release_ready') return 1;
      if (s === 'completed') return 2;
      return 3;
    };

    return [...list].sort((a, b) => {
      const rankDiff = statusRank(a.status) - statusRank(b.status);
      if (rankDiff !== 0) return rankDiff;

      const aBugs = projectStats[a.id]?.bugs ?? 0;
      const bBugs = projectStats[b.id]?.bugs ?? 0;
      if (bBugs !== aBugs) return bBugs - aBugs;

      const aUpdates = projectStats[a.id]?.updates ?? 0;
      const bUpdates = projectStats[b.id]?.updates ?? 0;
      if (bUpdates !== aUpdates) return bUpdates - aUpdates;

      return a.name.localeCompare(b.name);
    });
  }, [projects, projectSearch, projectStats]);

  const checkoutProjects = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const orderedIds: string[] = [];
    // Planned (check-in) projects first
    selectedProjects.forEach((id) => {
      if (byId.has(id) && !orderedIds.includes(id)) orderedIds.push(id);
    });
    // Explicitly added unplanned assigned projects
    extraCheckoutProjectIds.forEach((id) => {
      if (byId.has(id) && !orderedIds.includes(id)) orderedIds.push(id);
    });
    // Keep projects that already have allocated hours / notes from a saved row
    Object.values(projectUpdates).forEach((u) => {
      if (!u?.project_id || orderedIds.includes(u.project_id)) return;
      if (!byId.has(u.project_id)) return;
      if ((Number(u.hours) || 0) > 0 || (u.notes || '').trim() || (Number(u.progress_percentage) || 0) > 0) {
        orderedIds.push(u.project_id);
      }
    });
    return orderedIds.map((id) => byId.get(id)).filter(Boolean) as Project[];
  }, [projects, selectedProjects, extraCheckoutProjectIds, projectUpdates]);

  const assignableCheckoutProjects = useMemo(() => {
    const shown = new Set(checkoutProjects.map((p) => p.id));
    return [...projects]
      .filter((p) => !shown.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, checkoutProjects]);

  const addUnplannedCheckoutProject = useCallback((projectId: string) => {
    if (!projectId) return;
    setExtraCheckoutProjectIds((prev) =>
      prev.includes(projectId) ? prev : [...prev, projectId]
    );
    setProjectUpdates((prev) => {
      if (prev[projectId]) return prev;
      return {
        ...prev,
        [projectId]: {
          project_id: projectId,
          status: 'in_progress',
          progress_percentage: 0,
          notes: '',
          hours: 0,
        },
      };
    });
  }, []);

  const removeUnplannedCheckoutProject = useCallback((projectId: string) => {
    setExtraCheckoutProjectIds((prev) => prev.filter((id) => id !== projectId));
    setProjectUpdates((prev) => {
      if (!prev[projectId]) return prev;
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
  }, []);

  const updateProjectUpdate = useCallback((projectId: string, patch: Partial<ProjectWorkUpdate>) => {
    setProjectUpdates((prev) => {
      const current = prev[projectId] || {
        project_id: projectId,
        status: 'in_progress' as const,
        progress_percentage: 0,
        notes: '',
        hours: 0,
      };
      const next = { ...current, ...patch, project_id: projectId };
      if (patch.status === 'completed') {
        next.progress_percentage = Math.max(next.progress_percentage, 100);
      }
      return { ...prev, [projectId]: next };
    });
  }, []);

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
      const selectedSet = new Set(selectedProjects);
      // Why: Sort needs open-bug / approved-update counts for the full list, not only the first chunk.
      const prioritized = projectList.filter((p) => selectedSet.has(p.id));
      const remainder = projectList.filter((p) => !selectedSet.has(p.id));
      const targetProjects = [...prioritized, ...remainder];

      if (projectStatsCacheRef.current.version !== PROJECT_STATS_CACHE_VERSION) {
        projectStatsCacheRef.current = {
          version: PROJECT_STATS_CACHE_VERSION,
          entries: {},
        };
      }
      const cacheEntries = projectStatsCacheRef.current.entries;

      const statResults = await mapWithConcurrency(targetProjects, 4, async (project) => {
        if (cacheEntries[project.id]) {
          return {
            projectId: project.id,
            bugs: cacheEntries[project.id].bugs,
            updates: cacheEntries[project.id].updates,
          };
        }
        try {
          const [bugResponse, updates] = await Promise.all([
            bugService.getBugs({
              projectId: project.id,
              page: 1,
              limit: 1,
              status: 'pending,in_progress',
            }),
            updateService.getUpdatesByProject(project.id),
          ]);
          const approvedUpdates = Array.isArray(updates)
            ? updates.filter((u) => String(u.status || '').toLowerCase() === 'approved').length
            : 0;
          return {
            projectId: project.id,
            bugs: Number(bugResponse?.pagination?.totalBugs ?? bugResponse?.bugs?.length ?? 0),
            updates: approvedUpdates,
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
      projectStatsCacheRef.current = {
        version: PROJECT_STATS_CACHE_VERSION,
        entries: { ...cacheEntries, ...nextStats },
      };
      setProjectStats((prev) => ({ ...prev, ...nextStats }));
    } finally {
      setLoadingProjectStats(false);
    }
  }, [selectedProjects]);

  const canSubmit = useMemo(() => {
    const hasDate = !!form.submission_date;
    const hrs = Number(form.hours_today);
    const hasHours = hrs >= 1 && hrs <= 8;
    const overtimeRequestValid = !requestAdminApproval
      ? true
      : requestedExtraHours > 0 && requestedExtraHours <= 16 && approvalReason.trim().length > 0;
    const allocationOk = checkoutHoursAllocationOk(
      hrs,
      timeAllocation,
      projectUpdates,
      checkoutProjects.map((p) => p.id)
    );

    // Why: Checkout must not require tasks or Office/WFH — those apply at check-in only.
    return hasDate && hasHours && overtimeRequestValid && allocationOk;
  }, [
    form,
    requestAdminApproval,
    requestedExtraHours,
    approvalReason,
    timeAllocation,
    projectUpdates,
    checkoutProjects,
  ]);

  /** Why: Mirrors canSubmit so the footer can say exactly what blocks checkout. */
  const checkoutMissing = useMemo(() => {
    const missing: string[] = [];
    const hrs = Number(form.hours_today);
    if (!form.submission_date) missing.push('work date');
    if (!(hrs >= 1 && hrs <= 8)) missing.push('hours worked (1–8)');
    if (requestAdminApproval) {
      if (!(requestedExtraHours > 0 && requestedExtraHours <= 16)) missing.push('extra hours');
      if (!approvalReason.trim()) missing.push('approval reason');
    }
    if (
      hrs >= 1 &&
      !checkoutHoursAllocationOk(hrs, timeAllocation, projectUpdates, checkoutProjects.map((p) => p.id))
    ) {
      missing.push('hour allocation');
    }
    return missing;
  }, [
    form.submission_date,
    form.hours_today,
    requestAdminApproval,
    requestedExtraHours,
    approvalReason,
    timeAllocation,
    projectUpdates,
    checkoutProjects,
  ]);

  const taskCounts = useMemo(() => {
    const completed = countTaskLines(form.completed_tasks);
    const pending = countTaskLines(form.pending_tasks);
    const ongoing = countTaskLines(form.ongoing_tasks);
    const upcoming = countTaskLines(form.notes);
    return {
      completed,
      pending,
      ongoing,
      upcoming,
      total: completed + pending + ongoing + upcoming,
    };
  }, [form.completed_tasks, form.pending_tasks, form.ongoing_tasks, form.notes]);

  function countItems(text?: string) {
    return countTaskLines(text);
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
      void notifyWorkActivity({
        action: 'break_start',
        submission_date: form.submission_date,
        started_at: to12hTime(now),
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
    void notifyWorkActivity({
      action: 'break_end',
      submission_date: form.submission_date,
      started_at: to12hTime(startedAt),
      duration_minutes: durationMins,
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

  // Load submissions for the selected calendar month (for live totals in preview)
  useEffect(() => {
    if (!form.submission_date) {
      setMonthSubmissions([]);
      return;
    }
    let cancelled = false;
    const { from, to } = getCalendarMonthPeriod(calendarMonthKey(form.submission_date));
    (async () => {
      try {
        const res = await listMySubmissions({ from, to });
        const items: any[] = res && (res as any).data ? (res as any).data : Array.isArray(res) ? res : [];
        if (!cancelled) setMonthSubmissions(items);
      } catch {
        if (!cancelled) setMonthSubmissions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.submission_date]);

  async function onSubmit(options?: { openPreviewAfter?: boolean }) {
    if (loading) return;
    try {
      if (verificationRejected) {
        toast({
          title: 'Checkout blocked',
          description:
            'Your onboarding verification was rejected. Fix the issues on Profile, then wait for HR to re-verify.',
          variant: 'destructive',
        });
        return;
      }
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

      const allocationOk = checkoutHoursAllocationOk(
        hoursNum,
        timeAllocation,
        projectUpdates,
        checkoutProjects.map((p) => p.id)
      );
      if (!allocationOk) {
        throw new Error(
          `Hours must tally to ${formatHoursShort(hoursNum)}h (lunch, breaks, Growth Glimpse, projects, and other).`
        );
      }

      // Tasks / project notes are optional at checkout (Office/WFH is check-in only).

      toast({
        title: isEditing ? 'Updating...' : 'Checking out...',
        description: 'Processing your submission'
      });

      await assertDeviceClockMatchesServer(isEditing ? 'update this submission' : 'check out');

      const noteParts: string[] = [];
      if (requestAdminApproval) {
        noteParts.push(
          `\n[OVERTIME APPROVAL REQUEST]\nRequested Extra Hours: ${requestedExtraHours}\nReason: ${approvalReason.trim()}`
        );
      }

      const cleanedNotes = parseBreakLinesFromNotes(form.notes || '').cleanNotes;
      // Always send check-in explicitly so WhatsApp/email can show it even if DB value is missing.
      let checkInForPayload: string | undefined = form.check_in_time || undefined;
      let startTimeForPayload: string | undefined = form.start_time || undefined;
      if (checkInForPayload && !startTimeForPayload) {
        try {
          const d = new Date(checkInForPayload);
          if (!Number.isNaN(d.getTime())) {
            startTimeForPayload = d.toTimeString().slice(0, 8);
          }
        } catch {
          /* keep undefined */
        }
      }
      const payload: any = {
        ...form,
        check_in_time: checkInForPayload,
        start_time: startTimeForPayload,
        notes: `${cleanedNotes}${noteParts.join('\n')}`.trim(),
        requested_extra_hours: requestAdminApproval ? requestedExtraHours : 0,
        approval_reason: requestAdminApproval ? approvalReason.trim() : '',
        break_entries: breakEntries,
        total_break_minutes: getBreakMinutes(breakEntries),
        planned_projects: selectedProjects.length > 0 ? selectedProjects : undefined,
        planned_work: plannedWork.trim() || undefined,
        planned_work_status: form.planned_work_status,
        planned_work_notes: form.planned_work_notes || undefined,
        project_updates: projectUpdatesToPayload(projectUpdates),
        time_allocation: {
          lunch_hours: timeAllocation.lunch_hours,
          break_hours: timeAllocation.break_hours,
          growth_glimpse_hours: timeAllocation.growth_glimpse_hours,
          other_hours: timeAllocation.other_hours,
          lunch_attended: timeAllocation.lunch_attended,
          breaks_attended: timeAllocation.breaks_attended,
          growth_glimpse_attended: timeAllocation.growth_glimpse_attended,
        },
      };

      const res = await submitWork(payload);
      if ((res as any)?.success === false) throw new Error((res as any)?.message || 'Failed');

      setSelectedProjects([]);
      setExtraCheckoutProjectIds([]);
      setPlannedWork('');

      if (currentUser?.id && form.submission_date) {
        clearDailyWorkDraft(currentUser.id, form.submission_date);
      }

      setTodaySubmissionComplete(true);
      setIsOnBreak(false);
      setBreakStartedAt(null);

      if (options?.openPreviewAfter) {
        setCheckoutWizardStep('preview');
        setIsCheckoutWizardOpen(true);
        toast({
          title: isEditing ? 'Submission updated' : 'Checked out successfully',
          description: 'A receipt is on its way to your email, WhatsApp and notifications.',
        });
        return;
      }

      toast({
        title: isEditing ? 'Daily submission updated' : 'Daily submission saved',
        description: 'A receipt is on its way to your email, WhatsApp and notifications.',
      });

      if (isEmbedded) {
        onSaved?.();
      } else {
        navigate(`/${currentUser?.role}/daily-update`);
      }
    } catch (e: any) {
      setError(extractApiErrorMessage(e, 'Failed to submit'));
      toast(attendanceErrorToast('Checkout blocked', e));
    } finally {
      setLoading(false);
    }
  }

  async function onCopyPreview() {
    const text = template || '';
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Please copy the preview manually',
        variant: 'destructive',
      });
    }
  }

  function openCheckInDialog() {
    if (verificationRejected) {
      toast({
        title: 'Check-in blocked',
        description:
          'Your onboarding verification was rejected. Fix the issues on Profile, then wait for HR to re-verify.',
        variant: 'destructive',
      });
      return;
    }
    if (attendanceBlocked) {
      toast({
        title: 'Check-in unavailable',
        description: attendanceGate?.message || 'You cannot check in today.',
        variant: 'destructive',
      });
      return;
    }
    clearOfficeGeoState();
    if (workModeLockedToOffice) {
      void selectWorkMode('office');
    } else {
      setWorkMode(null);
    }
    syncFlowAction('checkin');
    setIsCheckInDialogOpen(true);
  }

  function closeCheckInDialog() {
    setIsCheckInDialogOpen(false);
    setProjectSearch('');
    setWorkMode(null);
    clearOfficeGeoState();
    clearWorkFlowUrl();
  }

  function resetCheckoutFormDefaults() {
    setForm((prev) => ({
      ...prev,
      ...emptyCheckoutFormFields(),
    }));
    setRequestAdminApproval(false);
    setRequestedExtraHours(0);
    setApprovalReason('');
    setProjectUpdates((prev) => clearProjectUpdateNotes(prev));
    setExtraCheckoutProjectIds([]);
  }

  const handleWeeklyReportDirty = useCallback((dirty: boolean) => {
    setWeeklyReportDirty(dirty);
  }, []);

  const markWeeklyReportDone = useCallback(() => {
    weeklyReportSatisfiedRef.current = true;
    setWeeklyReportDirty(false);
    setCheckoutWizardStep('form');
  }, []);

  const skipWeeklyReportToCheckout = useCallback(() => {
    markWeeklyReportDone();
  }, [markWeeklyReportDone]);

  const handleWeeklyReportContinue = useCallback(() => {
    markWeeklyReportDone();
  }, [markWeeklyReportDone]);

  function confirmLeaveWeeklyReport(): boolean {
    if (checkoutWizardStep !== 'weekly_report' || !weeklyReportDirty) return true;
    return window.confirm('You have unsaved changes.');
  }

  function checkoutWorkDate(): string {
    if (isEditing) return form.submission_date || serverToday;
    return form.check_in_time ? form.submission_date : serverToday;
  }

  function saturdayNeedsWeeklyStep(workDate: string): boolean {
    return !isEditing && isSaturdayYmd(workDate) && !weeklyReportSatisfiedRef.current;
  }

  function openCheckoutWizard() {
    if (verificationRejected) {
      toast({
        title: 'Checkout blocked',
        description:
          'Your onboarding verification was rejected. Fix the issues on Profile, then wait for HR to re-verify.',
        variant: 'destructive',
      });
      return;
    }
    const flowKey = `checkout:${editId || ''}`;
    didAutoOpenFlowRef.current = flowKey;
    syncFlowAction('checkout');
    if (!isEditing) {
      resetCheckoutFormDefaults();
      setForm((prev) => ({
        ...prev,
        submission_date: prev.check_in_time ? prev.submission_date : serverToday,
      }));
    }
    const workDate = checkoutWorkDate();
    setWeeklyReportDirty(false);
    setCheckoutWizardStep(saturdayNeedsWeeklyStep(workDate) ? 'weekly_report' : 'form');
    isCheckoutWizardOpenRef.current = true;
    setIsCheckoutWizardOpen(true);
  }

  function dismissCheckoutWizard(): boolean {
    if (!confirmLeaveWeeklyReport()) return false;
    isCheckoutWizardOpenRef.current = false;
    setIsCheckoutWizardOpen(false);
    setCheckoutWizardStep('form');
    setWeeklyReportDirty(false);
    clearWorkFlowUrl();
    return true;
  }

  function closeCheckoutWizard() {
    if (!dismissCheckoutWizard()) return;
    if (isEmbedded) {
      onSaved?.();
    } else {
      navigate(`/${currentUser?.role}/daily-update`);
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
      if (verificationRejected) {
        toast({
          title: 'Check-in blocked',
          description:
            'Your onboarding verification was rejected. Fix the issues on Profile, then wait for HR to re-verify.',
          variant: 'destructive',
        });
        return;
      }
      if (!workMode) {
        toast({
          title: 'Select work location',
          description: 'Choose Office or WFH before checking in.',
          variant: 'destructive',
        });
        return;
      }
      if (!canChooseWfh && workMode === 'wfh') {
        toast({
          title: 'Office check-in only',
          description:
            'WFH is available only when an admin grants it under Attendance exceptions for today. Request WFH if you need approval.',
          variant: 'destructive',
        });
        return;
      }

      setIsCheckingIn(true);
      await assertDeviceClockMatchesServer('check in');

      let locationPayload: { latitude: number; longitude: number; accuracy?: number | null } | null = null;
      if (workMode === 'office') {
        const pos = officePosition && officeGeoStatus === 'ok'
          ? await getCheckInPosition(officeGeoConfig).catch(() => officePosition)
          : await verifyOfficeLocation();
        locationPayload = {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
        };
        setOfficePosition(pos);
        setOfficeGeoStatus('ok');
        setOfficeGeoMessage(`At ${officeGeoConfig.label} (~${Math.round(pos.distanceM)} m)`);
      }

      // Optimistic UI update - show success immediately for faster perceived performance
      const optimisticCheckInTime = new Date().toISOString();
      setForm((prev) => ({
        ...prev,
        check_in_time: optimisticCheckInTime,
      }));

      // Close dialog immediately for instant feedback
      setIsCheckInDialogOpen(false);
      syncFlowAction(null);

      toast({
        title: 'Checking in...',
        description: 'Processing your check-in',
      });

      // Make API call in background
      const result = await checkIn(
        serverToday,
        selectedProjects,
        plannedWork,
        form.planned_work_status || 'not_started',
        workMode,
        locationPayload
      );

      // Update with actual server time
      setForm((prev) => ({
        ...prev,
        check_in_time: result.check_in_time,
        submission_date: result.submission_date || serverToday,
      }));

      const checkInDate = new Date(result.check_in_time);
      const formattedTime = checkInDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });

      const modeLabel = result.work_mode === 'wfh' ? 'WFH' : 'Office';
      const distanceNote =
        typeof result.check_in_distance_m === 'number'
          ? ` · ~${Math.round(result.check_in_distance_m)} m from office`
          : '';
      if (result.restriction_created || result.warning) {
        toast({
          title: result.restriction_created ? 'Office-only week scheduled' : 'Late check-in',
          description: result.warning || `Checked in at ${formattedTime} (${modeLabel})`,
          variant: result.restriction_created || result.is_late ? 'destructive' : 'default',
        });
      } else {
        toast({
          title: 'Checked in',
          description: `${modeLabel} · ${formattedTime}${result.is_sunday ? ' · Sunday holiday' : ''}${distanceNote}`,
        });
      }

      // Refresh attendance gate (late count / office-only)
      if (currentUser?.id) {
        try {
          const status = await getAttendanceStatus(String(currentUser.id), result.submission_date || serverToday);
          setAttendanceGate(status);
        } catch {
          // non-fatal
        }
      }

      setWorkMode(null);
      clearOfficeGeoState();
      onSaved?.();
    } catch (e) {
      // Revert optimistic update on error
      setForm((prev) => ({
        ...prev,
        check_in_time: undefined,
      }));
      setIsCheckInDialogOpen(true);
      toast(attendanceErrorToast('Check-in blocked', e));
    } finally {
      setIsCheckingIn(false);
    }
  }, [
    workMode,
    canChooseWfh,
    attendanceGate,
    officePosition,
    officeGeoStatus,
    officeGeoConfig,
    verifyOfficeLocation,
    clearOfficeGeoState,
    serverToday,
    selectedProjects,
    plannedWork,
    form.planned_work_status,
    syncFlowAction,
    currentUser?.id,
    onSaved,
    verificationRejected,
  ]);

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

    // Compute totals for current calendar month up to selected date
    const subsForTotals = monthSubmissions.map((s) => ({ ...s }));
    const existingIdx = subsForTotals.findIndex(
      (s) => String(s.submission_date) === String(form.submission_date)
    );
    if (existingIdx >= 0) {
      subsForTotals[existingIdx] = {
        ...subsForTotals[existingIdx],
        hours_today: form.hours_today,
      };
    } else if (form.submission_date) {
      subsForTotals.push({
        submission_date: form.submission_date,
        hours_today: form.hours_today,
      });
    }
    const monthTotals = computeMonthTotalsToDate(subsForTotals, form.submission_date);
    header += `\n📊 Total Working Days (${monthTotals.periodLabel}): ${monthTotals.days} ${monthTotals.days === 1 ? 'Day' : 'Days'}`;
    header += `\n🧮 Total Hours Completed : ${monthTotals.hours} hours`;

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

    const projectUpdatePayload = projectUpdatesToPayload(projectUpdates).map((u) => ({
      ...u,
      project_name: projects.find((p) => p.id === u.project_id)?.name,
    }));
    const projectUpdatesText = formatProjectUpdatesForText(projectUpdatePayload);
    if (projectUpdatesText) {
      sec.push(`📂 Project Progress\n\n${projectUpdatesText}`);
    }

    const allocLines = [
      timeAllocation.lunch_attended
        ? `Lunch: ${formatHoursShort(timeAllocation.lunch_hours)}h`
        : 'Lunch: Skipped',
      timeAllocation.breaks_attended
        ? `Breaks: ${formatHoursShort(timeAllocation.break_hours)}h`
        : 'Breaks: Skipped',
    ];
    const glimpseDay = isGrowthGlimpseDay(form.submission_date || todayYMD());
    if (glimpseDay) {
      allocLines.push(
        timeAllocation.growth_glimpse_attended
          ? `Growth Glimpse: ${formatHoursShort(timeAllocation.growth_glimpse_hours)}h`
          : 'Growth Glimpse: Skipped'
      );
    }
    if (timeAllocation.other_hours > 0) {
      allocLines.push(`Other: ${formatHoursShort(timeAllocation.other_hours)}h`);
    }
    sec.push(`⏱ Time allocation\n\n${allocLines.join('\n')}`);

    const text = sec.length ? header + `\n\n` + sec.join(`\n\n`) : header;
    setTemplate(text);
  }, [form.submission_date, form.check_in_time, form.hours_today, form.completed_tasks, form.pending_tasks, form.ongoing_tasks, form.notes, form.planned_work_notes, form.planned_work_status, selectedProjects, plannedWork, projects, requestAdminApproval, requestedExtraHours, approvalReason, overtimeHours, regularHours, breakEntries, monthSubmissions, projectUpdates, timeAllocation]);

  // Load projects when check-in or checkout dialog opens (not on each project toggle)
  useEffect(() => {
    if (!isCheckInDialogOpen && !isCheckoutWizardOpen) return;

    let cancelled = false;
    (async () => {
      try {
        const now = Date.now();
        const cached = projectsCacheRef.current;
        if (cached && now - cached.at < 5 * 60 * 1000) {
          setProjects(cached.items);
          if (
            projectStatsCacheRef.current.version === PROJECT_STATS_CACHE_VERSION &&
            Object.keys(projectStatsCacheRef.current.entries).length > 0
          ) {
            setProjectStats(projectStatsCacheRef.current.entries);
          } else {
            // Non-blocking stats warmup
            void fetchProjectStats(cached.items);
          }
          return;
        }

        setLoadingProjects(true);
        const projectsData = await projectService.getProjects();
        if (cancelled) return;

        // Same visibility rules as Projects page "Assigned Projects":
        // - admin: all active projects
        // - developer/tester: membership via get_members.php (getAll may return more than assigned)
        const role = String(currentUser?.role || '').toLowerCase();
        const currentUserId = String(currentUser?.id || '').trim();
        const activeProjects = projectsData.filter(
          (p) => p.status === 'active' || !p.status
        );

        if (role === 'admin' || !currentUserId) {
          setProjects(activeProjects);
          projectsCacheRef.current = { at: Date.now(), items: activeProjects };
          // Non-blocking stats fetch for better perceived performance.
          void fetchProjectStats(activeProjects);
          return;
        }

        const token =
          sessionStorage.getItem('token') ||
          localStorage.getItem('auth_token') ||
          localStorage.getItem('token');

        // Prefer getAll members arrays when present (fast path).
        // Fall back to get_members.php for projects missing membership data
        // — same source of truth as Projects "Assigned Projects".
        const needsMembershipLookup: Project[] = [];
        const quickAssigned: Project[] = [];

        for (const project of activeProjects) {
          if (Array.isArray(project.members) && project.members.length > 0) {
            if (project.members.some((id) => String(id || '').trim() === currentUserId)) {
              quickAssigned.push(project);
            }
            continue;
          }
          if (Array.isArray(project.members_detail) && project.members_detail.length > 0) {
            if (
              project.members_detail.some(
                (m) => String(m.user_id || '').trim() === currentUserId
              )
            ) {
              quickAssigned.push(project);
            }
            continue;
          }
          needsMembershipLookup.push(project);
        }

        let assignedProjects = [...quickAssigned];

        if (needsMembershipLookup.length > 0 && token) {
          const membershipResults = await mapWithConcurrency(
            needsMembershipLookup,
            5,
            async (project) => {
              try {
                const response = await fetch(
                  `${ENV.API_URL}/projects/get_members.php?project_id=${project.id}`,
                  {
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                if (!response.ok) {
                  return { project, isMember: false };
                }
                const data = await response.json();
                const members: Array<{ id?: string | number }> = data?.data?.members || [];
                const isMember = members.some(
                  (member) => String(member.id || '').trim() === currentUserId
                );
                return { project, isMember };
              } catch {
                return { project, isMember: false };
              }
            }
          );

          assignedProjects = [
            ...assignedProjects,
            ...membershipResults.filter((result) => result.isMember).map((result) => result.project),
          ];
        }

        if (cancelled) return;
        setProjects(assignedProjects);
        projectsCacheRef.current = { at: Date.now(), items: assignedProjects };
        // Non-blocking stats fetch for better perceived performance.
        void fetchProjectStats(assignedProjects);
      } catch (error: any) {
        if (cancelled) return;
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
        if (!cancelled) setLoadingProjects(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCheckInDialogOpen, isCheckoutWizardOpen, fetchProjectStats, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!isCheckoutWizardOpen || checkoutProjects.length === 0) return;
    setProjectUpdates((prev) => {
      const next = { ...prev };
      checkoutProjects.forEach((project) => {
        if (!next[project.id]) {
          next[project.id] = {
            project_id: project.id,
            status: 'in_progress',
            progress_percentage: 0,
            notes: '',
            hours: 0,
          };
        } else if (typeof next[project.id].hours !== 'number') {
          next[project.id] = { ...next[project.id], hours: 0 };
        }
      });
      return next;
    });
  }, [isCheckoutWizardOpen, checkoutProjects]);

  // Keep fixed lunch/breaks/glimpse in sync when the work date changes (preserve attendance + other)
  useEffect(() => {
    const date = form.submission_date || todayYMD();
    setTimeAllocation((prev) =>
      defaultTimeAllocation(date, prev.other_hours || 0, {
        lunch_attended: prev.lunch_attended,
        breaks_attended: prev.breaks_attended,
        growth_glimpse_attended: prev.growth_glimpse_attended,
      })
    );
  }, [form.submission_date]);

  useEffect(() => {
    if ((!isCheckInDialogOpen && !isCheckoutWizardOpen) || projects.length === 0) return;
    // Refresh focused stats for newly selected projects without blocking dialog open.
    void fetchProjectStats(projects);
  }, [selectedProjects, isCheckInDialogOpen, isCheckoutWizardOpen, projects, fetchProjectStats]);

  // Load server row + merge local draft so preview survives refresh (non-editing mode)
  useEffect(() => {
    if (isEditing || !currentUser?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const userId = currentUser.id;
        const queryAnchor = todayYMD();
        const { from, to } = getCalendarMonthPeriod(calendarMonthKey(queryAnchor));
        const submissionsRes = await listMySubmissions({ from, to });
        const { submissions, serverToday: serverTodayFromApi } =
          parseSubmissionsListResponse(submissionsRes);
        const resolvedServerToday = serverTodayFromApi || queryAnchor;
        if (!cancelled) {
          setServerToday(resolvedServerToday);
        }

        // Why: Only today's incomplete check-in is an open session. Other month days
        // (or deleted DB rows with leftover local drafts) must not force Checkout.
        const todayRow = submissions.find(
          (s) => String(s.submission_date) === String(resolvedServerToday)
        );
        const hasOpenServerSession = Boolean(
          todayRow?.check_in_time && !isWorkSubmissionRowComplete(todayRow)
        );
        const attendanceDate = resolvedServerToday;
        const existingSubmission = todayRow;

        let draft: DailyWorkDraftStored | null = null;
        try {
          const raw = localStorage.getItem(
            dailyWorkDraftStorageKey(userId, attendanceDate)
          );
          if (raw) {
            const parsed = JSON.parse(raw) as DailyWorkDraftStored;
            if (
              parsed &&
              parsed.v === DAILY_WORK_DRAFT_VERSION &&
              parsed.submission_date === attendanceDate
            ) {
              draft = parsed;
            }
          }
        } catch {
          draft = null;
        }

        // Why: After admin deletes check-in rows, drafts can still claim check_in_time.
        if (!hasOpenServerSession) {
          stripPhantomCheckInDrafts(userId);
          if (draft?.form?.check_in_time) {
            draft = {
              ...draft,
              form: { ...draft.form, check_in_time: undefined },
              isOnBreak: false,
              breakStartedAtIso: null,
            };
          }
        }

        if (cancelled) return;

        if (!cancelled) {
          setForm((prev) => ({
            ...prev,
            submission_date: attendanceDate,
          }));
        }

        if (existingSubmission && isWorkSubmissionRowComplete(existingSubmission)) {
          const parsedOvertime = parseOvertimeRequestFromNotes(
            existingSubmission.notes || ''
          );
          const parsedBreaks = parseBreakLinesFromNotes(parsedOvertime.cleanNotes || '');
          const requestedFromRow = Number(
            existingSubmission.requested_extra_hours ??
              existingSubmission.requestedExtraHours ??
              0
          );
          const reasonFromRow = String(
            existingSubmission.approval_reason ??
              existingSubmission.approvalReason ??
              ''
          ).trim();
          const resolvedRequested =
            requestedFromRow > 0
              ? requestedFromRow
              : Number(parsedOvertime.requestedFromBlock || 0);
          const resolvedReason = reasonFromRow || parsedOvertime.reasonFromBlock;
          const hasApprovalRequest =
            resolvedRequested > 0 || resolvedReason.length > 0;

          setForm({
            submission_date: existingSubmission.submission_date,
            check_in_time: existingSubmission.check_in_time || undefined,
            hours_today: Number(existingSubmission.hours_today) || 8,
            overtime_hours: existingSubmission.overtime_hours || 0,
            completed_tasks: existingSubmission.completed_tasks || '',
            pending_tasks: existingSubmission.pending_tasks || '',
            ongoing_tasks: existingSubmission.ongoing_tasks || '',
            notes: parsedBreaks.cleanNotes || '',
            planned_work_status:
              (existingSubmission.planned_work_status as StatusOption) ||
              'not_started',
            planned_work_notes: existingSubmission.planned_work_notes || '',
          });
          setRequestAdminApproval(hasApprovalRequest);
          setRequestedExtraHours(hasApprovalRequest ? resolvedRequested : 0);
          setApprovalReason(hasApprovalRequest ? resolvedReason : '');
          const breaksFromRow = breakEntriesFromSubmissionRow(existingSubmission);
          setBreakEntries(
            breaksFromRow.length > 0 ? breaksFromRow : parsedBreaks.breakLines
          );
          setPlannedWork(existingSubmission.planned_work || '');
          {
            const planned = parsePlannedProjectsFromRow(existingSubmission);
            const updatesMap = projectUpdatesMapFromRow(existingSubmission);
            setSelectedProjects(planned);
            setProjectUpdates(updatesMap);
            setExtraCheckoutProjectIds(extraProjectIdsFromUpdates(updatesMap, planned));
          }
          setTimeAllocation(
            parseTimeAllocationFromRow(
              existingSubmission.time_allocation,
              attendanceDate
            )
          );
          clearDailyWorkDraft(userId, attendanceDate);
          setIsOnBreak(false);
          setBreakStartedAt(null);
          setTodaySubmissionComplete(true);
        } else if (existingSubmission) {
          const parsedBreaks = parseBreakLinesFromNotes(
            existingSubmission.notes || ''
          );
          const breaksFromRow = breakEntriesFromSubmissionRow(existingSubmission);
          const serverBreaks =
            breaksFromRow.length > 0 ? breaksFromRow : parsedBreaks.breakLines;
          const serverPlannedProjects =
            parsePlannedProjectsFromRow(existingSubmission);
          const serverPlannedWork = existingSubmission.planned_work || '';

          if (draft) {
            setForm((prev) => ({
              ...prev,
              submission_date: attendanceDate,
              // Prefer server check-in; never invent a session from draft alone.
              check_in_time: hasOpenServerSession
                ? existingSubmission.check_in_time || undefined
                : undefined,
              hours_today: draft.form.hours_today ?? prev.hours_today,
              planned_work_status:
                draft.form.planned_work_status ?? prev.planned_work_status,
              ...emptyCheckoutFormFields(),
            }));
            setBreakEntries(
              draft.breakEntries?.length ? draft.breakEntries : serverBreaks
            );
            setSelectedProjects(
              draft.selectedProjects?.length
                ? draft.selectedProjects
                : serverPlannedProjects
            );
            setPlannedWork(
              draft.plannedWork?.trim()
                ? draft.plannedWork
                : serverPlannedWork
            );
            setRequestAdminApproval(false);
            setRequestedExtraHours(0);
            setApprovalReason('');
            const baseProjectUpdates =
              draft.projectUpdates && Object.keys(draft.projectUpdates).length > 0
                ? draft.projectUpdates
                : projectUpdatesMapFromRow(existingSubmission);
            setProjectUpdates(clearProjectUpdateNotes(baseProjectUpdates));
            setExtraCheckoutProjectIds(
              extraProjectIdsFromUpdates(
                baseProjectUpdates,
                draft.selectedProjects?.length
                  ? draft.selectedProjects
                  : serverPlannedProjects
              )
            );
            setTimeAllocation(
              draft.timeAllocation
                ? defaultTimeAllocation(attendanceDate, draft.timeAllocation.other_hours || 0, {
                    lunch_attended: draft.timeAllocation.lunch_attended,
                    breaks_attended: draft.timeAllocation.breaks_attended,
                    growth_glimpse_attended: draft.timeAllocation.growth_glimpse_attended,
                  })
                : parseTimeAllocationFromRow(
                    existingSubmission.time_allocation,
                    attendanceDate
                  )
            );
            if (
              hasOpenServerSession &&
              draft.isOnBreak &&
              draft.breakStartedAtIso
            ) {
              setIsOnBreak(true);
              setBreakStartedAt(new Date(draft.breakStartedAtIso));
            } else {
              setIsOnBreak(false);
              setBreakStartedAt(null);
            }
            setTodaySubmissionComplete(false);
          } else {
            setForm((prev) => ({
              ...prev,
              check_in_time: hasOpenServerSession
                ? existingSubmission.check_in_time || undefined
                : undefined,
              ...emptyCheckoutFormFields(),
            }));
            setBreakEntries(serverBreaks);
            if (serverPlannedProjects.length > 0) {
              setSelectedProjects(serverPlannedProjects);
            } else {
              setSelectedProjects([]);
            }
            if (serverPlannedWork) {
              setPlannedWork(serverPlannedWork);
            } else {
              setPlannedWork('');
            }
            setProjectUpdates(clearProjectUpdateNotes(projectUpdatesMapFromRow(existingSubmission)));
            setExtraCheckoutProjectIds(
              extraProjectIdsFromUpdates(
                projectUpdatesMapFromRow(existingSubmission),
                serverPlannedProjects
              )
            );
            setTimeAllocation(
              parseTimeAllocationFromRow(
                existingSubmission.time_allocation,
                attendanceDate
              )
            );
            setRequestAdminApproval(false);
            setRequestedExtraHours(0);
            setApprovalReason('');
            setIsOnBreak(false);
            setBreakStartedAt(null);
            setTodaySubmissionComplete(false);
          }
        } else if (draft) {
          setForm((prev) => ({
            ...prev,
            submission_date: attendanceDate,
            // No server row for today — never restore a phantom check-in from draft.
            check_in_time: undefined,
            hours_today: draft.form.hours_today ?? prev.hours_today,
            planned_work_status:
              draft.form.planned_work_status ?? prev.planned_work_status,
            ...emptyCheckoutFormFields(),
          }));
          setBreakEntries(draft.breakEntries || []);
          setSelectedProjects(draft.selectedProjects || []);
          setPlannedWork(draft.plannedWork || '');
          setRequestAdminApproval(false);
          setRequestedExtraHours(0);
          setApprovalReason('');
          setProjectUpdates(clearProjectUpdateNotes(draft.projectUpdates || {}));
          setExtraCheckoutProjectIds(
            extraProjectIdsFromUpdates(
              draft.projectUpdates || {},
              draft.selectedProjects || []
            )
          );
          setTimeAllocation(
            draft.timeAllocation
              ? defaultTimeAllocation(attendanceDate, draft.timeAllocation.other_hours || 0, {
                  lunch_attended: draft.timeAllocation.lunch_attended,
                  breaks_attended: draft.timeAllocation.breaks_attended,
                  growth_glimpse_attended: draft.timeAllocation.growth_glimpse_attended,
                })
              : defaultTimeAllocation(attendanceDate, 0)
          );
          setIsOnBreak(false);
          setBreakStartedAt(null);
          setTodaySubmissionComplete(false);
        } else {
          setForm((prev) => ({
            ...prev,
            submission_date: attendanceDate,
            check_in_time: undefined,
          }));
          setSelectedProjects([]);
          setExtraCheckoutProjectIds([]);
          setPlannedWork('');
          setBreakEntries([]);
          setProjectUpdates({});
          setTimeAllocation(defaultTimeAllocation(attendanceDate, 0));
          setIsOnBreak(false);
          setBreakStartedAt(null);
          setTodaySubmissionComplete(false);
        }
      } catch (error) {
        console.error('Failed to load check-in data for date:', error);
      } finally {
        if (!cancelled) {
          setDraftHydrationEpoch((e) => e + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditing, currentUser?.id]);

  useEffect(() => {
    if (isEditing || !currentUser?.id || draftHydrationEpoch === 0) return;

    const userId = currentUser.id;
    const date = form.submission_date;
    const payload: DailyWorkDraftStored = {
      v: DAILY_WORK_DRAFT_VERSION,
      savedAt: Date.now(),
      submission_date: date,
      form: { ...form },
      breakEntries,
      selectedProjects,
      plannedWork,
      requestAdminApproval,
      requestedExtraHours,
      approvalReason,
      isOnBreak,
      breakStartedAtIso: breakStartedAt ? breakStartedAt.toISOString() : null,
      projectUpdates,
      timeAllocation,
    };

    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          dailyWorkDraftStorageKey(userId, date),
          JSON.stringify(payload)
        );
      } catch {
        /* quota / private mode */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [
    isEditing,
    currentUser?.id,
    draftHydrationEpoch,
    form,
    breakEntries,
    selectedProjects,
    plannedWork,
    requestAdminApproval,
    requestedExtraHours,
    approvalReason,
    isOnBreak,
    breakStartedAt,
    projectUpdates,
    timeAllocation,
    form.submission_date,
  ]);

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
              hours_today: Number(existingSubmission.hours_today) || 8,
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

            setProjectUpdates(projectUpdatesMapFromRow(existingSubmission));
            setExtraCheckoutProjectIds(
              extraProjectIdsFromUpdates(
                projectUpdatesMapFromRow(existingSubmission),
                parsePlannedProjectsFromRow(existingSubmission)
              )
            );
            setTodaySubmissionComplete(isWorkSubmissionRowComplete(existingSubmission));
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

  useEffect(() => {
    if (!editId) {
      didAutoOpenEditRef.current = false;
    }
  }, [editId]);

  useEffect(() => {
    if (isEditing && editId && !tasksLoading && !didAutoOpenEditRef.current) {
      didAutoOpenEditRef.current = true;
      if (verificationRejected) {
        toast({
          title: 'Checkout blocked',
          description:
            'Your onboarding verification was rejected. Fix the issues on Profile, then wait for HR to re-verify.',
          variant: 'destructive',
        });
        return;
      }
      syncFlowAction('checkout');
      setCheckoutWizardStep('form');
      isCheckoutWizardOpenRef.current = true;
      setIsCheckoutWizardOpen(true);
    }
  }, [isEditing, editId, tasksLoading, syncFlowAction, verificationRejected]);

  useEffect(() => {
    if (isEditing || !currentUser?.id || !isSaturdayYmd(serverToday)) return;
    if (weeklyReportSatisfiedRef.current) return;
    let cancelled = false;
    void getWeeklyReport(serverToday)
      .then((data) => {
        if (cancelled || data.required) return;
        weeklyReportSatisfiedRef.current = true;
      })
      .catch(() => {
        // Keep the Saturday gate; checkout can still collect the report.
      });
    return () => {
      cancelled = true;
    };
  }, [serverToday, isEditing, currentUser?.id]);

  useEffect(() => {
    const flowKey = `${flowAction || ''}:${editId || ''}`;
    if (!flowAction) {
      if (!editId && !isCheckoutWizardOpenRef.current) {
        didAutoOpenFlowRef.current = null;
      }
      return;
    }
    if (didAutoOpenFlowRef.current === flowKey) return;

    if (flowAction === 'checkin') {
      if (verificationRejected || attendanceBlocked) {
        didAutoOpenFlowRef.current = flowKey;
        clearWorkFlowUrl();
        return;
      }
      didAutoOpenFlowRef.current = flowKey;
      clearOfficeGeoState();
      if (workModeLockedToOffice) {
        void selectWorkMode('office');
      } else {
        setWorkMode(null);
      }
      setIsCheckInDialogOpen(true);
      return;
    }

    if (flowAction === 'checkout' && !isEditing) {
      if (verificationRejected) {
        didAutoOpenFlowRef.current = flowKey;
        clearWorkFlowUrl();
        return;
      }
      didAutoOpenFlowRef.current = flowKey;
      if (isCheckoutWizardOpenRef.current) {
        return;
      }
      resetCheckoutFormDefaults();
      const workDate = form.check_in_time ? form.submission_date : serverToday;
      setWeeklyReportDirty(false);
      setCheckoutWizardStep(saturdayNeedsWeeklyStep(workDate) ? 'weekly_report' : 'form');
      isCheckoutWizardOpenRef.current = true;
      setIsCheckoutWizardOpen(true);
    }
  }, [
    flowAction,
    editId,
    isEditing,
    workModeLockedToOffice,
    clearOfficeGeoState,
    selectWorkMode,
    verificationRejected,
    attendanceBlocked,
    clearWorkFlowUrl,
  ]);

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

  const isHeaderLayout = layout === 'header';
  const primaryBtnClass =
    'h-11 sm:h-12 px-4 sm:px-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300';
  const outlineBtnClass =
    'h-11 sm:h-12 px-4 sm:px-6 border-2 font-semibold shadow-sm transition-all duration-300';

  const alertBannerClass =
    'w-full rounded-xl border px-4 py-3 text-sm flex items-start gap-2';

  const flowAlerts = (
    <>
      {verificationRejected ? (
        <div className={`${alertBannerClass} border-rose-200/80 dark:border-rose-800/60 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100`}>
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Check-in & checkout blocked</p>
            <p className="text-xs mt-0.5 opacity-90">
              Your onboarding verification was rejected. Fix the issues on{' '}
              <Link
                to={`/${currentUser?.role}/profile`}
                className="underline font-medium"
              >
                Profile
              </Link>
              , then wait for HR to re-verify. Pending or verified accounts can check in normally.
            </p>
          </div>
        </div>
      ) : null}
      {attendanceBlocked && !hasCheckedIn ? (
        <div className={`${alertBannerClass} border-rose-200/80 dark:border-rose-800/60 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100`}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">
              {attendanceGate?.reason === 'on_leave'
                ? 'You are on approved leave today'
                : attendanceGate?.reason === 'before_joining'
                  ? 'Before joining date'
                  : 'Check-in unavailable'}
            </p>
            <p className="text-xs mt-0.5 opacity-90">
              {attendanceGate?.message}
              {attendanceGate?.reason === 'on_leave' ? (
                <>
                  {' '}
                  Manage leave from{' '}
                  <a
                    href={`/${currentUser?.role}/leave`}
                    className="underline font-medium"
                  >
                    My Leave
                  </a>
                  .
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {officeOnlyActive ? (
        <div className={`${alertBannerClass} border-amber-300/80 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100`}>
          <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Office-only penalty week</p>
            <p className="text-xs mt-0.5 opacity-90">
              {attendanceGate?.office_only_week_start && attendanceGate?.office_only_week_end
                ? `${attendanceGate.office_only_week_start} – ${attendanceGate.office_only_week_end}. `
                : ''}
              Check in from Office after 3 late arrivals. WFH still requires an Attendance exception for the day.
            </p>
          </div>
        </div>
      ) : allowWfhToday ? (
        <div className={`${alertBannerClass} border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100`}>
          <Home className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">WFH available today (Attendance exception)</p>
            <p className="text-xs mt-0.5 opacity-90">
              You may choose Office or WFH at check-in
              {forgiveLateToday
                ? `. Late after ${checkInCutoffLabel} will not count as a strike.`
                : '.'}
            </p>
          </div>
        </div>
      ) : upcomingOfficeWeek ? (
        <div className={`${alertBannerClass} border-orange-300/80 dark:border-orange-700/60 bg-orange-50/90 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100`}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Upcoming Office-only penalty week</p>
            <p className="text-xs mt-0.5 opacity-90">
              {upcomingOfficeWeek.week_start} – {upcomingOfficeWeek.week_end}: stricter Office attendance after late strikes. WFH still needs an Attendance exception.
            </p>
          </div>
        </div>
      ) : lateCount > 0 && !hasCheckedIn ? (
        <div className={`${alertBannerClass} border-sky-200/80 dark:border-sky-800/60 bg-sky-50/90 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100`}>
          <Clock className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">
              Late strikes: {lateCount}/{lateLimit}
            </p>
            <p className="text-xs mt-0.5 opacity-90">
              {checkInCutoffEnabled
                ? `Check in before ${checkInCutoffLabel} (Mon–Sat). After ${lateLimit} late check-ins, next week is Office only.`
                : `Late check-in cutoff is currently disabled by admin. After ${lateLimit} late check-ins (when enabled), next week is Office only.`}
            </p>
          </div>
        </div>
      ) : null}

      {isSundayHoliday && !hasCheckedIn && !attendanceBlocked ? (
        <div className={`${alertBannerClass} border-violet-200/80 dark:border-violet-800/60 bg-violet-50/90 dark:bg-violet-950/40 text-violet-950 dark:text-violet-100`}>
          <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Sunday holiday</p>
            <p className="text-xs mt-0.5 opacity-90">
              Check-in anytime is allowed. Hours stay 0 until you submit your work update — nothing is auto-added.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );

  const flowControls = (
    <div
      className={
        isHeaderLayout
          ? 'flex flex-col items-stretch gap-2 w-full min-w-0'
          : 'flex flex-wrap items-center gap-2 sm:gap-3'
      }
    >
      {isEditing && (
        <span
          className={
            isHeaderLayout
              ? 'text-xs font-medium text-gray-500 dark:text-gray-400 text-right'
              : 'w-full text-xs font-medium text-gray-500 dark:text-gray-400 sm:mr-1 sm:w-auto'
          }
        >
          Editing submission
        </span>
      )}
      <div
        className={
          isHeaderLayout
            ? 'flex flex-wrap items-center justify-end gap-3 w-full min-w-0'
            : 'flex flex-wrap items-center gap-2 sm:gap-3 w-full min-w-0'
        }
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
        {hasActiveWorkSession && (
          <Button
            onClick={onToggleBreak}
            type="button"
            variant={isOnBreak ? 'destructive' : 'outline'}
            className={`${outlineBtnClass} shrink-0`}
          >
            {isOnBreak ? (
              <div className="flex items-center gap-3">
                <PlayCircle className="h-5 w-5" />
                <span>End Break</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <PauseCircle className="h-5 w-5" />
                <span>Break</span>
              </div>
            )}
          </Button>
        )}
        {!isEditing && !hasCheckedIn && !todaySubmissionComplete ? (
          <Button
            onClick={openCheckInDialog}
            disabled={isCheckingIn || attendanceActionsBlocked}
            className={`${primaryBtnClass} shrink-0 bg-gradient-to-r from-blue-600 to-emerald-700 text-white hover:from-blue-700 hover:to-emerald-800 disabled:opacity-50 disabled:hover:scale-100`}
          >
            {isCheckingIn ? (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Checking in...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5" />
                <span>Check-in</span>
              </div>
            )}
          </Button>
        ) : null}
        {hasActiveWorkSession ? (
          <Button
            onClick={openCheckoutWizard}
            disabled={verificationRejected}
            className={`${primaryBtnClass} shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:hover:scale-100`}
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5" />
              <span>Checkout</span>
            </div>
          </Button>
        ) : null}
        {isEditing ? (
          <Button
            onClick={openCheckoutWizard}
            disabled={verificationRejected}
            className={`${primaryBtnClass} shrink-0 bg-gradient-to-r from-blue-600 to-emerald-700 text-white hover:from-blue-700 hover:to-emerald-800 disabled:opacity-50 disabled:hover:scale-100`}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <span>Update Submission</span>
            </div>
          </Button>
        ) : null}
        </div>
        {isHeaderLayout && headerTrailing ? (
          <div className="shrink-0">{headerTrailing}</div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <div
        className={
          isHeaderLayout
            ? 'flex flex-col gap-3 w-full min-w-0'
            : 'flex flex-col gap-3 w-full min-w-0 mb-3'
        }
      >
        {flowAlerts}
        {flowControls}
      </div>

      {/* Professional Check-in Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={(open) => {
        if (open) {
          setIsCheckInDialogOpen(true);
          return;
        }
        closeCheckInDialog();
      }}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-border/60 p-0 [&>button[data-radix-dialog-close]]:hidden">
          {/* Header */}
          <div className="relative overflow-hidden border-b border-border/60 bg-card px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeCheckInDialog();
              }}
              className="absolute right-4 top-4 z-[100] flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close dialog"
              type="button"
              style={{ pointerEvents: 'auto' }}
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader className="relative space-y-0 pr-12 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-bold tracking-tight">Check-in</DialogTitle>
                  <DialogDescription className="mt-0.5 text-sm">
                    Confirm where you're working and what you plan to do today.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {new Date(form.submission_date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'Asia/Kolkata'
                })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground">
                <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                {new Date().toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Kolkata'
                })}{' '}
                IST
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl px-1 text-xs text-muted-foreground">
                {isSundayHoliday
                  ? 'Sunday holiday — check in anytime. Hours are not auto-added.'
                  : checkInCutoffEnabled
                    ? `Check in before ${checkInCutoffLabel}. Late check-ins count toward Office-only weeks.`
                    : 'Late cutoff is off today — check-ins are not marked late.'}
              </span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-muted/30 px-5 py-5 sm:px-6 [scrollbar-width:thin]">
            <div className="flex flex-col gap-4">
            {/* Office / WFH — WFH only when Attendance exception grants it */}
            <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                    checkInLocationReady
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {checkInLocationReady ? <Check className="h-3.5 w-3.5" /> : '1'}
                </span>
                <Label className="text-sm font-semibold text-foreground">
                  Work location <span className="text-rose-500">*</span>
                </Label>
                {canChooseWfh ? (
                  <span className="ml-auto inline-flex items-center rounded-xl border border-emerald-300/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    Exception · WFH open
                  </span>
                ) : (
                  <span className="ml-auto inline-flex items-center rounded-xl border border-blue-300/80 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-200">
                    Office only
                  </span>
                )}
              </div>

              {canChooseWfh ? (
                <p className="text-xs text-emerald-800 dark:text-emerald-200 rounded-xl border border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/30 px-3 py-2">
                  An admin granted a WFH Attendance exception for today — choose Office or WFH.
                  {officeOnlyActive
                    ? ' (Also covers your Office-only penalty week.)'
                    : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                  {officeOnlyActive
                    ? `Office-only penalty week${
                        attendanceGate?.office_only_week_start
                          ? ` (${attendanceGate.office_only_week_start} – ${attendanceGate.office_only_week_end})`
                          : ''
                      }. `
                    : ''}
                  Default is Office. WFH appears here only when an admin adds an Attendance exception day
                  {wfhRequestPending
                    ? '. Your WFH request is pending approval.'
                    : canRequestWfh
                      ? ' — or request WFH below for admin approval.'
                      : '.'}
                </p>
              )}

              <div className="grid grid-cols-12 gap-3" role="radiogroup" aria-label="Work location">
                {(
                  [
                    {
                      mode: 'office' as const,
                      label: 'Office',
                      hint: canChooseWfh
                        ? `Within ${officeGeoConfig.radiusM} m of office`
                        : 'Required unless exception granted',
                      Icon: Building2,
                      active: 'border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10',
                      iconActive: 'bg-blue-500 text-white',
                    },
                    ...(canChooseWfh
                      ? [
                          {
                            mode: 'wfh' as const,
                            label: 'Work from home',
                            hint: 'Exception granted for today',
                            Icon: Home,
                            active: 'border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10',
                            iconActive: 'bg-emerald-500 text-white',
                          },
                        ]
                      : []),
                  ]
                ).map(({ mode, label, hint, Icon, active, iconActive }) => {
                  const selected = workMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => void selectWorkMode(mode)}
                      disabled={officeGeoStatus === 'checking' || isCheckingIn}
                      className={cn(
                        canChooseWfh ? 'col-span-12 sm:col-span-6' : 'col-span-12',
                        'relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
                        selected ? active : 'border-border bg-background hover:border-foreground/20 hover:bg-muted/40'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                          selected ? iconActive : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                      </span>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          selected ? 'border-transparent bg-foreground text-background' : 'border-border'
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!canChooseWfh && showRequestWfhAction ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">Need to work from home?</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {wfhRequestPending
                        ? 'Waiting for admin approval. WFH will unlock after it is granted as an Attendance exception.'
                        : 'Submit a request — an admin can approve it as an Attendance exception for today.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      wfhRequestPending ||
                      !canRequestWfh ||
                      isCheckingIn ||
                      wfhRequestSubmitting
                    }
                    onClick={() => {
                      if (wfhRequestPending || !canRequestWfh) return;
                      openWfhRequestDialog();
                    }}
                    className="h-10 rounded-xl shrink-0 border-emerald-300/80 text-emerald-900 dark:border-emerald-700/60 dark:text-emerald-100"
                  >
                    <Home className="h-3.5 w-3.5 mr-1.5" />
                    {wfhRequestPending ? 'WFH pending' : 'Request WFH for today'}
                  </Button>
                </div>
              ) : null}

              {workMode === 'office' ? (
                <div
                  className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-xs ${
                    officeGeoStatus === 'ok'
                      ? 'border-emerald-300/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : officeGeoStatus === 'error'
                        ? 'border-rose-300/80 bg-rose-50/90 text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-100'
                        : 'border-border/60 bg-background/80 text-muted-foreground'
                  }`}
                >
                  {officeGeoStatus === 'checking' ? (
                    <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-medium leading-relaxed">
                      {officeGeoMessage ||
                        `Office check-in requires your location within ${officeGeoConfig.radiusM} m of ${officeGeoConfig.label}.`}
                    </p>
                    {officeGeoStatus === 'error' ? (
                      <div className="space-y-3">
                        {locationDenied ? (
                          <div className="rounded-xl border border-rose-200/80 bg-white/80 dark:bg-rose-950/30 dark:border-rose-800/50 p-3 space-y-3">
                            <div className="flex items-start gap-2 min-w-0">
                              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-300" />
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-xs font-bold text-rose-950 dark:text-rose-50 leading-snug">
                                  {locationHelpGuide.title}
                                </p>
                                <p className="text-[11px] text-rose-800/90 dark:text-rose-100/80 leading-relaxed">
                                  {locationHelpGuide.summary}
                                </p>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700/70 dark:text-rose-200/60">
                                  Detected: {locationClient.label}
                                </p>
                              </div>
                            </div>

                            <ol className="flex flex-col gap-2 list-none m-0 p-0">
                              {locationHelpGuide.steps.map((step, idx) => (
                                <li
                                  key={`${idx}-${step.slice(0, 24)}`}
                                  className="grid grid-cols-12 gap-2 items-start"
                                >
                                  <span className="col-span-1 flex h-5 w-5 items-center justify-center rounded-lg bg-rose-600 text-[10px] font-bold text-white shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="col-span-11 text-[11px] leading-relaxed text-rose-950 dark:text-rose-50">
                                    {step}
                                  </span>
                                </li>
                              ))}
                            </ol>

                            {locationHelpGuide.tip ? (
                              <p className="text-[11px] leading-relaxed rounded-xl border border-amber-300/70 bg-amber-50/90 px-2.5 py-2 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
                                {locationHelpGuide.tip}
                              </p>
                            ) : null}

                            <div className="space-y-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700/70 dark:text-rose-200/60">
                                Wrong device? Pick yours
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setLocationHelpPreset('auto')}
                                  className={`rounded-xl border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                    locationHelpPreset === 'auto'
                                      ? 'border-rose-500 bg-rose-600 text-white'
                                      : 'border-rose-200/80 bg-background/80 text-rose-900 dark:border-rose-800/60 dark:text-rose-100'
                                  }`}
                                >
                                  Auto
                                </button>
                                {locationHelpAlternates.map((alt) => (
                                  <button
                                    key={alt.key}
                                    type="button"
                                    onClick={() => setLocationHelpPreset(alt.key)}
                                    className={`rounded-xl border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                      locationHelpPreset === alt.key
                                        ? 'border-rose-500 bg-rose-600 text-white'
                                        : 'border-rose-200/80 bg-background/80 text-rose-900 dark:border-rose-800/60 dark:text-rose-100'
                                    }`}
                                  >
                                    {alt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : officeLocationAction.hint ? (
                          <p className="text-[11px] opacity-80 leading-relaxed">
                            {officeLocationAction.hint}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isCheckingIn}
                            onClick={() => void retryOfficeLocation()}
                            className="h-9 rounded-xl border-rose-300/80 bg-background/90 px-3 text-xs font-semibold text-rose-900 hover:bg-rose-100 dark:border-rose-700/60 dark:text-rose-100 dark:hover:bg-rose-950/60"
                          >
                            {officeLocationAction.icon === CheckCircle2 ? (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            ) : officeLocationAction.icon === LocateFixed ? (
                              <LocateFixed className="h-3.5 w-3.5 mr-1.5" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {officeLocationAction.label}
                          </Button>
                          {wfhRequestPending ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="h-9 rounded-xl border-amber-300/80 bg-background/90 px-3 text-xs font-semibold text-amber-900 dark:border-amber-700/60 dark:text-amber-100"
                            >
                              <Home className="h-3.5 w-3.5 mr-1.5" />
                              WFH request pending
                            </Button>
                          ) : showGeoAdminWfhRequest ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isCheckingIn || wfhRequestSubmitting}
                              onClick={openWfhRequestDialog}
                              className="h-9 rounded-xl border-emerald-300/80 bg-background/90 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700/60 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
                            >
                              <Home className="h-3.5 w-3.5 mr-1.5" />
                              Request WFH for today
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {officeGeoStatus === 'checking' &&
                    (officeGeoPermission === 'prompt' || officeGeoPermission === 'denied') ? (
                      <p className="text-[11px] opacity-80">
                        {officeGeoPermission === 'denied'
                          ? 'Finish the device steps above, then we’ll re-check automatically when permission changes.'
                          : 'Look for the browser location prompt and choose Allow.'}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            {/* Project Selection */}
            <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                    selectedProjects.length > 0
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {selectedProjects.length > 0 ? <Check className="h-3.5 w-3.5" /> : '2'}
                </span>
                <Label className="text-sm font-semibold text-foreground">Projects you'll work on</Label>
                {selectedProjects.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedProjects([])}
                    className="ml-auto inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                    aria-label="Clear selected projects"
                  >
                    {selectedProjects.length} selected
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  className="h-11 rounded-xl bg-background pl-10"
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                <div className="max-h-60 overflow-y-auto p-1.5 [scrollbar-width:thin]">
                  {loadingProjects ? (
                    <div className="flex flex-col gap-1.5 p-1" aria-busy="true" aria-label="Loading projects">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                          <div className="h-4 flex-1 animate-pulse rounded-xl bg-muted" />
                          <div className="h-5 w-16 animate-pulse rounded-xl bg-muted" />
                        </div>
                      ))}
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                        <FolderKanban className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No projects assigned</p>
                      <p className="text-xs text-muted-foreground">Describe your planned work below instead.</p>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No projects match “{projectSearch}”</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {filteredProjects.map((project) => {
                        const isSelected = selectedProjects.includes(project.id);
                        return (
                          <div
                            key={project.id}
                            onClick={() => handleProjectToggle(project.id)}
                            className={cn(
                              'flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                              isSelected
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-transparent hover:bg-muted/60'
                            )}
                          >
                            <Checkbox
                              id={`project-${project.id}`}
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setSelectedProjects((prev) =>
                                    prev.includes(project.id) ? prev : [...prev, project.id]
                                  );
                                } else {
                                  setSelectedProjects((prev) => prev.filter((id) => id !== project.id));
                                }
                              }}
                              className="shrink-0 rounded-md"
                            />
                            <label
                              htmlFor={`project-${project.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                'min-w-0 flex-1 cursor-pointer truncate text-sm font-medium',
                                isSelected ? 'text-foreground' : 'text-foreground/90'
                              )}
                              title={project.name}
                            >
                              {project.name}
                            </label>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {loadingProjectStats ? (
                                <>
                                  <span className="h-5 w-14 animate-pulse rounded-xl bg-muted" />
                                  <span className="h-5 w-16 animate-pulse rounded-xl bg-muted" />
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    {projectStats[project.id]?.bugs ?? 0} open
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {projectStats[project.id]?.updates ?? 0} approved
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Planned Work */}
            <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                    plannedWork.trim()
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {plannedWork.trim() ? <Check className="h-3.5 w-3.5" /> : '3'}
                </span>
                <Label htmlFor="planned-work" className="text-sm font-semibold text-foreground">
                  Planned work for today
                </Label>
                <span className="ml-auto text-xs text-muted-foreground">
                  {selectedProjects.length > 0 ? 'Optional' : 'Required if no project selected'}
                </span>
              </div>
              <div className="relative">
                <Textarea
                  id="planned-work"
                  placeholder={'What will you focus on today?\n\n• Fix authentication bug in login module\n• Review PR #123\n• Update API documentation'}
                  value={plannedWork}
                  onChange={(e) => setPlannedWork(e.target.value)}
                  className="min-h-[132px] resize-y rounded-xl bg-background pb-8 text-sm leading-relaxed"
                />
                {plannedWork.trim() && (
                  <span className="pointer-events-none absolute bottom-2.5 right-3 rounded-lg bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {plannedWork.trim().split('\n').filter(l => l.trim()).length} line{plannedWork.trim().split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </section>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="flex-col gap-3 border-t border-border/60 bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0 sm:px-6">
            <div className="flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
              {[
                { ok: checkInLocationReady, label: workMode === 'wfh' ? 'WFH' : 'Location' },
                { ok: checkInPlanReady, label: 'Plan' },
              ].map(({ ok, label }) => (
                <span
                  key={label}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium',
                    ok
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {ok ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  {label}
                  <span className="sr-only">{ok ? 'ready' : 'pending'}</span>
                </span>
              ))}
            </div>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={closeCheckInDialog}
                disabled={isCheckingIn}
                className="h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckIn}
                disabled={isCheckingIn || !canConfirmCheckIn}
                className="h-11 min-w-[180px] rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-700 hover:to-indigo-700 hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking in…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm check-in
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={wfhRequestDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeWfhRequestDialog();
            return;
          }
          setWfhRequestDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request WFH for today</DialogTitle>
            <DialogDescription>
              Admins will be notified. After approval you can check in as WFH.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wfh-request-note">Note (optional)</Label>
            <Textarea
              id="wfh-request-note"
              value={wfhRequestNote}
              maxLength={255}
              onChange={(e) => setWfhRequestNote(e.target.value.slice(0, 255))}
              placeholder="Reason for WFH today…"
              className="min-h-[96px] rounded-xl"
              disabled={wfhRequestSubmitting}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={wfhRequestSubmitting}
              onClick={closeWfhRequestDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={wfhRequestSubmitting}
              onClick={() => void submitWfhRequest()}
            >
              {wfhRequestSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCheckoutWizardOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (checkoutWizardStep === 'weekly_report' && weeklyReportDirty) {
              if (!window.confirm('You have unsaved changes.')) return;
            }
            if (checkoutWizardStep === 'preview') {
              closeCheckoutWizard();
              return;
            }
            isCheckoutWizardOpenRef.current = false;
            setIsCheckoutWizardOpen(false);
            setCheckoutWizardStep('form');
            setWeeklyReportDirty(false);
            clearWorkFlowUrl();
          }
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-border/60 p-0 [&>button[data-radix-dialog-close]]:hidden">
          {(() => {
            const steps: { key: CheckoutWizardStepKey; label: string }[] = [
              ...(!isEditing && isSaturdayYmd(checkoutWorkDate())
                ? [{ key: 'weekly_report' as const, label: 'Weekly report' }]
                : []),
              { key: 'form', label: isEditing ? 'Update' : 'Log hours' },
              { key: 'preview', label: 'Preview' },
            ];
            const activeIndex = Math.max(
              0,
              steps.findIndex((s) => s.key === checkoutWizardStep)
            );
            return (
              <div className="border-b border-border/60 bg-background px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                      checkoutWizardStep === 'weekly_report'
                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600'
                        : checkoutWizardStep === 'form'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                          : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    }`}
                  >
                    {checkoutWizardStep === 'weekly_report' ? (
                      <ClipboardList className="h-5 w-5" />
                    ) : checkoutWizardStep === 'form' ? (
                      <LogOut className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <DialogHeader className="min-w-0 flex-1 space-y-0.5 text-left">
                    <DialogTitle className="truncate text-lg font-semibold leading-6 text-foreground">
                      {checkoutWizardStep === 'weekly_report'
                        ? 'Weekly Report'
                        : checkoutWizardStep === 'form'
                          ? isEditing
                            ? 'Update Work Submission'
                            : 'Complete Checkout'
                          : 'Daily Work Preview'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      {checkoutWizardStep === 'weekly_report'
                        ? 'Fill this short weekly summary, then you can log hours and check out.'
                        : checkoutWizardStep === 'form'
                          ? isEditing
                            ? 'Review and update your daily work submission.'
                            : `${formatAttendanceDateLabel(form.submission_date)}`
                          : 'Copy or share your daily work update.'}
                    </DialogDescription>
                  </DialogHeader>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={loading}
                    onClick={() => {
                      if (checkoutWizardStep === 'preview') {
                        closeCheckoutWizard();
                      } else {
                        dismissCheckoutWizard();
                      }
                    }}
                    className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                    aria-label="Close dialog"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {steps.length > 1 ? (
                  <ol className="mt-4 flex items-center gap-2" aria-label="Checkout progress">
                    {steps.map((step, idx) => {
                      const done = idx < activeIndex;
                      const current = idx === activeIndex;
                      return (
                        <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${
                              done
                                ? 'bg-emerald-500 text-white'
                                : current
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                            aria-current={current ? 'step' : undefined}
                          >
                            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                          </span>
                          <span
                            className={`truncate text-xs font-medium ${
                              current ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </span>
                          {idx < steps.length - 1 ? (
                            <span
                              className={`h-px min-w-4 flex-1 ${done ? 'bg-emerald-500/60' : 'bg-border'}`}
                              aria-hidden
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </div>
            );
          })()}

          {checkoutWizardStep === 'weekly_report' ? (
            <WeeklyReportStep
              active={isCheckoutWizardOpen && checkoutWizardStep === 'weekly_report'}
              workDate={form.submission_date || serverToday}
              fallbackName={currentUser?.name || currentUser?.username || 'User'}
              onContinue={handleWeeklyReportContinue}
              onSkipToCheckout={skipWeeklyReportToCheckout}
              onDirtyChange={handleWeeklyReportDirty}
            />
          ) : checkoutWizardStep === 'form' ? (
            <>
              <div className="flex-1 overflow-y-auto bg-muted/30 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4">
                  {/* Hours */}
                  <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground">Hours &amp; status</h3>
                        <p className="text-xs text-muted-foreground">Daily hours are capped at 8.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 flex flex-col gap-1.5 sm:col-span-6 md:col-span-4">
                        <span id="checkout-work-date-label" className="text-sm font-medium leading-5 text-foreground">
                          Work date <span className="text-destructive">*</span>
                        </span>
                        <div
                          aria-labelledby="checkout-work-date-label"
                          className="flex h-11 items-center gap-2 rounded-xl border border-input bg-muted/40 px-3 text-sm text-foreground"
                        >
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{formatAttendanceDateLabel(form.submission_date)}</span>
                        </div>
                      </div>
                      <div className="col-span-12 flex flex-col gap-1.5 sm:col-span-6 md:col-span-4">
                        <span className="text-sm font-medium leading-5 text-foreground">
                          Hours worked <span className="text-destructive">*</span>
                        </span>
                        <HourPicker
                          value={form.hours_today}
                          onChange={(v) => setForm((p) => ({ ...p, hours_today: v }))}
                          min={1}
                          max={8}
                          step={0.25}
                          placeholder="Select hours"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="col-span-12 flex flex-col gap-1.5 md:col-span-4">
                        <span className="text-sm font-medium leading-5 text-foreground">Planned work status</span>
                        <StatusDropdown
                          value={form.planned_work_status || 'not_started'}
                          onChange={(value) => setForm((p) => ({ ...p, planned_work_status: value }))}
                          placeholder="Select status"
                          className="h-11 w-full rounded-xl"
                        />
                      </div>
                    </div>

                    <label
                      htmlFor="checkout-request-admin-approval"
                      className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                        requestAdminApproval
                          ? 'border-blue-300 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/30'
                          : 'border-border/60 bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id="checkout-request-admin-approval"
                        checked={requestAdminApproval}
                        onCheckedChange={(checked) => {
                          const enabled = Boolean(checked);
                          setRequestAdminApproval(enabled);
                          if (!enabled) {
                            setRequestedExtraHours(0);
                            setApprovalReason('');
                          }
                        }}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          Worked more than 8 hours?
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Request admin approval for the extra hours.
                        </span>
                      </span>
                    </label>

                    {requestAdminApproval ? (
                      <div className="mt-4 grid grid-cols-12 gap-4">
                        <div className="col-span-12 flex flex-col gap-1.5 sm:col-span-4">
                          <Label htmlFor="checkout-extra-hours" className="text-sm font-medium leading-5 text-foreground">
                            Extra hours <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="checkout-extra-hours"
                            type="number"
                            inputMode="decimal"
                            min={0.25}
                            max={16}
                            step={0.25}
                            value={requestedExtraHours || ''}
                            onChange={(e) => {
                              const next = Number(e.target.value || 0);
                              setRequestedExtraHours(Math.max(0, Math.min(16, next)));
                            }}
                            placeholder="e.g. 2"
                            aria-invalid={!(requestedExtraHours > 0)}
                            className="h-11 rounded-xl bg-background"
                          />
                          <p
                            className={`text-xs ${requestedExtraHours > 0 ? 'text-muted-foreground' : 'text-destructive'}`}
                            role={requestedExtraHours > 0 ? undefined : 'alert'}
                          >
                            {requestedExtraHours > 0 ? 'Up to 16 hours.' : 'Enter the extra hours (0.25–16).'}
                          </p>
                        </div>
                        <div className="col-span-12 flex flex-col gap-1.5 sm:col-span-8">
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="checkout-approval-reason" className="text-sm font-medium leading-5 text-foreground">
                              Reason <span className="text-destructive">*</span>
                            </Label>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {approvalReason.length}/500
                            </span>
                          </div>
                          <Input
                            id="checkout-approval-reason"
                            value={approvalReason}
                            maxLength={500}
                            onChange={(e) => setApprovalReason(e.target.value.slice(0, 500))}
                            placeholder="Why were extra hours needed?"
                            aria-invalid={!approvalReason.trim()}
                            className="h-11 rounded-xl bg-background"
                          />
                          {!approvalReason.trim() ? (
                            <p className="text-xs text-destructive" role="alert">
                              A reason is required for approval.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <CheckoutProjectUpdatesCard
                    projects={checkoutProjects}
                    plannedProjectIds={selectedProjects}
                    assignableProjects={assignableCheckoutProjects}
                    onAddProject={addUnplannedCheckoutProject}
                    onRemoveProject={removeUnplannedCheckoutProject}
                    projectUpdates={projectUpdates}
                    onChange={updateProjectUpdate}
                    hoursToday={Number(form.hours_today) || 0}
                    submissionDate={form.submission_date || serverToday}
                    timeAllocation={timeAllocation}
                    onOtherHoursChange={(hours) =>
                      setTimeAllocation((prev) => ({ ...prev, other_hours: hours }))
                    }
                    onSlotAttendanceChange={(slot, attended) =>
                      setTimeAllocation((prev) =>
                        withSlotAttendance(
                          prev,
                          form.submission_date || serverToday,
                          slot,
                          attended
                        )
                      )
                    }
                    loading={loadingProjects && checkoutProjects.length === 0 && assignableCheckoutProjects.length === 0}
                  />

                  {/* Daily Tasks */}
                  <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ListTodo className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground">Daily tasks</h3>
                        <p className="text-xs text-muted-foreground">
                          Optional · one task per line
                        </p>
                      </div>
                      <span className="shrink-0 rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                        {taskCounts.total} {taskCounts.total === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                      {(
                        [
                          { id: 'checkout-completed', label: 'Completed', field: 'completed_tasks', count: taskCounts.completed, dot: 'bg-emerald-500', placeholder: 'What did you finish today?' },
                          { id: 'checkout-ongoing', label: 'Ongoing', field: 'ongoing_tasks', count: taskCounts.ongoing, dot: 'bg-blue-500', placeholder: 'What is still in progress?' },
                          { id: 'checkout-pending', label: 'Pending', field: 'pending_tasks', count: taskCounts.pending, dot: 'bg-amber-500', placeholder: 'What is blocked or waiting?' },
                          { id: 'checkout-upcoming', label: 'Upcoming', field: 'notes', count: taskCounts.upcoming, dot: 'bg-orange-500', placeholder: 'What is next?' },
                        ] as const
                      ).map((task) => (
                        <div key={task.id} className="col-span-12 flex flex-col gap-1.5 md:col-span-6">
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={task.id} className="flex items-center gap-2 text-sm font-medium leading-5 text-foreground">
                              <span className={`h-2 w-2 rounded-full ${task.dot}`} aria-hidden />
                              {task.label}
                            </Label>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {task.count} {task.count === 1 ? 'line' : 'lines'}
                            </span>
                          </div>
                          <Textarea
                            id={task.id}
                            value={form[task.field] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setForm((p) => ({ ...p, [task.field]: value }));
                            }}
                            className="min-h-[104px] resize-y rounded-xl bg-background text-sm leading-relaxed"
                            placeholder={task.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Work Notes */}
                  <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground">Work notes</h3>
                        <p className="text-xs text-muted-foreground">Optional · anything else worth sharing</p>
                      </div>
                    </div>
                    <Label htmlFor="checkout-work-notes" className="sr-only">
                      Additional notes about your work today
                    </Label>
                    <Textarea
                      id="checkout-work-notes"
                      value={form.planned_work_notes || ''}
                      onChange={(e) => setForm((p) => ({ ...p, planned_work_notes: e.target.value }))}
                      className="min-h-[104px] w-full resize-y rounded-xl bg-background text-sm leading-relaxed"
                      placeholder="Blockers, decisions, links…"
                    />
                  </section>
                </div>
              </div>

              <DialogFooter className="border-t border-border/60 bg-background px-5 py-4 sm:px-6">
                <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-xs sm:max-w-[55%]" aria-live="polite">
                    {checkoutMissing.length > 0 ? (
                      <span className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Still needed: {checkoutMissing.join(', ')}
                          {checkoutMissing.includes('hour allocation')
                            ? ` — split hours across Lunch, Breaks${
                                isGrowthGlimpseDay(form.submission_date || serverToday) ? ', Growth Glimpse' : ''
                              }, projects and Other.`
                            : '.'}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {isEditing ? 'Ready to update.' : 'Ready to check out · draft saved on this device.'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      disabled={!canSubmit || loading}
                      onClick={() => void onSubmit({ openPreviewAfter: true })}
                      className="h-10 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-semibold text-white hover:from-amber-600 hover:to-orange-700 sm:w-auto sm:min-w-[170px]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting…
                        </>
                      ) : isEditing ? (
                        'Update submission'
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" />
                          Complete checkout
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto bg-muted/30 px-5 py-5 sm:px-6">
                <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground">Submission summary</h3>
                      <p className="text-xs text-muted-foreground">Saved. Copy or share it with your team.</p>
                    </div>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden rounded-xl border border-border/60 bg-muted/40 p-4">
                    <pre className="m-0 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                      {template || 'No preview available.'}
                    </pre>
                  </div>
                </section>
              </div>
              <DialogFooter className="border-t border-border/60 bg-background px-5 py-4 sm:px-6">
                <div className="grid w-full grid-cols-12 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onCopyPreview()}
                    className="col-span-6 h-10 w-full rounded-xl"
                  >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void onSharePreview()}
                    className="col-span-6 h-10 w-full rounded-xl"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DailyWorkUpdate() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const edit = searchParams.get('edit');
    const action = searchParams.get('action');
    const params = new URLSearchParams();
    if (edit) params.set('edit', edit);
    if (action === 'checkin' || action === 'checkout') params.set('action', action);
    const qs = params.toString();
    const role = currentUser?.role || 'developer';
    navigate(`/${role}/daily-update${qs ? `?${qs}` : ''}`, { replace: true });
  }, [navigate, currentUser?.role, searchParams]);

  return null;
}
