import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submitWork, WorkSubmission, listMyTasks, UserTask, updateTask, listMySubmissions, checkIn, notifyWorkActivity, parseSubmissionsListResponse } from '@/services/todoService';
import { CheckoutProjectUpdatesCard } from '@/components/daily-work/CheckoutProjectUpdatesCard';
import {
  formatProjectUpdatesForText,
  parseProjectUpdatesFromRow,
  projectUpdatesToPayload,
  type ProjectWorkUpdate,
} from '@/lib/projectWorkUpdates';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClipboardCopy, Clock, FileText, Share2, FolderKanban, PauseCircle, PlayCircle, Search, X, LogOut, Calendar, ListTodo, AlertTriangle, Building2, Home, MapPin, Loader2, LocateFixed, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { projectService, Project } from '@/services/projectService';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HourPicker } from '@/components/ui/HourPicker';
import { StatusDropdown, type StatusOption } from '@/components/ui/StatusDropdown';
import { useAuth } from '@/context/AuthContext';
import { bugService } from '@/services/bugService';
import { updateService } from '@/services/updateService';
import { toLocalCalendarDateString } from '@/lib/dateUtils';
import { extractApiErrorMessage } from '@/lib/apiError';
import { assertDeviceClockMatchesServer } from '@/lib/deviceClock';
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
};

