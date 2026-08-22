import { ComplianceProjectTeam } from '@/components/compliance/ComplianceProjectTeam';
import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { daysUntilComplianceDate, type ProjectComplianceOverview } from '@/lib/codo/complianceStatus';
import { cn } from '@/lib/utils';
import { formatLocalDate } from '@/lib/utils/dateUtils';
import { getProjectStatusLabel, type ProjectStatus } from '@/lib/utils/projectUtils';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Code2,
  Crown,
  FlaskConical,
  FolderOpen,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function formatTargetDate(value: string | null | undefined): string {
  if (!value) return 'No date set';
  return formatLocalDate(value, 'datetime');
}

function PhaseCell({
  status,
  verified,
  total,
  targetDate,
  overdue,
}: {
  status: ProjectComplianceOverview['developerStatus'];
  verified: number;
  total: number;
  targetDate: string | null | undefined;
  overdue: boolean;
}) {
  const days = daysUntilComplianceDate(targetDate);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <ComplianceStatusBadge status={status} />
        <span className="text-xs font-bold text-foreground tabular-nums">
          {verified}/{total || '—'}
        </span>
      </div>
      <div
        className={cn(
          'flex items-start gap-1.5 text-xs min-w-0',
          overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
        )}
      >
        <CalendarClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span className="break-words">{formatTargetDate(targetDate)}</span>
      </div>
      {overdue && (
        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">Overdue</span>
      )}
      {!overdue && days !== null && days >= 0 && days <= 7 && status !== 'completed' && (
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          Due in {days} day{days === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}

function ProgressMiniBar({ percent }: { percent: number }) {
  return (
    <div className="space-y-1.5 min-w-[7rem]">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
        <span>Overall progress</span>
        <span className="font-bold tabular-nums text-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

interface ComplianceRowProps {
  item: ProjectComplianceOverview;
  role: string;
  showAdminColumn: boolean;
  listFromState: { from: string; page?: number };
  index: number;
}

function ComplianceTableRow({
  item,
  role,
  showAdminColumn,
  listFromState,
  index,
}: ComplianceRowProps) {
  const { project } = item;
  const status = (project.status ?? 'active') as ProjectStatus;
  const compliancePath = `/${role}/projects/${project.id}/compliance`;

  return (
      <TableRow
        className={cn(
          'group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-emerald-50/50 dark:hover:from-blue-900/20 dark:hover:to-emerald-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50',
          index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
        )}
      >
        <TableCell className="align-top min-w-[11rem] max-w-[14rem] px-4 py-4">
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shrink-0">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white break-words group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  {project.name}
                </p>
                {project.client_name && (
                  <p className="text-xs text-muted-foreground break-words mt-0.5">
                    {project.client_name}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="w-fit rounded-full text-[10px] capitalize">
              {getProjectStatusLabel(status)}
            </Badge>
            <ProgressMiniBar percent={item.overallPercent} />
          </div>
        </TableCell>
        <TableCell className="align-top min-w-[12rem] max-w-[18rem] px-4 py-4">
          <ComplianceProjectTeam project={project} density="compact" />
        </TableCell>
        <TableCell className="align-top px-4 py-4">
          <PhaseCell
            status={item.developerStatus}
            verified={item.developerVerified}
            total={item.developerTotal}
            targetDate={item.developerTargetDate}
            overdue={item.developerOverdue}
          />
        </TableCell>
        <TableCell className="align-top px-4 py-4">
          <PhaseCell
            status={item.testerStatus}
            verified={item.testerVerified}
            total={item.testerTotal}
            targetDate={item.testerTargetDate}
            overdue={item.testerOverdue}
          />
        </TableCell>
        {showAdminColumn && (
          <TableCell className="align-top px-4 py-4">
            <div className="flex flex-col gap-2">
              <ComplianceStatusBadge status={item.adminStatus} />
              <span className="text-xs text-muted-foreground break-words font-medium">
                {item.pipelineLabel}
              </span>
              {item.adminVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Admin verified
                </span>
              )}
            </div>
          </TableCell>
        )}
        <TableCell className="align-top text-right px-4 py-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
          >
            <Link to={compliancePath} state={listFromState}>
              Open
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </TableCell>
      </TableRow>
  );
}

function ComplianceProjectCard({
  item,
  role,
  showAdminColumn,
  listFromState,
}: Omit<ComplianceRowProps, 'index'>) {
  const { project } = item;
  const status = (project.status ?? 'active') as ProjectStatus;
  const compliancePath = `/${role}/projects/${project.id}/compliance`;

  return (
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shrink-0">
                  <FolderOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white break-words">
                  {project.name}
                </h3>
              </div>
              {project.client_name && (
                <p className="text-xs text-muted-foreground mt-1 break-words pl-10">
                  {project.client_name}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="rounded-full text-[10px] capitalize shrink-0">
              {getProjectStatusLabel(status)}
            </Badge>
          </div>

          <ProgressMiniBar percent={item.overallPercent} />

          <ComplianceProjectTeam project={project} density="comfortable" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Code2 className="h-3.5 w-3.5" />
                Developer
              </div>
              <div className="mt-2">
                <PhaseCell
                  status={item.developerStatus}
                  verified={item.developerVerified}
                  total={item.developerTotal}
                  targetDate={item.developerTargetDate}
                  overdue={item.developerOverdue}
                />
              </div>
            </div>
            <div className="rounded-xl border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/40 dark:bg-purple-950/20 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                <FlaskConical className="h-3.5 w-3.5" />
                Tester
              </div>
              <div className="mt-2">
                <PhaseCell
                  status={item.testerStatus}
                  verified={item.testerVerified}
                  total={item.testerTotal}
                  targetDate={item.testerTargetDate}
                  overdue={item.testerOverdue}
                />
              </div>
            </div>
          </div>

          {showAdminColumn && (
            <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                <Crown className="h-3.5 w-3.5" />
                Admin lock
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ComplianceStatusBadge status={item.adminStatus} />
                <span className="text-xs text-muted-foreground">{item.pipelineLabel}</span>
              </div>
            </div>
          )}

          <Button variant="outline" asChild className="w-full rounded-xl h-11 font-semibold">
            <Link to={compliancePath} state={listFromState}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Open compliance
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </Button>
        </div>
      </div>
  );
}

const TableRowSkeleton = ({ showAdminColumn }: { showAdminColumn: boolean }) => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-16 w-full rounded-xl" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-24 w-full rounded-xl" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-14 w-full rounded-xl" />
    </TableCell>
    {showAdminColumn && (
      <TableCell>
        <Skeleton className="h-14 w-full rounded-xl" />
      </TableCell>
    )}
    <TableCell>
      <Skeleton className="h-9 w-20 ml-auto rounded-xl" />
    </TableCell>
  </TableRow>
);

const CardSkeleton = () => (
  <div className="xl:hidden rounded-2xl border bg-card p-5 space-y-3">
    <Skeleton className="h-6 w-3/5 rounded-xl" />
    <Skeleton className="h-4 w-full rounded-xl" />
    <Skeleton className="h-20 w-full rounded-xl" />
    <Skeleton className="h-11 w-full rounded-xl" />
  </div>
);

interface ComplianceOverviewTableProps {
  items: ProjectComplianceOverview[];
  role: string;
  showAdminColumn: boolean;
  loading?: boolean;
  listFromState: { from: string; page?: number };
  emptyMessage: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function ComplianceOverviewTable({
  items,
  role,
  showAdminColumn,
  loading = false,
  listFromState,
  emptyMessage,
  hasActiveFilters = false,
  onClearFilters,
}: ComplianceOverviewTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="hidden xl:block relative overflow-x-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead>Tester</TableHead>
                  {showAdminColumn && <TableHead>Admin lock</TableHead>}
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRowSkeleton key={index} showAdminColumn={showAdminColumn} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex flex-col gap-4 xl:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative overflow-hidden min-h-[280px]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-emerald-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-emerald-950/20 rounded-2xl pointer-events-none" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
            {hasActiveFilters ? (
              <Search className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            ) : (
              <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            )}
          </div>
          <h3 className="mt-6 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {hasActiveFilters ? 'No matching projects' : 'No compliance data'}
          </h3>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {emptyMessage}
          </p>
          {hasActiveFilters && onClearFilters && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onClearFilters}
              className="mt-6 h-11 px-6 rounded-xl font-semibold"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden xl:block relative overflow-x-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl pointer-events-none" />
        <div className="relative min-w-[1120px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
              <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-transparent">
                <TableHead className="min-w-[11rem] px-4 font-bold text-sm text-gray-900 dark:text-white py-4">
                  Project
                </TableHead>
                <TableHead className="min-w-[12rem] px-4 font-bold text-sm text-gray-900 dark:text-white py-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Team
                  </span>
                </TableHead>
                <TableHead className="min-w-[10rem] px-4 font-bold text-sm text-gray-900 dark:text-white py-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-emerald-600" />
                    Developer
                  </span>
                </TableHead>
                <TableHead className="min-w-[10rem] px-4 font-bold text-sm text-gray-900 dark:text-white py-4">
                  <span className="inline-flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4 text-purple-600" />
                    Tester
                  </span>
                </TableHead>
                {showAdminColumn && (
                  <TableHead className="min-w-[9rem] px-4 font-bold text-sm text-gray-900 dark:text-white py-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Crown className="h-4 w-4 text-blue-600" />
                      Admin lock
                    </span>
                  </TableHead>
                )}
                <TableHead className="w-[120px] pr-4 text-right font-bold text-sm text-gray-900 dark:text-white py-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <ComplianceTableRow
                  key={item.project.id}
                  item={item}
                  role={role}
                  showAdminColumn={showAdminColumn}
                  listFromState={listFromState}
                  index={index}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:hidden">
        {items.map((item) => (
          <ComplianceProjectCard
            key={item.project.id}
            item={item}
            role={role}
            showAdminColumn={showAdminColumn}
            listFromState={listFromState}
          />
        ))}
      </div>
    </div>
  );
}
