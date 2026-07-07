import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  backupService,
  BackupJob,
  BackupJobStatus,
  BackupMailStatus,
} from '@/services/backupService';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  Activity,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Code2,
  Database,
  FileText,
  FolderArchive,
  HardDrive,
  History,
  Loader2,
  Mail,
  Server,
  Settings2,
  Shield,
  Sparkles,
  XCircle,
} from 'lucide-react';

const RESTORE_STEPS = [
  {
    title: 'Database',
    description: 'Import the SQL dump to restore all tables, records, and relationships.',
    icon: Database,
  },
  {
    title: 'Files',
    description: 'Restore the uploads directory to recover attachments and media.',
    icon: FolderArchive,
  },
  {
    title: 'Config',
    description: 'Review manifest.json and config files before going live.',
    icon: Settings2,
  },
] as const;

function statusBadge(status: BackupJobStatus) {
  const map: Record<BackupJobStatus, { label: string; className: string }> = {
    queued: {
      label: 'Queued',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    },
    completed: {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    },
  };

  const item = map[status];
  return <Badge className={cn('font-medium', item.className)}>{item.label}</Badge>;
}

function mailStatusBadge(status: BackupMailStatus, error?: string | null) {
  const map: Record<BackupMailStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    sent: {
      label: 'Sent',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    error_sent: {
      label: 'Notice sent',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    },
  };

  const item = map[status] ?? map.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={error || undefined}
    >
      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
      <Badge className={cn('font-medium', item.className)}>{item.label}</Badge>
    </span>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    return format(parseISO(value.replace(' ', 'T')), 'dd MMM yyyy, hh:mm a');
  } catch {
    return value;
  }
}

function componentSummary(job: BackupJob) {
  const parts: string[] = [];
  if (job.include_database) parts.push('DB');
  if (job.include_uploads) parts.push('Files');
  if (job.include_config) parts.push('Config');
  return parts.join(' · ') || '—';
}

