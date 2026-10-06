import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Copy,
  IndianRupee,
  Landmark,
  Loader2,
  Lock,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Unlock,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { extractApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';
import {
  onboardingService,
  type UserOnboardingDetails,
} from '@/services/onboardingService';
import { PayVerifyPendingBanner } from '@/components/attendance/PayVerifyPendingBanner';
import {
  ListPageTabTrigger,
  ListPageTabsShell,
} from '@/components/layout/list-page/ListPageTabsShell';
import {
  addMonthAdjustment,
  adminLockMonth,
  adminVerifyWeek,
  adjustmentTypeLabel,
  canShiftYearMonth,
  clampYearMonth,
  defaultPayVerifyYearMonth,
  deleteHourlyRate,
  deleteMonthAdjustment,
  employeeVerifyMonth,
  employeeVerifyWeek,
  fetchPayVerifyMonth,
  fetchPayVerifyUserProjects,
  fetchRateHistory,
  formatHours,
  formatInr,
  formatYearMonthLabel,
  employeeMonthVerifyLabel,
  adminMonthVerifyLabel,
  employeeWeekVerifyLabel,
  adminWeekVerifyLabel,
  canVerifyMonthPeriod,
  canVerifyWeekPeriod,
  payVerifyPeriodHint,
  payVerifyPeriodState,
  seedPayVerifyRates,
  seedSeptemberAdjustments,
  setHourlyRate,
  shiftYearMonth,
  type PayVerifyAdjustment,
  type PayVerifyAdjustmentType,
  type PayVerifyIncentiveProject,
  type PayVerifyMonthResponse,
  type PayVerifyRateHistoryItem,
  type PayVerifyRoleFilter,
  type PayVerifyRosterEntry,
  type PayVerifyWeek,
} from '@/services/payVerifyService';

type PayStatusFilter = 'all' | 'pending' | 'completed' | 'paid';

type NoteAction =
  | { kind: 'emp-week'; entry: PayVerifyRosterEntry; week: PayVerifyWeek; status: 'verified' | 'correction_needed' }
  | { kind: 'admin-week'; entry: PayVerifyRosterEntry; week: PayVerifyWeek; status: 'approved' | 'correction_requested' }
  | { kind: 'emp-month'; entry: PayVerifyRosterEntry; status: 'verified' | 'correction_needed' }
  | { kind: 'admin-month'; entry: PayVerifyRosterEntry; action: 'lock' | 'unlock' | 'correction_requested' }
  | { kind: 'rate'; entry: PayVerifyRosterEntry }
  | { kind: 'adjustment'; entry: PayVerifyRosterEntry };

function entryPayStatus(entry: PayVerifyRosterEntry): Exclude<PayStatusFilter, 'all'> {
  const m = entry.month;
  if (m.admin_status === 'approved') return 'paid';
  if (m.employee_status === 'verified') return 'completed';
  return 'pending';
}

function shortWeek(weekStart: string, weekEnd: string): string {
  const s = new Date(`${weekStart}T12:00:00`);
  const e = new Date(`${weekEnd}T12:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function monthTitle(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatRateDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

type Tone = 'ok' | 'warn' | 'info' | 'muted' | 'danger';

function statusTone(label: string): Tone {
  const l = label.toLowerCase();
  if (
    l === 'paid' ||
    l === 'done' ||
    l === 'verified' ||
    l === 'approved' ||
    l.includes('locked')
  ) {
    return 'ok';
  }
  if (l === 'correction' || l.includes('correction')) return 'warn';
  if (
    l === 'completed' ||
    l === 'ready to pay' ||
    l === 'reviewed' ||
    l === 'awaiting' ||
    l.includes('awaiting')
  ) {
    return 'info';
  }
  if (l === 'pending') return 'muted';
  return 'muted';
}

const TONE_CLASS: Record<Tone, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  warn: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  muted: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
};

function StatusPill({ label, className }: { label: string; className?: string }) {
  const tone = statusTone(label);
  const lower = label.toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        TONE_CLASS[tone],
        className
      )}
    >
      {tone === 'ok' ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
      ) : tone === 'muted' && lower === 'pending' ? (
        <CircleDashed className="h-3 w-3 shrink-0" aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

function VerifyRoleBadges({
  userLabel,
  adminLabel,
  align = 'end',
}: {
  userLabel: string;
  adminLabel: string;
  align?: 'start' | 'end';
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5',
        align === 'end' ? 'justify-end' : 'justify-start'
      )}
    >
      <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          User
        </span>
        <StatusPill label={userLabel} className="border-0 bg-transparent px-1.5 py-0" />
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Admin
        </span>
        <StatusPill label={adminLabel} className="border-0 bg-transparent px-1.5 py-0" />
      </div>
    </div>
  );
}

function weekDotTone(week: PayVerifyWeek): string {
  if (week.admin_status === 'approved') return 'bg-emerald-500';
  if (week.admin_status === 'correction_requested' || week.employee_status === 'correction_needed') {
    return 'bg-amber-500';
  }
  if (week.employee_status === 'verified') return 'bg-sky-500';
  return 'bg-gray-400 dark:bg-gray-500';
}

type BankDetailsView = Pick<
  UserOnboardingDetails,
  | 'account_holder_name'
  | 'bank_name'
  | 'account_number'
  | 'ifsc_code'
  | 'branch_name'
  | 'account_type'
  | 'upi_id'
  | 'upi_linked_phone'
>;

function pickBankDetails(details: UserOnboardingDetails | null | undefined): BankDetailsView | null {
  if (!details) return null;
  const hasAny = [
    details.account_holder_name,
    details.bank_name,
    details.account_number,
    details.ifsc_code,
    details.branch_name,
    details.account_type,
    details.upi_id,
    details.upi_linked_phone,
  ].some((v) => String(v || '').trim());
  if (!hasAny) return null;
  return {
    account_holder_name: details.account_holder_name ?? null,
    bank_name: details.bank_name ?? null,
    account_number: details.account_number ?? null,
    ifsc_code: details.ifsc_code ?? null,
    branch_name: details.branch_name ?? null,
    account_type: details.account_type ?? null,
    upi_id: details.upi_id ?? null,
    upi_linked_phone: details.upi_linked_phone ?? null,
  };
}

function BankDetailRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = String(value || '').trim();
  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  return (
    <div className="col-span-12 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:col-span-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              'mt-0.5 break-all text-sm font-medium text-foreground',
              mono && 'font-mono tabular-nums tracking-wide'
            )}
          >
            {text}
          </p>
        </div>
        {copyable ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-xl p-0"
            title={`Copy ${label}`}
            onClick={() => void copy()}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RosterCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white/80 p-5 dark:border-gray-700/60 dark:bg-gray-900/80 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40 rounded-xl" />
          <Skeleton className="h-3 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-7 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-12 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="col-span-4 h-16 rounded-xl md:col-span-2" />
        ))}
      </div>
      <Skeleton className="mt-4 h-24 w-full rounded-xl" />
    </div>
  );
}

export default function PayVerify() {
  const { currentUser: user } = useAuth();
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();

  const month = searchParams.get('month') || defaultPayVerifyYearMonth();
  const role = (searchParams.get('role') as PayVerifyRoleFilter) || (isAdmin ? 'all' : 'mine');
  const statusParam = (searchParams.get('status') || 'pending').toLowerCase();
  const statusFilter: PayStatusFilter =
    statusParam === 'pending' || statusParam === 'completed' || statusParam === 'paid'
      ? statusParam
      : statusParam === 'all'
        ? 'all'
        : 'pending';

  const [data, setData] = useState<PayVerifyMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteAction, setNoteAction] = useState<NoteAction | null>(null);
  const [note, setNote] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [rateEffectiveFrom, setRateEffectiveFrom] = useState('');
  const [rateHistory, setRateHistory] = useState<PayVerifyRateHistoryItem[]>([]);
  const [rateHistoryLoading, setRateHistoryLoading] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjType, setAdjType] = useState<PayVerifyAdjustmentType>('advance');
  const [adjProjectId, setAdjProjectId] = useState('');
  const [adjProjects, setAdjProjects] = useState<PayVerifyIncentiveProject[]>([]);
  const [adjProjectsLoading, setAdjProjectsLoading] = useState(false);
  const [adjProjectsError, setAdjProjectsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [adjustmentToDelete, setAdjustmentToDelete] = useState<PayVerifyAdjustment | null>(null);
  const [rateToDelete, setRateToDelete] = useState<PayVerifyRateHistoryItem | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [bankEntry, setBankEntry] = useState<PayVerifyRosterEntry | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetailsView | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const setMonth = (ym: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('month', ym);
    setSearchParams(next, { replace: true });
  };

  const monthBounds = data?.month_bounds ?? null;
  const canGoPrev = monthBounds ? canShiftYearMonth(month, -1, monthBounds) : true;
  const canGoNext = monthBounds ? canShiftYearMonth(month, 1, monthBounds) : true;

  const setRole = (r: PayVerifyRoleFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('role', r);
    setSearchParams(next, { replace: true });
  };

  const setStatusFilter = (s: PayStatusFilter) => {
    const next = new URLSearchParams(searchParams);
    if (s === 'all') next.delete('status');
    else next.set('status', s);
    setSearchParams(next, { replace: true });
  };

  // Why: First visit should land on salary month (previous completed) + Pending tab.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let dirty = false;
    if (!searchParams.get('month')) {
      next.set('month', defaultPayVerifyYearMonth());
      dirty = true;
    }
    if (!searchParams.get('status')) {
      next.set('status', 'pending');
      dirty = true;
    }
    if (dirty) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for URL defaults
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPayVerifyMonth(month, role);
      setData(res);
    } catch (e) {
      setError(extractApiErrorMessage(e) || 'Failed to load pay verify');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, role]);

  useEffect(() => {
    void load();
  }, [load]);

  // Why: if URL month is outside joining→today, snap to the clamped API month.
  useEffect(() => {
    if (!data?.month_bounds) return;
    const clamped = clampYearMonth(month, data.month_bounds);
    if (clamped !== month || (data.month && data.month !== month)) {
      const target = data.month || clamped;
      if (target !== month) setMonth(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when API bounds/month arrive
  }, [data?.month, data?.month_bounds?.min, data?.month_bounds?.max]);

  const filteredRoster = useMemo(() => {
    if (!data?.roster) return [];
    const q = search.trim().toLowerCase();
    return data.roster.filter((e) => {
      if (statusFilter !== 'all' && entryPayStatus(e) !== statusFilter) return false;
      if (!q) return true;
      const hay = `${e.user.name} ${e.user.username}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const roster = data?.roster ?? [];
    const counts = { all: roster.length, pending: 0, completed: 0, paid: 0 };
    for (const e of roster) {
      counts[entryPayStatus(e)] += 1;
    }
    return counts;
  }, [data]);

  const pipeline = useMemo(() => {
    const roster = data?.roster ?? [];
    let pendingEmp = 0;
    let awaitingAdmin = 0;
    let locked = 0;
    let corrections = 0;
    for (const e of roster) {
      const m = e.month;
      if (m.admin_status === 'approved') locked += 1;
      else if (
        m.employee_status === 'correction_needed' ||
        m.admin_status === 'correction_requested' ||
        e.weeks.some(
          (w) =>
            w.employee_status === 'correction_needed' || w.admin_status === 'correction_requested'
        )
      ) {
        corrections += 1;
      } else if (m.employee_status === 'verified') awaitingAdmin += 1;
      else pendingEmp += 1;
    }
    return { pendingEmp, awaitingAdmin, locked, corrections, people: roster.length };
  }, [data]);

  const closeNote = () => {
    setNoteAction(null);
    setNote('');
    setRateValue('');
    setRateEffectiveFrom('');
    setRateHistory([]);
    setRateHistoryLoading(false);
    setEditingRateId(null);
    setRateToDelete(null);
    setAdjAmount('');
    setAdjReason('');
    setAdjType('advance');
    setAdjProjectId('');
    setAdjProjects([]);
    setAdjProjectsLoading(false);
    setAdjProjectsError(null);
  };

  const openAdjustment = async (entry: PayVerifyRosterEntry) => {
    setAdjAmount('');
    setAdjReason('');
    setAdjType('advance');
    setAdjProjectId('');
    setAdjProjects([]);
    setAdjProjectsError(null);
    setNoteAction({ kind: 'adjustment', entry });
    setAdjProjectsLoading(true);
    try {
      const projects = await fetchPayVerifyUserProjects(entry.user.id);
      setAdjProjects(projects);
    } catch (e) {
      setAdjProjects([]);
      setAdjProjectsError(extractApiErrorMessage(e) || 'Could not load projects');
    } finally {
      setAdjProjectsLoading(false);
    }
  };

  const loadRateIntoForm = (row: PayVerifyRateHistoryItem) => {
    setEditingRateId(row.id);
    setRateValue(String(row.hourly_rate));
    setRateEffectiveFrom(row.effective_from);
    setNote(row.note || '');
  };

  const resetRateFormForNew = (entry: PayVerifyRosterEntry) => {
    const current = Number(
      entry.rate_info?.current_rate ?? entry.month.hourly_rate_used ?? entry.month.hourly_rate ?? 0
    );
    setEditingRateId(null);
    setRateValue(current > 0 ? String(current) : '');
    setNote('');
    setRateEffectiveFrom(data?.period_start || `${month}-01`);
  };

  const openSalaryHike = async (entry: PayVerifyRosterEntry) => {
    resetRateFormForNew(entry);
    setNoteAction({ kind: 'rate', entry });
    setRateHistoryLoading(true);
    try {
      const res = await fetchRateHistory(entry.user.id, data?.period_end);
      setRateHistory(res.history ?? []);
    } catch (e) {
      toast({
        title: extractApiErrorMessage(e) || 'Could not load hike history',
        variant: 'destructive',
      });
      setRateHistory([]);
    } finally {
      setRateHistoryLoading(false);
    }
  };

  const closeBankDetails = () => {
    setBankEntry(null);
    setBankDetails(null);
    setBankError(null);
    setBankLoading(false);
  };

  const openBankDetails = async (entry: PayVerifyRosterEntry) => {
    setBankEntry(entry);
    setBankDetails(null);
    setBankError(null);
    setBankLoading(true);
    try {
      const res = await onboardingService.get(entry.user.id);
      setBankDetails(pickBankDetails(res?.details ?? null));
    } catch (e) {
      setBankError(extractApiErrorMessage(e) || 'Could not load bank details');
      setBankDetails(null);
    } finally {
      setBankLoading(false);
    }
  };

  const submitNoteAction = async () => {
    if (!noteAction) return;
    setBusy(true);
    try {
      if (noteAction.kind === 'emp-week') {
        if (noteAction.status === 'correction_needed' && !note.trim()) {
          toast({ title: 'Note required', variant: 'destructive' });
          return;
        }
        await employeeVerifyWeek({
          user_id: noteAction.entry.user.id,
          week_start: noteAction.week.week_start,
          status: noteAction.status,
          note: note.trim() || undefined,
        });
        toast({
          title: noteAction.status === 'verified' ? 'Week verified' : 'Correction flagged',
        });
      } else if (noteAction.kind === 'admin-week') {
        if (noteAction.status === 'correction_requested' && !note.trim()) {
          toast({ title: 'Note required', variant: 'destructive' });
          return;
        }
        await adminVerifyWeek({
          user_id: noteAction.entry.user.id,
          week_start: noteAction.week.week_start,
          status: noteAction.status,
          note: note.trim() || undefined,
        });
        toast({
          title: noteAction.status === 'approved' ? 'Week approved' : 'Correction requested',
        });
      } else if (noteAction.kind === 'emp-month') {
        if (noteAction.status === 'correction_needed' && !note.trim()) {
          toast({ title: 'Note required', variant: 'destructive' });
          return;
        }
        await employeeVerifyMonth({
          user_id: noteAction.entry.user.id,
          month,
          status: noteAction.status,
          note: note.trim() || undefined,
        });
        toast({
          title:
            noteAction.status === 'verified'
              ? isAdmin
                ? 'Month verified (weeks auto-completed)'
                : 'Month verified'
              : 'Month correction flagged',
        });
      } else if (noteAction.kind === 'admin-month') {
        if (noteAction.action === 'correction_requested' && !note.trim()) {
          toast({ title: 'Note required', variant: 'destructive' });
          return;
        }
        await adminLockMonth({
          user_id: noteAction.entry.user.id,
          month,
          action: noteAction.action,
          note: note.trim() || undefined,
        });
        toast({
          title:
            noteAction.action === 'lock'
              ? 'Marked as paid'
              : noteAction.action === 'unlock'
                ? 'Marked unpaid'
                : 'Correction requested',
        });
      } else if (noteAction.kind === 'rate') {
        const rate = Number(rateValue);
        if (!Number.isFinite(rate) || rate < 0) {
          toast({ title: 'Enter a valid hourly rate', variant: 'destructive' });
          return;
        }
        if (!rateEffectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(rateEffectiveFrom)) {
          toast({ title: 'Pick an effective date', variant: 'destructive' });
          return;
        }
        const wasEdit = Boolean(editingRateId);
        const saved = await setHourlyRate({
          user_id: noteAction.entry.user.id,
          hourly_rate: rate,
          effective_from: rateEffectiveFrom,
          note: note.trim() || undefined,
        });
        if (saved.history) {
          setRateHistory(saved.history);
        } else {
          const res = await fetchRateHistory(noteAction.entry.user.id, data?.period_end);
          setRateHistory(res.history ?? []);
        }
        const updatedEntry: PayVerifyRosterEntry = {
          ...noteAction.entry,
          rate_info: {
            ...(noteAction.entry.rate_info || {}),
            current_rate: saved.hourly_rate,
            effective_from: saved.effective_from,
            previous_rate: saved.previous_rate ?? noteAction.entry.rate_info?.previous_rate,
            note: note.trim() || null,
          },
          month: {
            ...noteAction.entry.month,
            hourly_rate_used: saved.hourly_rate,
            hourly_rate: saved.hourly_rate,
          },
        };
        setNoteAction({ kind: 'rate', entry: updatedEntry });
        resetRateFormForNew(updatedEntry);
        const hike =
          saved.hike_pct != null
            ? ` (${saved.hike_pct > 0 ? '+' : ''}${saved.hike_pct}%)`
            : '';
        toast({
          title: wasEdit
            ? `Hike updated · ₹${saved.hourly_rate}/h from ${formatRateDate(saved.effective_from)}${hike}`
            : `Hike saved · ₹${saved.hourly_rate}/h from ${formatRateDate(saved.effective_from)}${hike}`,
        });
        notifyAdminNavCountsChanged();
        await load();
        return;
      } else if (noteAction.kind === 'adjustment') {
        const amount = Number(adjAmount);
        const isIncentive = adjType === 'project_incentive';
        if (!Number.isFinite(amount) || amount === 0) {
          toast({ title: 'Enter a valid amount', variant: 'destructive' });
          return;
        }
        if (isIncentive && !adjProjectId) {
          toast({ title: 'Select a project for this incentive', variant: 'destructive' });
          return;
        }
        if (!isIncentive && !adjReason.trim()) {
          toast({ title: 'Amount and reason required', variant: 'destructive' });
          return;
        }
        const projectName =
          adjProjects.find((p) => p.id === adjProjectId)?.name?.trim() || '';
        await addMonthAdjustment({
          user_id: noteAction.entry.user.id,
          month,
          type: adjType,
          amount: Math.abs(amount),
          reason: adjReason.trim(),
          project_id: isIncentive ? adjProjectId : undefined,
        });
        toast({
          title: isIncentive
            ? `Project incentive added${projectName ? ` · ${projectName}` : ''}`
            : 'Adjustment added',
        });
      }
      notifyAdminNavCountsChanged();
      closeNote();
      await load();
    } catch (e) {
      toast({
        title: 'Action failed',
        description: extractApiErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const runSeedRates = async () => {
    setBusy(true);
    try {
      const res = await seedPayVerifyRates();
      toast({ title: `Seeded ${res.inserted} hourly rates` });
      await load();
    } catch (e) {
      toast({ title: 'Seed failed', description: extractApiErrorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const runSeedSeptAdj = async () => {
    setBusy(true);
    try {
      const res = await seedSeptemberAdjustments();
      toast({ title: `Seeded ${res.added} September adjustments` });
      await load();
    } catch (e) {
      toast({ title: 'Seed failed', description: extractApiErrorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const isSelf = (entry: PayVerifyRosterEntry) => entry.user.id === user?.id;

  const roleTabs: { value: PayVerifyRoleFilter; label: string; icon: typeof Users }[] = isAdmin
    ? [
        { value: 'all', label: 'All roles', icon: Users },
        { value: 'developer', label: 'Developers', icon: Users },
        { value: 'creator', label: 'Creators', icon: Users },
        { value: 'codo_tester', label: 'CODO testers', icon: ShieldCheck },
      ]
    : [];

  const statusTabs: {
    value: PayStatusFilter;
    label: string;
    icon: typeof CircleDashed;
    count: number;
  }[] = [
    { value: 'all', label: 'All', icon: Users, count: statusCounts.all },
    { value: 'pending', label: 'Pending', icon: CircleDashed, count: statusCounts.pending },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, count: statusCounts.completed },
    { value: 'paid', label: 'Paid', icon: Lock, count: statusCounts.paid },
  ];

  return (
    <div className="min-w-0 w-full space-y-6 overflow-x-hidden sm:space-y-8">
      <PayVerifyPendingBanner />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-transparent to-teal-50/50 dark:from-emerald-950/20 dark:via-transparent dark:to-teal-950/20" />
        <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 p-5 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80 sm:p-8">
          <div className="grid grid-cols-12 gap-4 lg:gap-6 lg:items-center">
            <div className="col-span-12 min-w-0 space-y-3 lg:col-span-7">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 shadow-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80 dark:text-emerald-300/80">
                    CODO · Attendance
                  </p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text dark:from-white dark:via-gray-100 dark:to-gray-300 sm:text-4xl">
                    Pay Verify
                  </h1>
                  <div className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" />
                  <p className="mt-3 max-w-2xl text-sm font-medium text-muted-foreground sm:text-base">
                    Confirm weekly hours,
                    {data?.period_label ? ` · ${data.period_label}` : ''}.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:col-span-5">
              <div className="inline-flex flex-col gap-1">
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2.5 shadow-sm dark:border-emerald-800 dark:from-emerald-950/30 dark:to-teal-950/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl"
                    disabled={!canGoPrev || loading}
                    onClick={() => {
                      if (!canGoPrev) return;
                      setMonth(shiftYearMonth(month, -1));
                    }}
                    aria-label="Previous month"
                    title={
                      canGoPrev
                        ? 'Previous month'
                        : monthBounds
                          ? `Earliest: ${formatYearMonthLabel(monthBounds.min)} (joining)`
                          : 'Previous month'
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[7.5rem] text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
                      Period
                    </p>
                    <p className="text-sm font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
                      {monthTitle(month)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl"
                    disabled={!canGoNext || loading}
                    onClick={() => {
                      if (!canGoNext) return;
                      setMonth(shiftYearMonth(month, 1));
                    }}
                    aria-label="Next month"
                    title={
                      canGoNext
                        ? 'Next month'
                        : monthBounds
                          ? `Latest: ${formatYearMonthLabel(monthBounds.max)} (current month)`
                          : 'Next month'
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {monthBounds ? (
                  <p className="px-1 text-center text-[10px] text-muted-foreground sm:text-left"></p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline legend */}
      <div className="rounded-2xl border border-gray-200/50 bg-white/70 p-4 dark:border-gray-700/50 dark:bg-gray-900/70 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Payment status</p>
          <p className="text-xs text-muted-foreground">Pending → Completed → Paid</p>
        </div>
        <div className="grid grid-cols-12 gap-3">
          {[
            { label: 'People', value: pipeline.people, icon: Users, tone: 'from-slate-500 to-slate-600' },
            { label: 'Pending', value: pipeline.pendingEmp, icon: CircleDashed, tone: 'from-gray-500 to-gray-600' },
            { label: 'Completed', value: pipeline.awaitingAdmin, icon: CheckCircle2, tone: 'from-sky-500 to-blue-600' },
            { label: 'Corrections', value: pipeline.corrections, icon: AlertTriangle, tone: 'from-amber-500 to-orange-600' },
            { label: 'Paid', value: pipeline.locked, icon: Lock, tone: 'from-emerald-500 to-teal-600' },
          ].map((item) => (
            <div
              key={item.label}
              className="col-span-6 rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 dark:border-gray-700/70 dark:bg-gray-800/40 sm:col-span-4 lg:col-span-2 lg:last:col-span-4"
            >
              <div className="flex items-center gap-2">
                <div className={cn('rounded-lg bg-gradient-to-br p-1.5 text-white shadow-sm', item.tone)}>
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{item.value}</p>
            </div>
          ))}
          <div className="col-span-6 rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 dark:border-emerald-800/70 dark:from-emerald-950/30 dark:to-teal-950/30 sm:col-span-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 text-white shadow-sm">
                <IndianRupee className="h-3.5 w-3.5" />
              </div>
              <p className="text-[11px] font-medium text-emerald-800/80 dark:text-emerald-200/80">Net estimate</p>
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
              {data ? formatInr(data.totals.net) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Totals strip */}
      {data && (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {[
            { label: 'Total hours', value: formatHours(data.totals.hours), icon: Calendar, hint: 'Leave-credited period hours' },
            { label: 'Gross', value: formatInr(data.totals.gross), icon: Banknote, hint: 'Hours × rate' },
            { label: 'Adjustments', value: formatInr(data.totals.adjustments), icon: Pencil, hint: 'Advances / deductions / credits' },
            { label: 'Net pay estimate', value: formatInr(data.totals.net), icon: IndianRupee, hint: 'Gross + adjustments' },
          ].map((card) => (
            <div
              key={card.label}
              className="col-span-6 rounded-2xl border border-gray-200/60 bg-white/80 p-4 dark:border-gray-700/60 dark:bg-gray-900/80 md:col-span-3"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <card.icon className="h-3.5 w-3.5" />
                {card.label}
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{card.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{card.hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-50/50 to-emerald-50/40 dark:from-gray-800/40 dark:to-emerald-950/20" />
        <div className="relative flex flex-col gap-4 rounded-2xl border border-gray-200/50 bg-white/70 p-3 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70 sm:gap-5 sm:p-4">
          {/* Payment status */}
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Payment status
            </p>
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PayStatusFilter)}
            >
              <ListPageTabsShell
                columns={4}
                underlayClassName="from-emerald-50/40 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10"
              >
                {statusTabs.map((tab) => (
                  <ListPageTabTrigger
                    key={tab.value}
                    value={tab.value}
                    className="min-w-0 gap-1.5 data-[state=active]:border-emerald-200 data-[state=active]:text-emerald-800 dark:data-[state=active]:border-emerald-800 dark:data-[state=active]:text-emerald-200"
                  >
                    <tab.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{tab.label}</span>
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-lg px-1.5 text-[10px] font-bold tabular-nums',
                        statusFilter === tab.value
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {tab.count}
                    </span>
                  </ListPageTabTrigger>
                ))}
              </ListPageTabsShell>
            </Tabs>
          </div>

          {/* Team (admin) */}
          {isAdmin && roleTabs.length > 0 ? (
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Team
              </p>
              <Tabs value={role} onValueChange={(v) => setRole(v as PayVerifyRoleFilter)}>
                <ListPageTabsShell
                  columns={4}
                  underlayClassName="from-slate-50/50 to-gray-50/40 dark:from-gray-800/40 dark:to-slate-900/20"
                >
                  {roleTabs.map((tab) => (
                    <ListPageTabTrigger
                      key={tab.value}
                      value={tab.value}
                      className="min-w-0 gap-1.5"
                    >
                      <tab.icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{tab.label}</span>
                    </ListPageTabTrigger>
                  ))}
                </ListPageTabsShell>
              </Tabs>
            </div>
          ) : null}

          <div className="grid grid-cols-12 items-center gap-3">
            <div className="relative col-span-12 min-w-0 lg:col-span-9">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value.slice(0, 80))}
                placeholder="Search by name or username…"
                className="h-11 rounded-xl border-2 pl-9"
                maxLength={80}
              />
            </div>
            {isAdmin ? (
              <div className="col-span-12 flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  disabled={busy}
                  onClick={() => void runSeedRates()}
                >
                  Seed rates
                </Button>
                {month === '2026-09' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    disabled={busy}
                    onClick={() => void runSeedSeptAdj()}
                  >
                    Seed Sep adj.
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-12 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="col-span-12 xl:col-span-6">
              <RosterCardSkeleton />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 dark:border-rose-900/50 dark:bg-rose-950/30 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-rose-800 dark:text-rose-200">Couldn’t load Pay Verify</h2>
              <p className="mt-1 text-sm text-rose-700/90 dark:text-rose-300/90">{error}</p>
              <p className="mt-2 text-xs text-rose-600/80 dark:text-rose-400/80">
                If this persists after a backend deploy, ask an admin to confirm migration 123 tables exist.
              </p>
              <Button
                type="button"
                className="mt-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">No people in this view</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {search.trim()
              ? 'No names match your search. Clear the filter or try another month.'
              : statusFilter !== 'all'
                ? `No ${statusFilter} people in this view for the selected month.`
                : 'There are no roster members for this filter in the selected month.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {filteredRoster.map((entry) => {
            const m = entry.month;
            const rate = Number(
              entry.rate_info?.current_rate ?? m.hourly_rate_used ?? m.hourly_rate ?? 0
            );
            const rateSince = entry.rate_info?.effective_from ?? null;
            const prevRate = entry.rate_info?.previous_rate ?? null;
            const self = isSelf(entry);
            const monthLocked = m.admin_status === 'approved';
            const displayName = entry.user.name || entry.user.username;
            const open = expandedId === entry.user.id;
            const weeksUserDone = entry.weeks.filter((w) => w.employee_status === 'verified').length;
            const weeksAdminDone = entry.weeks.filter((w) => w.admin_status === 'approved').length;
            const userMonthLabel = employeeMonthVerifyLabel(m);
            const adminMonthLabel = adminMonthVerifyLabel(m);
            const monthPeriodStart = String(m.period_start || data?.period_start || `${month}-01`);
            const monthPeriodEnd = String(m.period_end || data?.period_end || `${month}-28`);
            const monthCompletable = canVerifyMonthPeriod(monthPeriodStart, monthPeriodEnd);
            const monthPeriodState = payVerifyPeriodState(monthPeriodStart, monthPeriodEnd);
            const monthPeriodHint = payVerifyPeriodHint(monthPeriodState, monthPeriodEnd);

            return (
              <article
                key={entry.user.id}
                className="col-span-12 flex flex-col gap-4 rounded-2xl border border-gray-200/60 bg-white/85 p-4 shadow-sm dark:border-gray-700/60 dark:bg-gray-900/85 sm:p-5 xl:col-span-6"
              >
                {/* Card header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-sm font-bold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                      {initials(displayName)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
                        {displayName}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        @{entry.user.username} · {entry.user.role_bucket.replace(/_/g, ' ')}
                        {self ? ' · you' : ''}
                      </p>
                    </div>
                  </div>
                  <VerifyRoleBadges userLabel={userMonthLabel} adminLabel={adminMonthLabel} />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-12 gap-2">
                  {[
                    { label: 'Hours', value: formatHours(m.total_hours), hint: null as string | null },
                    { label: 'Days', value: String(m.worked_days ?? 0), hint: null },
                    { label: 'Leave', value: `${m.leave_days ?? 0}d`, hint: null },
                    { label: 'OT', value: formatHours(m.ot_hours), hint: null },
                    {
                      label: 'Rate',
                      value: rate > 0 ? `₹${rate}/h` : '—',
                      hint: rateSince
                        ? `since ${formatRateDate(rateSince)}`
                        : prevRate != null
                          ? `was ₹${prevRate}/h`
                          : null,
                    },
                    { label: 'Net', value: formatInr(m.net_estimate), hint: null },
                  ].map((cell) => (
                    <div
                      key={cell.label}
                      className="col-span-4 rounded-xl border border-gray-100 bg-gray-50/90 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-800/50 sm:col-span-2"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {cell.label}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">
                        {cell.value}
                      </p>
                      {cell.hint ? (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{cell.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {/* Week timeline */}
                <div className="rounded-xl border border-gray-200/70 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Weeks in {monthTitle(month)}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                        User {weeksUserDone}/{entry.weeks.length} verified
                        <span className="mx-1.5 text-border">·</span>
                        Admin {weeksAdminDone}/{entry.weeks.length} approved
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-xl px-2 text-xs"
                      onClick={() =>
                        setExpandedId((id) => (id === entry.user.id ? null : entry.user.id))
                      }
                    >
                      {open ? 'Collapse' : 'Details'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.weeks.map((week) => (
                      <div
                        key={week.week_start}
                        title={`${shortWeek(week.week_start, week.week_end)} · User ${employeeWeekVerifyLabel(week)} · Admin ${adminWeekVerifyLabel(week)}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-1 text-[11px] dark:border-gray-700 dark:bg-gray-900"
                      >
                        <span className={cn('h-2 w-2 rounded-full', weekDotTone(week))} />
                        <span className="font-medium tabular-nums">{formatHours(week.worked_hours)}</span>
                      </div>
                    ))}
                  </div>

                  {open && (
                    <div className="mt-3 flex flex-col gap-2">
                      {entry.weeks.map((week) => {
                        const periodState = payVerifyPeriodState(week.week_start, week.week_end);
                        const weekCompletable = canVerifyWeekPeriod(week);
                        const needsCorrection =
                          week.employee_status === 'correction_needed' ||
                          week.admin_status === 'correction_requested';
                        const correctionNote =
                          (week.admin_status === 'correction_requested'
                            ? week.admin_note
                            : week.employee_note) ||
                          week.employee_note ||
                          week.admin_note ||
                          null;
                        const periodHint = needsCorrection
                          ? week.admin_status === 'correction_requested'
                            ? 'Admin requested a fix — re-verify after updating attendance'
                            : 'Flagged for correction — fix attendance, then re-verify'
                          : payVerifyPeriodHint(periodState, week.week_end);
                        return (
                          <div
                            key={week.week_start}
                            className={cn(
                              'flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                              needsCorrection
                                ? 'border-amber-300/80 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/25'
                                : periodState === 'upcoming'
                                  ? 'border-dashed border-gray-200/80 bg-muted/20 dark:border-gray-700'
                                  : periodState === 'in_progress'
                                    ? 'border-sky-200/80 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20'
                                    : 'border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-900/80'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {shortWeek(week.week_start, week.week_end)}
                                </p>
                                {needsCorrection ? (
                                  <span className="rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                                    Correction
                                  </span>
                                ) : periodState !== 'completed' ? (
                                  <span
                                    className={cn(
                                      'rounded-lg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                      periodState === 'in_progress'
                                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
                                        : 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {periodState === 'in_progress' ? 'In progress' : 'Upcoming'}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatHours(week.worked_hours)} worked · leave {week.leave_days ?? 0}d · OT{' '}
                                {formatHours(week.ot_hours)}
                              </p>
                              <p
                                className={cn(
                                  'mt-0.5 text-[11px]',
                                  needsCorrection
                                    ? 'font-medium text-amber-800 dark:text-amber-200'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {periodHint}
                              </p>
                              {correctionNote ? (
                                <p className="mt-1 line-clamp-3 text-[11px] text-amber-900/90 dark:text-amber-100/90">
                                  Note: {correctionNote}
                                </p>
                              ) : null}
                              <div className="mt-1.5">
                                <VerifyRoleBadges
                                  userLabel={employeeWeekVerifyLabel(week)}
                                  adminLabel={adminWeekVerifyLabel(week)}
                                  align="start"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {!weekCompletable ? (
                                <span className="text-[11px] text-muted-foreground">
                                  {periodState === 'upcoming'
                                    ? 'Available after this week starts and ends'
                                    : 'Verify after the week ends'}
                                </span>
                              ) : null}
                              {weekCompletable &&
                                (self || isAdmin) &&
                                week.employee_status !== 'verified' &&
                                week.admin_status !== 'approved' && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                                      disabled={busy || monthLocked}
                                      onClick={() =>
                                        setNoteAction({
                                          kind: 'emp-week',
                                          entry,
                                          week,
                                          status: 'verified',
                                        })
                                      }
                                    >
                                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                      User verify
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-xl"
                                      disabled={busy || monthLocked}
                                      onClick={() =>
                                        setNoteAction({
                                          kind: 'emp-week',
                                          entry,
                                          week,
                                          status: 'correction_needed',
                                        })
                                      }
                                    >
                                      User correction
                                    </Button>
                                  </>
                                )}
                              {weekCompletable &&
                                isAdmin &&
                                week.employee_status === 'verified' &&
                                week.admin_status !== 'approved' && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 rounded-xl"
                                      disabled={busy}
                                      onClick={() =>
                                        setNoteAction({
                                          kind: 'admin-week',
                                          entry,
                                          week,
                                          status: 'approved',
                                        })
                                      }
                                    >
                                      Admin approve
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-xl"
                                      disabled={busy}
                                      onClick={() =>
                                        setNoteAction({
                                          kind: 'admin-week',
                                          entry,
                                          week,
                                          status: 'correction_requested',
                                        })
                                      }
                                    >
                                      Admin fix
                                    </Button>
                                  </>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Adjustments */}
                {(m.adjustments?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="mb-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Adjustments
                    </p>
                    <div className="flex flex-col gap-2">
                      {m.adjustments!.map((adj) => {
                        const isIncentive = adj.type === 'project_incentive';
                        const title = isIncentive
                          ? `Project incentive${adj.project_name ? ` · ${adj.project_name}` : ''}`
                          : adjustmentTypeLabel(adj.type);
                        const note = isIncentive
                          ? (adj.reason || '').includes(' — ')
                            ? (adj.reason || '').split(' — ').slice(1).join(' — ').trim()
                            : ''
                          : adj.reason || '';
                        return (
                          <div
                            key={adj.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="min-w-0 truncate text-muted-foreground">
                              <span className="font-medium text-foreground">{title}</span>
                              {note ? (
                                <>
                                  {': '}
                                  {note}
                                </>
                              ) : null}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="font-semibold tabular-nums">
                                {formatInr(adj.amount)}
                              </span>
                              {isAdmin && !monthLocked && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 rounded-xl px-2"
                                  disabled={busy}
                                  onClick={() => setAdjustmentToDelete(adj)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Salary math */}
                <div className="rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 px-3 py-2.5 text-xs dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/20">
                  <span className="font-medium text-foreground">
                    {formatHours(m.total_hours)}
                    {rate > 0 ? ` × ₹${rate}` : ' × (no rate)'}
                  </span>
                  <span className="text-muted-foreground"> = {formatInr(m.gross_estimate)}</span>
                  {Number(m.adjustments_total) !== 0 && (
                    <span className="text-muted-foreground">
                      {' '}
                      {Number(m.adjustments_total) > 0 ? '+' : '−'}{' '}
                      {formatInr(Math.abs(Number(m.adjustments_total)))}
                    </span>
                  )}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {' '}
                    → {formatInr(m.net_estimate)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  {!monthCompletable && !monthLocked ? (
                    <p className="text-[11px] text-muted-foreground">{monthPeriodHint}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                  {(self || isAdmin) && m.employee_status !== 'verified' && !monthLocked && (
                    <>
                      <Button
                        type="button"
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                        disabled={busy || !monthCompletable}
                        title={
                          monthCompletable
                            ? 'Verify completed month hours'
                            : monthPeriodHint
                        }
                        onClick={() => setNoteAction({ kind: 'emp-month', entry, status: 'verified' })}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Verify month
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        disabled={busy || !monthCompletable}
                        title={
                          monthCompletable
                            ? 'Flag month for correction'
                            : monthPeriodHint
                        }
                        onClick={() =>
                          setNoteAction({ kind: 'emp-month', entry, status: 'correction_needed' })
                        }
                      >
                        Month correction
                      </Button>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl gap-1.5"
                        disabled={busy}
                        onClick={() => void openBankDetails(entry)}
                      >
                        <Landmark className="h-3.5 w-3.5" />
                        Bank details
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl gap-1.5"
                        disabled={busy}
                        onClick={() => void openSalaryHike(entry)}
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Salary hike
                      </Button>
                      {!monthLocked && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          disabled={busy}
                          onClick={() => void openAdjustment(entry)}
                        >
                          Add adjustment
                        </Button>
                      )}
                      {m.employee_status === 'verified' && !monthLocked && (
                        <Button
                          type="button"
                          className="rounded-xl gap-1.5"
                          disabled={busy}
                          onClick={() => setNoteAction({ kind: 'admin-month', entry, action: 'lock' })}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Mark as paid
                        </Button>
                      )}
                      {monthLocked && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl gap-1.5"
                          disabled={busy}
                          onClick={() =>
                            setNoteAction({ kind: 'admin-month', entry, action: 'unlock' })
                          }
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          Mark unpaid
                        </Button>
                      )}
                    </>
                  )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Action dialog */}
      <Dialog open={!!noteAction} onOpenChange={(open) => !open && !busy && closeNote()}>
        <DialogContent
          className={cn(
            'rounded-2xl',
            noteAction?.kind === 'rate'
              ? 'sm:max-w-[680px]'
              : noteAction?.kind === 'adjustment'
                ? 'sm:max-w-[520px]'
                : 'sm:max-w-[420px]'
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {noteAction?.kind === 'rate'
                ? editingRateId
                  ? 'Edit salary hike'
                  : 'Salary hike'
                : noteAction?.kind === 'adjustment'
                  ? 'Add adjustment'
                  : noteAction?.kind === 'admin-month' && noteAction.action === 'lock'
                    ? 'Mark month as paid'
                    : noteAction?.kind === 'admin-month' && noteAction.action === 'unlock'
                      ? 'Mark month unpaid'
                      : noteAction?.kind === 'emp-month' &&
                          noteAction.status === 'verified' &&
                          isAdmin
                        ? 'Verify month (admin)'
                        : 'Confirm verification'}
            </DialogTitle>
            <DialogDescription>
              {noteAction && 'entry' in noteAction
                ? noteAction.kind === 'emp-month' &&
                  noteAction.status === 'verified' &&
                  isAdmin
                  ? `${noteAction.entry.user.name || noteAction.entry.user.username} · ${monthTitle(month)}. Unverified weeks in this month will be marked verified automatically.`
                  : noteAction.kind === 'rate'
                    ? `${noteAction.entry.user.name || noteAction.entry.user.username} · manage hourly rate and hike timeline`
                    : `${noteAction.entry.user.name || noteAction.entry.user.username} · ${monthTitle(month)}`
                : null}
            </DialogDescription>
          </DialogHeader>

          {noteAction?.kind === 'rate' ? (
            <div className="flex flex-col gap-4">
              {(() => {
                const info = noteAction.entry.rate_info;
                const current = Number(
                  info?.current_rate ??
                    noteAction.entry.month.hourly_rate_used ??
                    noteAction.entry.month.hourly_rate ??
                    0
                );
                const previous = Number(info?.previous_rate ?? 0);
                const next = Number(rateValue);
                const hasNext = Number.isFinite(next) && rateValue !== '';
                const baseline =
                  editingRateId && previous > 0
                    ? previous
                    : current > 0
                      ? current
                      : 0;
                const delta =
                  hasNext && baseline > 0 ? roundMoney(next - baseline) : null;
                const pct =
                  hasNext && baseline > 0
                    ? Math.round(((next - baseline) / baseline) * 1000) / 10
                    : null;
                const todayIso = new Date().toISOString().slice(0, 10);
                return (
                  <>
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 rounded-xl border border-border/80 bg-muted/25 px-3.5 py-3 sm:col-span-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Current rate
                        </p>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                          {current > 0 ? `₹${current}/h` : 'Not set'}
                        </p>
                        {info?.effective_from ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Effective {formatRateDate(info.effective_from)}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            No rate on record yet
                          </p>
                        )}
                        {previous > 0 && previous !== current ? (
                          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                            Previous ₹{previous}/h
                          </p>
                        ) : null}
                      </div>

                      <div className="col-span-12 flex flex-col gap-3 sm:col-span-8">
                        {editingRateId ? (
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                            <span>
                              Editing hike from{' '}
                              <span className="font-semibold">
                                {formatRateDate(rateEffectiveFrom)}
                              </span>
                              . Same date updates this record.
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 shrink-0 rounded-xl px-2"
                              disabled={busy}
                              onClick={() => resetRateFormForNew(noteAction.entry)}
                            >
                              New hike
                            </Button>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12 flex flex-col gap-2 sm:col-span-6">
                            <Label htmlFor="rate">
                              {editingRateId ? 'Rate (₹/h)' : 'New rate (₹/h)'}
                            </Label>
                            <Input
                              id="rate"
                              inputMode="decimal"
                              value={rateValue}
                              onChange={(e) =>
                                setRateValue(e.target.value.replace(/[^\d.]/g, '').slice(0, 10))
                              }
                              className="h-11 rounded-xl text-base tabular-nums"
                              placeholder={current > 0 ? String(current) : 'e.g. 90'}
                            />
                          </div>
                          <div className="col-span-12 flex flex-col gap-2 sm:col-span-6">
                            <Label>Effective from</Label>
                            <DatePicker
                              value={rateEffectiveFrom || undefined}
                              onChange={setRateEffectiveFrom}
                              placeholder="Pick effective date"
                              className="h-11 rounded-xl"
                              fromYear={2020}
                              toYear={new Date().getFullYear() + 2}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {hasNext && delta != null && pct != null ? (
                      <div
                        className={cn(
                          'grid grid-cols-12 gap-2 rounded-xl border px-3 py-2.5 text-sm',
                          delta > 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                            : delta < 0
                              ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
                              : 'border-border bg-muted/40 text-muted-foreground'
                        )}
                      >
                        <div className="col-span-12 flex items-center gap-2 sm:col-span-5">
                          <TrendingUp className="h-4 w-4 shrink-0" />
                          <span className="font-medium">
                            {delta === 0
                              ? 'No change vs baseline'
                              : `${delta > 0 ? '+' : ''}₹${delta}/h`}
                          </span>
                        </div>
                        <div className="col-span-6 tabular-nums sm:col-span-3">
                          {pct === 0 ? '0%' : `${pct > 0 ? '+' : ''}${pct}%`}
                        </div>
                        <div className="col-span-6 text-right tabular-nums sm:col-span-4">
                          {baseline > 0 ? `₹${baseline}` : '—'} → ₹{next}/h
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="hike-note">Hike note</Label>
                      <Textarea
                        id="hike-note"
                        value={note}
                        maxLength={500}
                        onChange={(e) => setNote(e.target.value.slice(0, 500))}
                        className="min-h-[72px] rounded-xl"
                        placeholder="e.g. Annual review · Oct 2026 · performance band A"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Optional context for payroll. Visible in rate history for admins.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80">
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Hike timeline</p>
                          <p className="text-[11px] text-muted-foreground">
                            Edit any entry to correct rate, date, or note. Future-dated rows can be removed.
                          </p>
                        </div>
                        {rateHistoryLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {rateHistory.length} change{rateHistory.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {rateHistoryLoading ? (
                          <div className="flex flex-col gap-2 p-3">
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                          </div>
                        ) : rateHistory.length === 0 ? (
                          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                            No hike history yet. Saving a rate starts the timeline.
                          </p>
                        ) : (
                          <div className="flex flex-col divide-y divide-border/60">
                            {rateHistory.map((row, idx) => {
                              const canDelete = row.effective_from >= todayIso;
                              const isCurrent =
                                info?.effective_from === row.effective_from &&
                                Number(info?.current_rate) === Number(row.hourly_rate);
                              const isEditing = editingRateId === row.id;
                              return (
                                <div
                                  key={row.id}
                                  className={cn(
                                    'grid grid-cols-12 items-start gap-2 px-3 py-3',
                                    isEditing && 'bg-sky-50/70 dark:bg-sky-950/30'
                                  )}
                                >
                                  <div className="col-span-12 min-w-0 sm:col-span-7">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold tabular-nums text-foreground">
                                        ₹{row.hourly_rate}/h
                                      </p>
                                      {row.hike_pct != null ? (
                                        <span
                                          className={cn(
                                            'rounded-lg px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                                            row.hike_pct > 0
                                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                              : row.hike_pct < 0
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                                : 'bg-muted text-muted-foreground'
                                          )}
                                        >
                                          {row.hike_amount != null
                                            ? `${row.hike_amount > 0 ? '+' : ''}₹${row.hike_amount}`
                                            : ''}
                                          {row.hike_pct !== 0
                                            ? ` · ${row.hike_pct > 0 ? '+' : ''}${row.hike_pct}%`
                                            : ' · flat'}
                                        </span>
                                      ) : idx === rateHistory.length - 1 ? (
                                        <span className="rounded-lg bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                          Baseline
                                        </span>
                                      ) : null}
                                      {isCurrent ? (
                                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                          Active
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                      From {formatRateDate(row.effective_from)}
                                      {row.updated_by_username
                                        ? ` · by @${row.updated_by_username}`
                                        : ''}
                                    </p>
                                    {row.note ? (
                                      <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
                                        {row.note}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-xs italic text-muted-foreground">
                                        No note
                                      </p>
                                    )}
                                  </div>
                                  <div className="col-span-12 flex justify-end gap-1.5 sm:col-span-5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-xl gap-1.5"
                                      disabled={busy}
                                      onClick={() => loadRateIntoForm(row)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </Button>
                                    {canDelete ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                        disabled={busy}
                                        onClick={() => setRateToDelete(row)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : noteAction?.kind === 'adjustment' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="adj-type">Type</Label>
                <Select
                  value={adjType}
                  onValueChange={(v) => {
                    const next = v as PayVerifyAdjustmentType;
                    setAdjType(next);
                    if (next !== 'project_incentive') {
                      setAdjProjectId('');
                    } else if (
                      adjProjects.length === 1 &&
                      !adjProjectId
                    ) {
                      setAdjProjectId(adjProjects[0].id);
                    }
                  }}
                >
                  <SelectTrigger id="adj-type" className="h-10 rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[120] rounded-xl">
                    <SelectItem value="advance" className="rounded-lg">
                      Advance
                    </SelectItem>
                    <SelectItem value="deduction" className="rounded-lg">
                      Deduction
                    </SelectItem>
                    <SelectItem value="credit" className="rounded-lg">
                      Credit
                    </SelectItem>
                    <SelectItem value="project_incentive" className="rounded-lg">
                      Project incentive
                    </SelectItem>
                    <SelectItem value="other" className="rounded-lg">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {adjType === 'project_incentive' ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="adj-project">Project</Label>
                  {adjProjectsLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading assigned projects…
                    </div>
                  ) : adjProjectsError ? (
                    <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                      {adjProjectsError}
                    </div>
                  ) : adjProjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                      No completed projects assigned to this employee. Incentives can only be added
                      after a project is marked completed.
                    </div>
                  ) : (
                    <Select value={adjProjectId || undefined} onValueChange={setAdjProjectId}>
                      <SelectTrigger id="adj-project" className="h-10 rounded-xl">
                        <SelectValue placeholder="Choose a completed project" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[120] rounded-xl">
                        {adjProjects.map((project) => (
                          <SelectItem
                            key={project.id}
                            value={project.id}
                            className="rounded-lg"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate">{project.name}</span>
                              <span className="shrink-0 text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                Completed
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Only completed projects this person is assigned to can receive an incentive.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="adj-amount">Amount (₹)</Label>
                <Input
                  id="adj-amount"
                  inputMode="decimal"
                  value={adjAmount}
                  onChange={(e) =>
                    setAdjAmount(
                      e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 12)
                    )
                  }
                  className="rounded-xl"
                  placeholder={adjType === 'project_incentive' ? '2500' : '5200'}
                />
                <p className="text-xs text-muted-foreground">
                  {adjType === 'project_incentive' || adjType === 'credit'
                    ? 'Adds to net pay.'
                    : adjType === 'advance' || adjType === 'deduction'
                      ? 'Reduces net pay.'
                      : 'Use a positive amount; sign follows the type.'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="adj-reason">
                  {adjType === 'project_incentive' ? 'Note (optional)' : 'Reason'}
                </Label>
                <Input
                  id="adj-reason"
                  value={adjReason}
                  maxLength={500}
                  onChange={(e) => setAdjReason(e.target.value.slice(0, 500))}
                  className="rounded-xl"
                  placeholder={
                    adjType === 'project_incentive'
                      ? 'e.g. Milestone bonus, client appreciation…'
                      : 'Why this adjustment?'
                  }
                />
                {adjType === 'project_incentive' ? (
                  <p className="text-xs text-muted-foreground">
                    Project name is stored automatically. Add a short note only if needed.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(noteAction?.kind === 'emp-week' && noteAction.status === 'correction_needed') ||
              (noteAction?.kind === 'admin-week' && noteAction.status === 'correction_requested') ||
              (noteAction?.kind === 'emp-month' && noteAction.status === 'correction_needed') ||
              (noteAction?.kind === 'admin-month' && noteAction.action === 'correction_requested') ? (
                <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  A note is required for correction.
                </div>
              ) : null}
              <Label htmlFor="verify-note">Note (optional unless correction)</Label>
              <Textarea
                id="verify-note"
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                className="min-h-[96px] rounded-xl"
                placeholder="Optional context for admins…"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={closeNote}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
              disabled={
                busy ||
                (noteAction?.kind === 'rate' &&
                  (!rateValue.trim() ||
                    Number(rateValue) < 0 ||
                    !/^\d{4}-\d{2}-\d{2}$/.test(rateEffectiveFrom))) ||
                (noteAction?.kind === 'adjustment' &&
                  (!adjAmount.trim() ||
                    !Number.isFinite(Number(adjAmount)) ||
                    Number(adjAmount) === 0 ||
                    (adjType === 'project_incentive'
                      ? !adjProjectId || adjProjectsLoading
                      : !adjReason.trim())))
              }
              onClick={() => void submitNoteAction()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : noteAction?.kind === 'rate' ? (
                editingRateId ? 'Update hike' : 'Save hike'
              ) : noteAction?.kind === 'adjustment' && adjType === 'project_incentive' ? (
                'Add incentive'
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!adjustmentToDelete}
        onOpenChange={(open) => {
          if (!open && !busy) setAdjustmentToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              {adjustmentToDelete
                ? `${adjustmentTypeLabel(adjustmentToDelete.type)}${
                    adjustmentToDelete.project_name
                      ? ` · ${adjustmentToDelete.project_name}`
                      : ''
                  }: ${adjustmentToDelete.reason || '—'} (${formatInr(adjustmentToDelete.amount)}). This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={busy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void (async () => {
                  if (!adjustmentToDelete) return;
                  setBusy(true);
                  try {
                    await deleteMonthAdjustment(adjustmentToDelete.id);
                    toast({ title: 'Adjustment removed' });
                    setAdjustmentToDelete(null);
                    notifyAdminNavCountsChanged();
                    await load();
                  } catch (err) {
                    toast({
                      title: 'Delete failed',
                      description: extractApiErrorMessage(err),
                      variant: 'destructive',
                    });
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!rateToDelete}
        onOpenChange={(open) => {
          if (!open && !busy) setRateToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove scheduled hike?</AlertDialogTitle>
            <AlertDialogDescription>
              {rateToDelete
                ? `₹${rateToDelete.hourly_rate}/h from ${formatRateDate(rateToDelete.effective_from)}${
                    rateToDelete.note ? ` · ${rateToDelete.note}` : ''
                  }. Past rates stay in history — only future-dated changes can be deleted.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={busy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void (async () => {
                  if (!rateToDelete || !noteAction || noteAction.kind !== 'rate') return;
                  setBusy(true);
                  try {
                    const res = await deleteHourlyRate(rateToDelete.id);
                    setRateHistory(res.history ?? []);
                    if (editingRateId === rateToDelete.id) {
                      resetRateFormForNew(noteAction.entry);
                    }
                    toast({ title: 'Scheduled hike removed' });
                    setRateToDelete(null);
                    notifyAdminNavCountsChanged();
                    await load();
                  } catch (err) {
                    toast({
                      title: extractApiErrorMessage(err) || 'Could not remove rate',
                      variant: 'destructive',
                    });
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!bankEntry}
        onOpenChange={(open) => {
          if (!open && !bankLoading) closeBankDetails();
        }}
      >
        <DialogContent className="max-w-[600px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              Bank details
            </DialogTitle>
            <DialogDescription>
              {bankEntry
                ? `${bankEntry.user.name || bankEntry.user.username} · @${bankEntry.user.username}`
                : 'Salary payout account'}
            </DialogDescription>
          </DialogHeader>

          {bankLoading ? (
            <div className="grid grid-cols-12 gap-3 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="col-span-12 h-16 rounded-xl sm:col-span-6" />
              ))}
            </div>
          ) : bankError ? (
            <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 px-3 py-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              {bankError}
            </div>
          ) : !bankDetails ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
              No bank details on file for this employee yet.
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-3">
              <BankDetailRow label="Account holder" value={bankDetails.account_holder_name} />
              <BankDetailRow label="Bank" value={bankDetails.bank_name} />
              <BankDetailRow
                label="Account number"
                value={bankDetails.account_number}
                mono
                copyable
              />
              <BankDetailRow label="IFSC" value={bankDetails.ifsc_code} mono copyable />
              <BankDetailRow label="Branch" value={bankDetails.branch_name} />
              <BankDetailRow
                label="Account type"
                value={
                  bankDetails.account_type
                    ? String(bankDetails.account_type).replace(/_/g, ' ')
                    : null
                }
              />
              <BankDetailRow label="UPI ID" value={bankDetails.upi_id} mono copyable />
              <BankDetailRow
                label="UPI phone"
                value={bankDetails.upi_linked_phone}
                mono
                copyable
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={bankLoading}
              onClick={closeBankDetails}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
