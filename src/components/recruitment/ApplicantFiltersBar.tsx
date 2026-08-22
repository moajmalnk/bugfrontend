import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LIST_FILTER_COL,
  LIST_FILTER_LABEL,
  ListSearchFilterPanel,
  listFilterTriggerClass,
} from '@/components/layout/list-page';
import type { RecruitmentStatus } from '@/services/recruitmentService';
import { Briefcase, Building2, FileText, ArrowUpDown } from 'lucide-react';

export type ApplicantFilters = {
  q: string;
  status: RecruitmentStatus | 'all';
  department: string;
  role: string;
  has_resume: 'any' | 'yes' | 'no';
  sort: 'newest' | 'oldest' | 'name';
};

type ApplicantFiltersBarProps = {
  filters: ApplicantFilters;
  onChange: (next: ApplicantFilters) => void;
  departments: string[];
  roles: string[];
  /** When true, hide stage filter (tabs own stage grouping). */
  hideStageFilter?: boolean;
};

export function ApplicantFiltersBar({
  filters,
  onChange,
  departments,
  roles,
  hideStageFilter = true,
}: ApplicantFiltersBarProps) {
  const patch = (partial: Partial<ApplicantFilters>) =>
    onChange({ ...filters, ...partial });

  const hasActiveFilters =
    Boolean(filters.q.trim()) ||
    (!hideStageFilter && filters.status !== 'all') ||
    filters.department !== 'all' ||
    filters.role !== 'all' ||
    filters.has_resume !== 'any' ||
    filters.sort !== 'newest';

  const clearAll = () =>
    onChange({
      q: '',
      status: 'all',
      department: 'all',
      role: 'all',
      has_resume: 'any',
      sort: 'newest',
    });

  return (
    <ListSearchFilterPanel
      accent="emerald"
      title="Search & Filter"
      description="Find candidates by name, contact, department, role, or resume."
      searchValue={filters.q}
      onSearchChange={(q) => patch({ q })}
      searchPlaceholder="Search name, email, role, phone, notes…"
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearAll}
    >
      {!hideStageFilter ? (
        <div className={LIST_FILTER_COL}>
          <label className={LIST_FILTER_LABEL}>Stage</label>
          <Select
            value={filters.status}
            onValueChange={(v) =>
              patch({ status: v as ApplicantFilters['status'] })
            }
          >
            <SelectTrigger className={listFilterTriggerClass('emerald')}>
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="hr_screening">HR Screening</SelectItem>
              <SelectItem value="staff_interview">Staff Interview</SelectItem>
              <SelectItem value="final_round">Final Round</SelectItem>
              <SelectItem value="offered">Offered</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className={LIST_FILTER_COL}>
        <label className={LIST_FILTER_LABEL}>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Department
          </span>
        </label>
        <Select
          value={filters.department || 'all'}
          onValueChange={(v) => patch({ department: v === 'all' ? 'all' : v })}
        >
          <SelectTrigger className={listFilterTriggerClass('emerald')}>
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={LIST_FILTER_COL}>
        <label className={LIST_FILTER_LABEL}>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Role
          </span>
        </label>
        <Select
          value={filters.role || 'all'}
          onValueChange={(v) => patch({ role: v === 'all' ? 'all' : v })}
        >
          <SelectTrigger className={listFilterTriggerClass('emerald')}>
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={LIST_FILTER_COL}>
        <label className={LIST_FILTER_LABEL}>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Resume
          </span>
        </label>
        <Select
          value={filters.has_resume}
          onValueChange={(v) =>
            patch({ has_resume: v as ApplicantFilters['has_resume'] })
          }
        >
          <SelectTrigger className={listFilterTriggerClass('emerald')}>
            <SelectValue placeholder="Resume" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="yes">Has resume</SelectItem>
            <SelectItem value="no">Missing resume</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={LIST_FILTER_COL}>
        <label className={LIST_FILTER_LABEL}>
          <span className="inline-flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort
          </span>
        </label>
        <Select
          value={filters.sort}
          onValueChange={(v) => patch({ sort: v as ApplicantFilters['sort'] })}
        >
          <SelectTrigger className={listFilterTriggerClass('emerald')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </ListSearchFilterPanel>
  );
}