const BugBackup = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState(currentUser?.email || '');
  const [includeDatabase, setIncludeDatabase] = useState(true);
  const [includeUploads, setIncludeUploads] = useState(true);
  const [includeConfig, setIncludeConfig] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [progressValue, setProgressValue] = useState(12);

  const canAccess = hasPermission('SETTINGS_EDIT');
  const hasSelection = includeDatabase || includeUploads || includeConfig;

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['backup-stats'],
    queryFn: () => backupService.getStats(),
    enabled: canAccess,
    refetchInterval: (query) =>
      (query.state.data?.jobs.active ?? 0) > 0 ? 5000 : false,
  });

  const {
    data: history = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['backup-history'],
    queryFn: () => backupService.getHistory(15),
    enabled: canAccess,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((job) =>
        ['queued', 'processing'].includes(job.status)
      );
      return hasActive ? 5000 : false;
    },
  });

  const activeJob = useMemo(
    () => history.find((job) => job.id === activeJobId) ?? history.find((job) => job.status === 'processing'),
    [history, activeJobId]
  );

  useEffect(() => {
    if (!activeJob || activeJob.status !== 'processing') {
      setProgressValue((value) => (value < 12 ? 12 : value));
      return;
    }

    const timer = window.setInterval(() => {
      setProgressValue((value) => (value >= 92 ? 92 : value + 4));
    }, 1800);

    return () => window.clearInterval(timer);
  }, [activeJob?.id, activeJob?.status]);

  useEffect(() => {
    if (activeJob?.status === 'completed') {
      setProgressValue(100);
      setIsStarting(false);
      refetchStats();
      toast({
        title: 'Backup completed',
        description: `Archive sent to ${activeJob.email}.`,
      });
    }

    if (activeJob?.status === 'failed') {
      setIsStarting(false);
      toast({
        title: 'Backup failed',
        description: activeJob.error_message || 'Check history for details.',
        variant: 'destructive',
      });
    }
  }, [activeJob?.status, activeJob?.email, activeJob?.error_message, refetchStats]);

  const handleBackup = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Enter a valid delivery email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasSelection) {
      toast({
        title: 'Nothing selected',
        description: 'Choose at least one backup component.',
        variant: 'destructive',
      });
      return;
    }

    setIsStarting(true);
    setProgressValue(12);

    try {
      const result = await backupService.createBackup({
        email,
        include_database: includeDatabase,
        include_uploads: includeUploads,
        include_config: includeConfig,
        delivery_method: 'email',
      });

      setActiveJobId(result.job_id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['backup-history'] }),
        queryClient.invalidateQueries({ queryKey: ['backup-stats'] }),
      ]);

      toast({
        title: 'Backup started',
        description: `Preparing archive — watch Backup History below. Email will go to ${email}.`,
      });
    } catch (error: unknown) {
      setIsStarting(false);
      toast({
        title: 'Could not start backup',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (permissionsLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[560px] w-full rounded-2xl" />
        </section>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-gray-200/60 bg-white/80 p-12 text-center dark:border-gray-800/60 dark:bg-gray-900/80">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Access denied</h1>
            <p className="mx-auto max-w-md text-muted-foreground">
              You do not have permission to access the backup console.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 p-6 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 p-2 shadow-lg">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-white dark:via-gray-100 dark:to-gray-300 sm:text-4xl">
                      BugBackup Pro
                    </h1>
                    <div className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600" />
                  </div>
                </div>
                <p className="max-w-3xl text-base font-medium text-gray-600 dark:text-gray-400 lg:text-lg">
                  Enterprise-grade disaster recovery for BugRicer — snapshot your database,
                  uploads, and configuration into a signed archive delivered securely by email.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex h-12 min-w-[12rem] items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <div className="rounded-lg bg-blue-500 p-1.5">
                    <Archive className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-blue-800/80 dark:text-blue-200/80">
                      Archive
                    </div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      ZIP + Manifest
                    </div>
                  </div>
                </div>
                <div className="flex h-12 min-w-[12rem] items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 shadow-sm dark:border-emerald-800 dark:from-emerald-950/30 dark:to-green-950/30">
                  <div className="rounded-lg bg-emerald-600 p-1.5">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
                      Delivery
                    </div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      Secure Email
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Database',
              value: statsLoading ? '…' : `${stats?.database.tables ?? 0} tables`,
              sub: statsLoading ? '' : stats?.database.size_label ?? '0 B',
              icon: Database,
              accent: 'from-blue-500 to-indigo-600',
            },
            {
              label: 'Uploads',
              value: statsLoading ? '…' : stats?.uploads.size_label ?? '0 B',
              sub: stats?.uploads.path_exists ? 'Media & attachments' : 'Uploads path missing',
              icon: HardDrive,
              accent: 'from-violet-500 to-purple-600',
            },
            {
              label: 'Estimated Archive',
              value: statsLoading ? '…' : stats?.estimate.total_label ?? '0 B',
              sub: 'Based on current footprint',
              icon: Server,
              accent: 'from-emerald-500 to-teal-600',
            },
            {
              label: 'Last Backup',
              value: statsLoading
                ? '…'
                : stats?.last_backup
                  ? formatDateTime(stats.last_backup.completed_at || stats.last_backup.created_at)
                  : 'Never',
              sub: stats?.jobs.completed
                ? `${stats.jobs.completed} completed`
                : 'No completed jobs yet',
              icon: History,
              accent: 'from-amber-500 to-orange-600',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm dark:border-gray-700/70 dark:bg-gray-900/80"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn('rounded-xl bg-gradient-to-br p-2 text-white shadow-md', card.accent)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {(stats?.jobs.active ?? 0) > 0 && card.label === 'Last Backup' ? (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {stats?.jobs.active} active
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {(isStarting || activeJob?.status === 'processing' || (stats?.jobs.active ?? 0) > 0) && (
          <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-5 dark:border-blue-800/70 dark:from-blue-950/30 dark:to-indigo-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-600 p-2 text-white">
                  <Activity className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-blue-950 dark:text-blue-100">
                    Backup in progress
                  </h2>
                  <p className="text-sm text-blue-800/80 dark:text-blue-200/80">
                    Packaging components, compressing archive, and preparing secure email delivery.
                  </p>
                </div>
              </div>
              <Badge className="self-start bg-blue-600 text-white hover:bg-blue-600">
                Job #{activeJob?.id ?? '…'}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-900/80 dark:text-blue-100/80">
                <span>Preparing archive</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-gray-200/50 bg-white/70 shadow-xl backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70">
            <div className="border-b border-gray-200/60 px-6 py-5 dark:border-gray-700/60 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Launch Backup
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure scope, choose delivery, and start a production-ready export.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 dark:border-gray-700/70 dark:bg-gray-900/80 sm:p-5">
                <Label htmlFor="backup-email" className="mb-2 flex items-center gap-2 text-base font-semibold">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Delivery Email
                </Label>
                <Input
                  id="backup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  disabled={isStarting}
                  className="h-12 border-2 text-base"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  The encrypted ZIP archive and restoration README will be sent to this inbox — check spam/promotions if it does not arrive within a few minutes.
                </p>
                {email && (
                  <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                    Delivery target: {email}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 dark:border-gray-700/70 dark:bg-gray-900/80 sm:p-5">
                <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                  Backup Scope
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      id: 'database',
                      label: 'Database dump',
                      description: 'Full SQL export of every table and record.',
                      checked: includeDatabase,
                      onChange: setIncludeDatabase,
                    },
                    {
                      id: 'uploads',
                      label: 'Uploads & media',
                      description: 'All files from backend/uploads.',
                      checked: includeUploads,
                      onChange: setIncludeUploads,
                    },
                    {
                      id: 'config',
                      label: 'Configuration',
                      description: 'Application config files for faster recovery.',
                      checked: includeConfig,
                      onChange: setIncludeConfig,
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-xl border-2 border-gray-200 px-4 py-3 dark:border-gray-700"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        checked={item.checked}
                        onCheckedChange={item.onChange}
                        disabled={isStarting}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-4 dark:border-blue-800/70 dark:from-blue-950/30 dark:to-indigo-950/20 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-950 dark:text-blue-100">
                  <Database className="h-4 w-4" />
                  Archive contents
                </h3>
                <ul className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                  {includeDatabase && <li>• SQL database dump with table structures and data</li>}
                  {includeUploads && <li>• Uploads directory with attachments and media</li>}
                  {includeConfig && <li>• Config snapshot for environment recovery</li>}
                  <li>• manifest.json metadata and README restoration guide</li>
                </ul>
              </div>

              <Button
                onClick={handleBackup}
                disabled={isStarting || !email || !hasSelection}
                className="h-12 w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-base font-semibold text-white shadow-lg hover:from-blue-700 hover:to-emerald-700"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Starting backup job…
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-5 w-5" />
                    Start Production Backup
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/50 bg-white/70 shadow-xl backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70">
            <div className="border-b border-gray-200/60 px-6 py-5 dark:border-gray-700/60">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2 text-white">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Recovery Playbook
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    What backend engineers receive in every archive.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {RESTORE_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 dark:border-gray-700/70 dark:bg-gray-900/80"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {step.title}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                );
              })}

              <div className="flex items-start gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/20 dark:text-emerald-200">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Treat every archive as confidential. Rotate credentials after restore and store
                  offline copies in encrypted storage.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/50 bg-white/70 shadow-xl backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70">
          <div className="flex flex-col gap-3 border-b border-gray-200/60 px-6 py-5 dark:border-gray-700/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 p-2 text-white">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Backup History</h2>
                <p className="text-sm text-muted-foreground">
                  Audit trail of recent export jobs and delivery outcomes.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchHistory();
                refetchStats();
              }}
              className="h-9 border-2"
            >
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6">
            {historyLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700">
                <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-gray-900 dark:text-white">No backup jobs yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Launch your first production backup to populate this audit log.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Mail</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">#{job.id}</TableCell>
                      <TableCell>{statusBadge(job.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {componentSummary(job)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{job.email}</TableCell>
                      <TableCell>
                        {mailStatusBadge(job.mail_status ?? 'pending', job.mail_error)}
                      </TableCell>
                      <TableCell>{job.file_size_label || '—'}</TableCell>
                      <TableCell>
                        {job.duration_seconds ? (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                            {job.duration_seconds}s
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(job.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: CheckCircle2,
              title: 'Verified manifest',
              text: 'Every archive ships with manifest.json for component validation.',
            },
            {
              icon: Activity,
              title: 'Background execution',
              text: 'Jobs run server-side so admins can continue working without blocking.',
            },
            {
              icon: XCircle,
              title: 'Failure alerts',
              text: 'Failed jobs are logged and trigger an error notification email.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200/70 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-900/70"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">{item.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default BugBackup;
