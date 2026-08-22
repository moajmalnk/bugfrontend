import {
  getPipelineStageLabel,
  isCompliancePipelineSatisfied,
  type ProjectComplianceSummary,
} from '@/lib/codo/complianceRules';
import type { Project, ProjectComplianceSummaryLite } from '@/lib/utils/projectUtils';

export type CompliancePhaseStatus = 'completed' | 'pending' | 'not_started';

export type ComplianceFilterTab = 'all' | CompliancePhaseStatus;

export type CompliancePhase = 'developer' | 'tester';

const PENDING_WINDOW_DAYS = 7;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Why: Compliance overview compares target dates at day granularity, matching timeline UI.
 */
export function parseComplianceTargetDate(value?: string | null): Date | null {
  if (!value) return null;
  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Why: Negative values signal overdue rows in the overview table.
 */
export function daysUntilComplianceDate(
  targetDate: string | null | undefined,
  now = new Date()
): number | null {
  const parsed = parseComplianceTargetDate(targetDate);
  if (!parsed) return null;
  return Math.round(
    (startOfDay(parsed).getTime() - startOfDay(now).getTime()) / 86400000
  );
}

export function isComplianceOverdue(
  verified: number,
  total: number,
  targetDate: string | null | undefined,
  now = new Date()
): boolean {
  if (total > 0 && verified >= total) return false;
  const days = daysUntilComplianceDate(targetDate, now);
  return days !== null && days < 0;
}

/**
 * Why: Single source of truth for Completed / Pending / Not started on overview page.
 */
export function getPhaseStatus(
  verified: number,
  total: number,
  targetDate: string | null | undefined,
  now = new Date()
): CompliancePhaseStatus {
  if (total > 0 && verified >= total) {
    return 'completed';
  }

  if (verified === 0) {
    const days = daysUntilComplianceDate(targetDate, now);
    if (days === null || days > PENDING_WINDOW_DAYS) {
      return 'not_started';
    }
  }

  return 'pending';
}

export function getAdminComplianceStatus(
  compliance: ProjectComplianceSummaryLite | ProjectComplianceSummary | null | undefined
): CompliancePhaseStatus {
  if (!compliance) return 'not_started';
  if (isCompliancePipelineSatisfied(compliance)) return 'completed';

  const totalProgress =
    (compliance.developer_verified ?? 0) +
    (compliance.tester_verified ?? 0) +
    (compliance.project_verified ?? 0);

  if (totalProgress === 0 && compliance.pipeline_stage === 'developer_unverified') {
    return 'not_started';
  }

  return 'pending';
}

export function getComplianceStatusLabel(status: CompliancePhaseStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'not_started':
      return 'Not started';
    default:
      return status;
  }
}

export function getComplianceStatusBadgeClass(status: CompliancePhaseStatus): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    case 'not_started':
      return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

export type ProjectComplianceOverview = {
  project: Project;
  developerStatus: CompliancePhaseStatus;
  testerStatus: CompliancePhaseStatus;
  adminStatus: CompliancePhaseStatus;
  developerVerified: number;
  developerTotal: number;
  testerVerified: number;
  testerTotal: number;
  developerTargetDate: string | null | undefined;
  testerTargetDate: string | null | undefined;
  developerOverdue: boolean;
  testerOverdue: boolean;
  overallPercent: number;
  pipelineLabel: string;
  adminVerified: boolean;
};

const defaultCompliance: ProjectComplianceSummaryLite = {
  pipeline_stage: 'developer_unverified',
  developer_verified: 0,
  developer_total: 0,
  tester_verified: 0,
  tester_total: 0,
  project_verified: 0,
  project_total: 0,
  emergency_bypass: false,
};

export function buildProjectComplianceOverview(
  project: Project,
  now = new Date()
): ProjectComplianceOverview {
  const compliance = project.compliance ?? defaultCompliance;
  const developerVerified = compliance.developer_verified ?? 0;
  const developerTotal = compliance.developer_total ?? 0;
  const testerVerified = compliance.tester_verified ?? 0;
  const testerTotal = compliance.tester_total ?? 0;
  const projectVerified = compliance.project_verified ?? 0;
  const projectTotal = compliance.project_total ?? 0;

  const developerTargetDate = project.developer_compliance_complete_date;
  const testerTargetDate = project.tester_compliance_complete_date;

  const developerStatus = getPhaseStatus(
    developerVerified,
    developerTotal,
    developerTargetDate,
    now
  );
  const testerStatus = getPhaseStatus(
    testerVerified,
    testerTotal,
    testerTargetDate,
    now
  );
  const adminStatus = getAdminComplianceStatus(compliance);

  const totalChecks = developerTotal + testerTotal + projectTotal;
  const verifiedChecks = developerVerified + testerVerified + projectVerified;
  const overallPercent =
    totalChecks > 0 ? Math.round((verifiedChecks / totalChecks) * 100) : 0;

  return {
    project,
    developerStatus,
    testerStatus,
    adminStatus,
    developerVerified,
    developerTotal,
    testerVerified,
    testerTotal,
    developerTargetDate,
    testerTargetDate,
    developerOverdue: isComplianceOverdue(
      developerVerified,
      developerTotal,
      developerTargetDate,
      now
    ),
    testerOverdue: isComplianceOverdue(
      testerVerified,
      testerTotal,
      testerTargetDate,
      now
    ),
    overallPercent,
    pipelineLabel: getPipelineStageLabel(compliance.pipeline_stage),
    adminVerified: isCompliancePipelineSatisfied(compliance),
  };
}

export type ComplianceStatusCounts = {
  completed: number;
  pending: number;
  not_started: number;
};

export function countByStatus(
  items: ProjectComplianceOverview[],
  pickStatus: (item: ProjectComplianceOverview) => CompliancePhaseStatus
): ComplianceStatusCounts {
  return items.reduce<ComplianceStatusCounts>(
    (acc, item) => {
      acc[pickStatus(item)] += 1;
      return acc;
    },
    { completed: 0, pending: 0, not_started: 0 }
  );
}

export function matchesComplianceFilter(
  item: ProjectComplianceOverview,
  tab: ComplianceFilterTab,
  role: 'admin' | 'developer' | 'tester'
): boolean {
  if (tab === 'all') return true;

  if (role === 'developer') {
    return item.developerStatus === tab;
  }
  if (role === 'tester') {
    return item.testerStatus === tab;
  }

  return (
    item.developerStatus === tab ||
    item.testerStatus === tab ||
    item.adminStatus === tab
  );
}

export function getDefaultComplianceTab(
  role: 'admin' | 'developer' | 'tester'
): ComplianceFilterTab {
  if (role === 'developer' || role === 'tester') return 'pending';
  return 'all';
}
