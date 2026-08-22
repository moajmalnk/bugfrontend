import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getComplianceStatusLabel,
  type CompliancePhaseStatus,
  type ComplianceStatusCounts,
} from '@/lib/codo/complianceStatus';
import { cn } from '@/lib/utils';
import { Code2, Crown, FlaskConical, type LucideIcon } from 'lucide-react';

type Accent = 'emerald' | 'purple' | 'blue';

const ACCENT_STYLES: Record<
  Accent,
  {
    panel: string;
    icon: string;
    statCompleted: string;
    statPending: string;
    statNotStarted: string;
  }
> = {
  emerald: {
    panel:
      'border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 via-white/60 to-white/40 dark:from-emerald-950/30 dark:via-gray-900/60 dark:to-gray-900/40',
    icon: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    statCompleted: 'bg-emerald-100/80 dark:bg-emerald-900/30',
    statPending: 'bg-amber-100/80 dark:bg-amber-900/30',
    statNotStarted: 'bg-slate-100/80 dark:bg-slate-800/40',
  },
  purple: {
    panel:
      'border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/80 via-white/60 to-white/40 dark:from-purple-950/30 dark:via-gray-900/60 dark:to-gray-900/40',
    icon: 'bg-gradient-to-br from-purple-500 to-violet-600',
    statCompleted: 'bg-purple-100/80 dark:bg-purple-900/30',
    statPending: 'bg-amber-100/80 dark:bg-amber-900/30',
    statNotStarted: 'bg-slate-100/80 dark:bg-slate-800/40',
  },
  blue: {
    panel:
      'border-blue-200/60 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/80 via-white/60 to-white/40 dark:from-blue-950/30 dark:via-gray-900/60 dark:to-gray-900/40',
    icon: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    statCompleted: 'bg-blue-100/80 dark:bg-blue-900/30',
    statPending: 'bg-amber-100/80 dark:bg-amber-900/30',
    statNotStarted: 'bg-slate-100/80 dark:bg-slate-800/40',
  },
};

function MiniStat({
  status,
  count,
  accent,
  loading,
}: {
  status: CompliancePhaseStatus;
  count: number;
  accent: Accent;
  loading?: boolean;
}) {
  const styles = ACCENT_STYLES[accent];
  const bgClass =
    status === 'completed'
      ? styles.statCompleted
      : status === 'pending'
        ? styles.statPending
        : styles.statNotStarted;

  return (
    <div
      className={cn(
        'flex h-full min-h-[8.5rem] flex-col items-center rounded-xl border border-white/40 dark:border-white/5 p-3 sm:p-3.5 min-w-0',
        bgClass
      )}
    >
      {/* Why: Fixed badge row keeps Completed / Pending / Not started numbers on one baseline. */}
      <div className="flex h-6 w-full shrink-0 items-center justify-center">
        <ComplianceStatusBadge
          status={status}
          className="max-w-full whitespace-nowrap px-1.5 py-0 text-[9px] sm:text-[10px] leading-none"
        />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        {loading ? (
          <Skeleton className="h-7 w-10 rounded-lg" />
        ) : (
          <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none">
            {count}
          </p>
        )}
      </div>
      <p className="flex h-8 w-full shrink-0 items-center justify-center truncate px-0.5 text-center text-[10px] sm:text-xs font-medium leading-none text-muted-foreground whitespace-nowrap">
        {getComplianceStatusLabel(status)}
      </p>
    </div>
  );
}

interface ComplianceRoleStatsPanelProps {
  title: string;
  icon: LucideIcon;
  accent: Accent;
  counts: ComplianceStatusCounts;
  loading?: boolean;
}

export function ComplianceRoleStatsPanel({
  title,
  icon: Icon,
  accent,
  counts,
  loading,
}: ComplianceRoleStatsPanelProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-sm shadow-sm p-4 sm:p-5',
        styles.panel
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('p-2.5 rounded-xl shadow-lg shrink-0 text-white', styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{title}</h3>
          <p className="text-xs text-muted-foreground">Pipeline status breakdown</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 items-stretch gap-2 sm:gap-3">
        <MiniStat status="completed" count={counts.completed} accent={accent} loading={loading} />
        <MiniStat status="pending" count={counts.pending} accent={accent} loading={loading} />
        <MiniStat
          status="not_started"
          count={counts.not_started}
          accent={accent}
          loading={loading}
        />
      </div>
    </div>
  );
}

interface ComplianceStatsPanelProps {
  isAdmin: boolean;
  isDeveloper: boolean;
  isTester: boolean;
  devCounts: ComplianceStatusCounts;
  testerCounts: ComplianceStatusCounts;
  adminCounts: ComplianceStatusCounts;
  loading?: boolean;
}

export function ComplianceStatsPanel({
  isAdmin,
  isDeveloper,
  isTester,
  devCounts,
  testerCounts,
  adminCounts,
  loading,
}: ComplianceStatsPanelProps) {
  if (isAdmin) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ComplianceRoleStatsPanel
          title="Developer matrix"
          icon={Code2}
          accent="emerald"
          counts={devCounts}
          loading={loading}
        />
        <ComplianceRoleStatsPanel
          title="Tester matrix"
          icon={FlaskConical}
          accent="purple"
          counts={testerCounts}
          loading={loading}
        />
        <ComplianceRoleStatsPanel
          title="Admin final lock"
          icon={Crown}
          accent="blue"
          counts={adminCounts}
          loading={loading}
        />
      </div>
    );
  }

  if (isDeveloper) {
    return (
      <ComplianceRoleStatsPanel
        title="Developer matrix"
        icon={Code2}
        accent="emerald"
        counts={devCounts}
        loading={loading}
      />
    );
  }

  if (isTester) {
    return (
      <ComplianceRoleStatsPanel
        title="Tester matrix"
        icon={FlaskConical}
        accent="purple"
        counts={testerCounts}
        loading={loading}
      />
    );
  }

  return null;
}
