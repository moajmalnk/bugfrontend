import {
  getPipelineStageLabel,
  isClosedProjectStatus,
  isCompliancePipelineSatisfied,
  type ProjectComplianceSummary,
} from '@/lib/codo/complianceRules';
import {
  isProjectComplianceRequired,
  type Project,
  type ProjectComplianceSummaryLite,
} from '@/lib/utils/projectUtils';

export type CompliancePhaseStatus = 'completed' | 'pending' | 'not_started';

/** Role tabs: Admins / Dev / Tester — each shows that side’s Pending projects only. */
export type ComplianceMembershipTab = 'admins' | 'dev' | 'testers';

/** Project-level exemption — not a pipeline phase. */
export type ComplianceExemptionTab = 'not_required';

export type ComplianceFilterTab =
  | 'all'
  | CompliancePhaseStatus
  | ComplianceExemptionTab
  | ComplianceMembershipTab;

export type CompliancePhase = 'developer' | 'tester';

/**
 * Why: Search bar verified-combo filter — which roles have finished their side.
 * Values are exact phase/admin completed flags from the overview row.
 */
export type ComplianceVerifiedFilter =
  | 'all'
  | 'admin_only'
  | 'developer_only'
  | 'tester_only'
  | 'admin_developer'
  | 'admin_tester'
  | 'developer_tester'
  | 'all_verified'
  | 'none_verified';

export const COMPLIANCE_VERIFIED_FILTER_OPTIONS: {
  value: ComplianceVerifiedFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All verifications' },
  { value: 'admin_only', label: 'Admin verified only' },
  { value: 'developer_only', label: 'Developer verified only' },
  { value: 'tester_only', label: 'Tester verified only' },
  { value: 'admin_developer', label: 'Admin + Developer verified' },
  { value: 'admin_tester', label: 'Admin + Tester verified' },
  { value: 'developer_tester', label: 'Developer + Tester verified' },
  { value: 'all_verified', label: 'All sides verified' },
  { value: 'none_verified', label: 'None verified yet' },
];

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
  /** False when project opted out via compliance_required = 0. */
  complianceRequired: boolean;
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

/**
 * Why: Exempt projects still appear on the overview under the Not required tab.
 */
export function buildNotRequiredComplianceOverview(
  project: Project
): ProjectComplianceOverview {
  return {
    project,
    complianceRequired: false,
    developerStatus: 'not_started',
    testerStatus: 'not_started',
    adminStatus: 'not_started',
    developerVerified: 0,
    developerTotal: 0,
    testerVerified: 0,
    testerTotal: 0,
    developerTargetDate: null,
    testerTargetDate: null,
    developerOverdue: false,
    testerOverdue: false,
    overallPercent: 0,
    pipelineLabel: 'Not required',
    adminVerified: false,
  };
}

export function buildProjectComplianceOverview(
  project: Project,
  now = new Date()
): ProjectComplianceOverview {
  if (!isProjectComplianceRequired(project)) {
    return buildNotRequiredComplianceOverview(project);
  }

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
    complianceRequired: true,
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
  return items
    .filter((item) => item.complianceRequired)
    .reduce<ComplianceStatusCounts>(
      (acc, item) => {
        acc[pickStatus(item)] += 1;
        return acc;
      },
      { completed: 0, pending: 0, not_started: 0 }
    );
}

export function countNotRequiredProjects(
  items: ProjectComplianceOverview[]
): number {
  return items.filter((item) => !item.complianceRequired).length;
}

/**
 * Why: Admin Final Lock (or closed project status) means the project is done.
 * Those must only appear under Completed — never Pending / Not started.
 */
export function isProjectComplianceComplete(
  item: ProjectComplianceOverview
): boolean {
  if (item.adminVerified || item.adminStatus === 'completed') {
    return true;
  }
  const status = String(item.project?.status || '').toLowerCase();
  return isClosedProjectStatus(status);
}

/**
 * Why: Combo filter for Admin / Developer / Tester verified sides in Search & Filter.
 */
export function matchesVerifiedFilter(
  item: ProjectComplianceOverview,
  filter: ComplianceVerifiedFilter
): boolean {
  if (filter === 'all') return true;

  const admin = item.adminVerified || item.adminStatus === 'completed';
  const developer = item.developerStatus === 'completed';
  const tester = item.testerStatus === 'completed';

  switch (filter) {
    case 'admin_only':
      return admin;
    case 'developer_only':
      return developer;
    case 'tester_only':
      return tester;
    case 'admin_developer':
      return admin && developer;
    case 'admin_tester':
      return admin && tester;
    case 'developer_tester':
      return developer && tester;
    case 'all_verified':
      return admin && developer && tester;
    case 'none_verified':
      return !admin && !developer && !tester;
    default:
      return true;
  }
}

export function matchesComplianceFilter(
  item: ProjectComplianceOverview,
  tab: ComplianceFilterTab,
  role: 'admin' | 'developer' | 'tester',
  _userId?: string | number | null
): boolean {
  if (tab === 'not_required') {
    return !item.complianceRequired;
  }

  // Exempt projects only belong on the Not required tab.
  if (!item.complianceRequired) {
    return false;
  }

  if (tab === 'all') return true;

  // Why: Role tabs = that side’s Pending only (same numbers as the matrix cards).
  if (tab === 'admins') return item.adminStatus === 'pending';
  if (tab === 'dev') return item.developerStatus === 'pending';
  if (tab === 'testers') return item.testerStatus === 'pending';

  // Completed projects are exclusive to the Completed tab for every role.
  if (isProjectComplianceComplete(item)) {
    return tab === 'completed';
  }

  if (tab === 'completed') {
    return false;
  }

  if (role === 'developer') {
    return item.developerStatus === tab;
  }
  if (role === 'tester') {
    return item.testerStatus === tab;
  }

  // Admin: among incomplete projects, Pending/Not started if any phase matches.
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