export function DailyWorkFlowPanel({
  onSaved,
  onCheckInTimeChange,
  editId: editIdProp,
  flowAction = null,
  onFlowActionChange,
  onEditClose,
  layout = 'inline',
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
  const [checkoutWizardStep, setCheckoutWizardStep] = useState<'form' | 'preview'>('form');
  const [todaySubmissionComplete, setTodaySubmissionComplete] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState<Record<string, ProjectWorkUpdate>>({});
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
  const canConfirmCheckIn =
    !!workMode &&
    (workMode === 'wfh' || officeGeoVerified) &&
    (selectedProjects.length > 0 || !!plannedWork.trim()) &&
    officeGeoStatus !== 'checking';

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
    selectedProjects.forEach((id) => {
      if (!orderedIds.includes(id)) orderedIds.push(id);
    });
    projects.forEach((p) => {
      if (!orderedIds.includes(p.id)) orderedIds.push(p.id);
    });
    return orderedIds.map((id) => byId.get(id)).filter(Boolean) as Project[];
  }, [projects, selectedProjects]);

  const updateProjectUpdate = useCallback((projectId: string, patch: Partial<ProjectWorkUpdate>) => {
    setProjectUpdates((prev) => {
      const current = prev[projectId] || {
        project_id: projectId,
        status: 'in_progress' as const,
        progress_percentage: 0,
        notes: '',
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

    // Why: Checkout must not require tasks or Office/WFH — those apply at check-in only.
    return hasDate && hasHours && overtimeRequestValid;
  }, [form, requestAdminApproval, requestedExtraHours, approvalReason]);

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
      };
      
      const res = await submitWork(payload);
      if ((res as any)?.success === false) throw new Error((res as any)?.message || 'Failed');
      
      setSelectedProjects([]);
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
          title: 'Checked out successfully',
          description: 'Review your daily work summary below',
        });
        return;
      }

      toast({ 
        title: isEditing ? 'Daily submission updated' : 'Daily submission saved',
        description: 'Your work update has been saved successfully'
      });

      if (isEmbedded) {
        onSaved?.();
      } else {
        setTimeout(() => {
          navigate(`/${currentUser?.role}/daily-update`);
        }, 500);
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
  }

  function openCheckoutWizard() {
    syncFlowAction('checkout');
    setCheckoutWizardStep('form');
    if (!isEditing) {
      resetCheckoutFormDefaults();
      setForm((prev) => ({
        ...prev,
        submission_date: prev.check_in_time ? prev.submission_date : serverToday,
      }));
    }
    setIsCheckoutWizardOpen(true);
  }

  function dismissCheckoutWizard() {
    setIsCheckoutWizardOpen(false);
    setCheckoutWizardStep('form');
    clearWorkFlowUrl();
  }

  function closeCheckoutWizard() {
    dismissCheckoutWizard();
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

    const text = sec.length ? header + `\n\n` + sec.join(`\n\n`) : header;
    setTemplate(text);
  }, [form.submission_date, form.check_in_time, form.hours_today, form.completed_tasks, form.pending_tasks, form.ongoing_tasks, form.notes, form.planned_work_notes, form.planned_work_status, selectedProjects, plannedWork, projects, requestAdminApproval, requestedExtraHours, approvalReason, overtimeHours, regularHours, breakEntries, monthSubmissions, projectUpdates]);

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
          };
        }
      });
      return next;
    });
  }, [isCheckoutWizardOpen, checkoutProjects]);

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
          setSelectedProjects(parsePlannedProjectsFromRow(existingSubmission));
          setPlannedWork(existingSubmission.planned_work || '');
          setProjectUpdates(projectUpdatesMapFromRow(existingSubmission));
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
          setPlannedWork('');
          setBreakEntries([]);
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
      syncFlowAction('checkout');
      setCheckoutWizardStep('form');
      setIsCheckoutWizardOpen(true);
    }
  }, [isEditing, editId, tasksLoading, syncFlowAction]);

  useEffect(() => {
    const flowKey = `${flowAction || ''}:${editId || ''}`;
    if (!flowAction) {
      if (!editId) didAutoOpenFlowRef.current = null;
      return;
    }
    if (didAutoOpenFlowRef.current === flowKey) return;

    if (flowAction === 'checkin') {
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
      didAutoOpenFlowRef.current = flowKey;
      resetCheckoutFormDefaults();
      setCheckoutWizardStep('form');
      setIsCheckoutWizardOpen(true);
    }
  }, [flowAction, editId, isEditing, workModeLockedToOffice, clearOfficeGeoState, selectWorkMode]);

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
    'h-12 px-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105';
  const outlineBtnClass =
    'h-12 px-6 border-2 font-semibold shadow-sm transition-all duration-300 hover:scale-105';

  return (
    <>
      {attendanceBlocked && !hasCheckedIn ? (
        <div className="w-full rounded-xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/90 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-900 dark:text-rose-100 flex items-start gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
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
        <div className="w-full rounded-xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 flex items-start gap-2 mb-3">
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
        <div className="w-full rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/90 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100 flex items-start gap-2 mb-3">
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
        <div className="w-full rounded-xl border border-orange-300/80 dark:border-orange-700/60 bg-orange-50/90 dark:bg-orange-950/40 px-4 py-3 text-sm text-orange-950 dark:text-orange-100 flex items-start gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Upcoming Office-only penalty week</p>
            <p className="text-xs mt-0.5 opacity-90">
              {upcomingOfficeWeek.week_start} – {upcomingOfficeWeek.week_end}: stricter Office attendance after late strikes. WFH still needs an Attendance exception.
            </p>
          </div>
        </div>
      ) : lateCount > 0 && !hasCheckedIn ? (
        <div className="w-full rounded-xl border border-sky-200/80 dark:border-sky-800/60 bg-sky-50/90 dark:bg-sky-950/40 px-4 py-3 text-sm text-sky-950 dark:text-sky-100 flex items-start gap-2 mb-3">
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
        <div className="w-full rounded-xl border border-violet-200/80 dark:border-violet-800/60 bg-violet-50/90 dark:bg-violet-950/40 px-4 py-3 text-sm text-violet-950 dark:text-violet-100 flex items-start gap-2 mb-3">
          <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Sunday holiday</p>
            <p className="text-xs mt-0.5 opacity-90">
              Check-in anytime is allowed. Hours stay 0 until you submit your work update — nothing is auto-added.
            </p>
          </div>
        </div>
      ) : null}
      <div
        className={
          isHeaderLayout
            ? 'flex flex-col items-stretch gap-3 w-full min-w-0 xl:items-end'
            : 'flex flex-wrap items-center gap-2 sm:gap-3'
        }
      >
        {isEditing && (
          <span
            className={
              isHeaderLayout
                ? 'text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-right'
                : 'w-full text-xs font-medium text-gray-500 dark:text-gray-400 sm:mr-1 sm:w-auto'
            }
          >
            Editing submission
          </span>
        )}
        <div className={`flex flex-wrap items-center gap-3 w-full min-w-0 ${isHeaderLayout ? 'xl:justify-end' : ''}`}>
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
            disabled={isCheckingIn || attendanceBlocked}
            className={`${primaryBtnClass} shrink-0 bg-gradient-to-r from-blue-600 to-emerald-700 text-white hover:from-blue-700 hover:to-emerald-800`}
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
            className={`${primaryBtnClass} shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700`}
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
            className={`${primaryBtnClass} shrink-0 bg-gradient-to-r from-blue-600 to-emerald-700 text-white hover:from-blue-700 hover:to-emerald-800`}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <span>Update Submission</span>
            </div>
          </Button>
        ) : null}
        </div>
      </div>

      {/* Professional Check-in Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={(open) => {
        if (open) {
          setIsCheckInDialogOpen(true);
          return;
        }
        closeCheckInDialog();
      }}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 [&>button[data-radix-dialog-close]]:hidden">
          {/* Header with gradient background */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-blue-600 to-indigo-600 p-6 text-white overflow-visible">
            <div className="absolute inset-0 bg-black/10"></div>
            {/* Close Button - Top Right */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeCheckInDialog();
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
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
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
              <div className="col-span-6 relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
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

            {isSundayHoliday ? (
              <p className="text-xs text-muted-foreground rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                Sunday holiday — check-in anytime. Hours are not auto-added.
              </p>
            ) : checkInCutoffEnabled ? (
              <p className="text-xs text-muted-foreground rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                Please check in before {checkInCutoffLabel}. Late check-ins are allowed but count
                toward Office-only weeks.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                Late check-in cutoff is disabled — check-ins are not marked late by time today.
              </p>
            )}

            {/* Office / WFH — WFH only when Attendance exception grants it */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Work location
                <span className="text-rose-500">*</span>
                {canChooseWfh ? (
                  <span className="ml-auto inline-flex items-center rounded-xl border border-emerald-300/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    Exception · WFH open
                  </span>
                ) : (
                  <span className="ml-auto inline-flex items-center rounded-xl border border-blue-300/80 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-200">
                    Office only
                  </span>
                )}
              </Label>

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

              <p className="text-xs text-muted-foreground">
                Office check-in requires your location within {officeGeoConfig.radiusM} m of{' '}
                {officeGeoConfig.label}.
              </p>

              <div className="grid grid-cols-12 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => void selectWorkMode('office')}
                  disabled={officeGeoStatus === 'checking' || isCheckingIn}
                  className={`${
                    canChooseWfh ? 'col-span-6' : 'col-span-12'
                  } flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all disabled:opacity-60 ${
                    workMode === 'office'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                  }`}
                >
                  <Building2 className="h-6 w-6" />
                  <span className="text-sm font-semibold">Office</span>
                  {!canChooseWfh ? (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Required unless exception granted
                    </span>
                  ) : null}
                </button>

                {canChooseWfh ? (
                  <button
                    type="button"
                    onClick={() => void selectWorkMode('wfh')}
                    disabled={officeGeoStatus === 'checking' || isCheckingIn}
                    className={`col-span-6 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      workMode === 'wfh'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300'
                    }`}
                  >
                    <Home className="h-6 w-6" />
                    <span className="text-sm font-semibold">WFH</span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Exception granted
                    </span>
                  </button>
                ) : null}
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
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                            />
                            <label
                              htmlFor={`project-${project.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-sm font-medium cursor-pointer flex-1 min-w-0 ${
                                isSelected
                                  ? 'text-blue-900 dark:text-blue-100'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {project.name}
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                {loadingProjectStats ? '...' : (projectStats[project.id]?.bugs ?? 0)} open
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {loadingProjectStats ? '...' : (projectStats[project.id]?.updates ?? 0)} approved
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
                disabled={isCheckingIn || !canConfirmCheckIn}
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
          if (!open && checkoutWizardStep === 'preview') {
            closeCheckoutWizard();
            return;
          }
          setIsCheckoutWizardOpen(open);
          if (!open) {
            setCheckoutWizardStep('form');
            clearWorkFlowUrl();
          }
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 [&>button[data-radix-dialog-close]]:hidden">
          {/* Header */}
          <div
            className={`relative overflow-visible p-6 text-white ${
              checkoutWizardStep === 'form'
                ? 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600'
                : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'
            }`}
          >
            <div className="absolute inset-0 bg-black/10" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (checkoutWizardStep === 'preview') {
                  closeCheckoutWizard();
                } else {
                  dismissCheckoutWizard();
                }
              }}
              className="absolute top-3 right-3 z-[100] rounded-lg border-2 border-white/40 bg-white/25 p-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-white/60 hover:bg-white/40 active:scale-95"
              aria-label="Close dialog"
              type="button"
            >
              <X className="h-5 w-5 text-white transition-transform duration-200 group-hover:rotate-90" strokeWidth={3} />
            </button>
            <div className="relative z-10">
              <DialogHeader className="space-y-2 pr-14 text-left">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                  <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
                    {checkoutWizardStep === 'form' ? (
                      <LogOut className="h-6 w-6" />
                    ) : (
                      <FileText className="h-6 w-6" />
                    )}
                  </div>
                  {checkoutWizardStep === 'form'
                    ? isEditing
                      ? 'Update Work Submission'
                      : 'Complete Checkout'
                    : 'Daily Work Preview'}
                </DialogTitle>
                <DialogDescription className="text-base text-white/90">
                  {checkoutWizardStep === 'form'
                    ? isEditing
                      ? 'Review and update your daily work submission.'
                      : 'Log hours to check out. Tasks and project notes are optional — Office/WFH was already set at check-in.'
                    : 'Copy or share your daily work update.'}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {checkoutWizardStep === 'form' ? (
            <>
              <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 dark:bg-gray-900/50 sm:p-6">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:items-stretch">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="checkout-work-date" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                          Work Date <span className="text-red-500">*</span>
                        </Label>
                        <div
                          id="checkout-work-date"
                          className="flex h-11 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100"
                        >
                          <Calendar className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                          <span className="truncate">{formatAttendanceDateLabel(form.submission_date)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="checkout-hours" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                          Hours Worked <span className="text-red-500">*</span>
                        </Label>
                        <HourPicker
                          value={form.hours_today}
                          onChange={(v) => setForm((p) => ({ ...p, hours_today: v }))}
                          min={1}
                          max={8}
                          step={0.25}
                          placeholder="Select hours"
                          className="h-11"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2 md:col-span-1">
                        <Label htmlFor="checkout-planned-status" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                          Planned Work Status
                        </Label>
                        <StatusDropdown
                          value={form.planned_work_status || 'not_started'}
                          onChange={(value) => setForm((p) => ({ ...p, planned_work_status: value }))}
                          placeholder="Select status"
                          className="h-11 w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                      <div className="flex items-start gap-3">
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
                        <div className="min-w-0 space-y-1">
                          <Label
                            htmlFor="checkout-request-admin-approval"
                            className="cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-200"
                          >
                            Worked more than 8 hours? Request Admin Approval
                          </Label>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Daily hours are capped at 8. Use this to request extra-hour approval.
                          </p>
                        </div>
                      </div>
                    </div>
                    {requestAdminApproval ? (
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
                        <div className="flex min-w-0 flex-col gap-2">
                          <Label htmlFor="checkout-extra-hours" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                            Requested Extra Hours
                          </Label>
                          <Input
                            id="checkout-extra-hours"
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
                            className="h-11 border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-2">
                          <Label htmlFor="checkout-approval-reason" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                            Reason for Approval
                          </Label>
                          <Input
                            id="checkout-approval-reason"
                            value={approvalReason}
                            onChange={(e) => setApprovalReason(e.target.value)}
                            placeholder="Explain why extra hours are needed..."
                            className="h-11 border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Daily Tasks */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-100 p-1.5 dark:bg-emerald-900/30">
                        <ListTodo className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Daily Tasks</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Optional — add tasks if you want them on today’s summary
                          {taskCounts.total > 0 ? (
                            <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                              · {taskCounts.total} {taskCounts.total === 1 ? 'item' : 'items'} total
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {taskCounts.total > 0 ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {taskCounts.total}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
                      <div className="flex flex-col gap-2">
                        <div className="flex min-h-5 items-center justify-between gap-2">
                          <Label htmlFor="checkout-completed" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                            Completed Tasks
                          </Label>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {taskCounts.completed}
                          </span>
                        </div>
                        <Textarea
                          id="checkout-completed"
                          value={form.completed_tasks || ''}
                          onChange={(e) => setForm((p) => ({ ...p, completed_tasks: e.target.value }))}
                          className="min-h-[120px] flex-1 resize-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                          placeholder="List completed tasks..."
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex min-h-5 items-center justify-between gap-2">
                          <Label htmlFor="checkout-pending" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                            Pending Tasks
                          </Label>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            {taskCounts.pending}
                          </span>
                        </div>
                        <Textarea
                          id="checkout-pending"
                          value={form.pending_tasks || ''}
                          onChange={(e) => setForm((p) => ({ ...p, pending_tasks: e.target.value }))}
                          className="min-h-[120px] flex-1 resize-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                          placeholder="List pending tasks..."
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex min-h-5 items-center justify-between gap-2">
                          <Label htmlFor="checkout-ongoing" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                            Ongoing Tasks
                          </Label>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {taskCounts.ongoing}
                          </span>
                        </div>
                        <Textarea
                          id="checkout-ongoing"
                          value={form.ongoing_tasks || ''}
                          onChange={(e) => setForm((p) => ({ ...p, ongoing_tasks: e.target.value }))}
                          className="min-h-[120px] flex-1 resize-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                          placeholder="List ongoing tasks..."
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex min-h-5 items-center justify-between gap-2">
                          <Label htmlFor="checkout-upcoming" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                            Upcoming Tasks
                          </Label>
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            {taskCounts.upcoming}
                          </span>
                        </div>
                        <Textarea
                          id="checkout-upcoming"
                          value={form.notes || ''}
                          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                          className="min-h-[120px] flex-1 resize-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                          placeholder="List upcoming tasks..."
                        />
                      </div>
                    </div>
                  </div>

                  <CheckoutProjectUpdatesCard
                    projects={checkoutProjects}
                    projectUpdates={projectUpdates}
                    onChange={updateProjectUpdate}
                    loading={loadingProjects && checkoutProjects.length === 0}
                  />

                  {/* Work Notes */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-lg bg-purple-100 p-1.5 dark:bg-purple-900/30">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Work Notes</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="checkout-work-notes" className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                        Additional notes about your work today
                      </Label>
                      <Textarea
                        id="checkout-work-notes"
                        value={form.planned_work_notes || ''}
                        onChange={(e) => setForm((p) => ({ ...p, planned_work_notes: e.target.value }))}
                        className="min-h-[120px] w-full resize-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                        placeholder="Additional notes about your work today..."
                      />
                    </div>
                  </div>

                  {!canSubmit ? (
                    <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                      <div className="rounded-lg bg-red-500 p-1.5 shrink-0">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">
                        Set hours worked (1–8) to complete checkout. Tasks and Office/WFH are not required here.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="border-t border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <Button
                  disabled={!canSubmit || loading}
                  onClick={() => void onSubmit({ openPreviewAfter: true })}
                  className="h-11 w-full bg-gradient-to-r from-amber-600 to-orange-600 font-semibold text-white hover:from-amber-700 hover:to-orange-700"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Submitting...
                    </span>
                  ) : isEditing ? (
                    'Update Submission'
                  ) : (
                    'Complete Checkout'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 dark:bg-gray-900/50 sm:p-6">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Submission Summary</h3>
                  <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <pre className="m-0 whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      {template || 'No preview available.'}
                    </pre>
                  </div>
                </div>
              </div>
              <DialogFooter className="border-t border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <div className="grid w-full grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => void onCopyPreview()}
                    className="h-11 w-full border-2"
                  >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void onSharePreview()}
                    className="h-11 w-full border-2"
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
