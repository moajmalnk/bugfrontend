import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  RecruitmentApplicant,
  RecruitmentStatus,
} from '@/services/recruitmentService';
import {
  PIPELINE_COLUMNS,
  RECRUITMENT_STATUS_LABELS,
} from '@/services/recruitmentService';
import { Inbox, Plus, UserRoundSearch } from 'lucide-react';
import { ApplicantCard } from './ApplicantCard';

export type RecruitmentBoardTab = 'pipeline' | 'offered' | 'rejected';

type ApplicantPipelineBoardProps = {
  applicants: RecruitmentApplicant[];
  loading?: boolean;
  canManage: boolean;
  tab: RecruitmentBoardTab;
  onEdit: (applicant: RecruitmentApplicant) => void;
  onDelete: (applicant: RecruitmentApplicant) => void;
  onStatusChange: (id: string, status: RecruitmentStatus) => void;
  onCreate?: () => void;
};

function EmptyState({
  title,
  description,
  canManage,
  onCreate,
}: {
  title: string;
  description: string;
  canManage: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
        <Inbox className="h-7 w-7" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {canManage && onCreate ? (
        <Button
          type="button"
          className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-700 hover:to-teal-800"
          onClick={onCreate}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Applicant
        </Button>
      ) : null}
    </div>
  );
}

export function ApplicantPipelineBoard({
  applicants,
  loading,
  canManage,
  tab,
  onEdit,
  onDelete,
  onStatusChange,
  onCreate,
}: ApplicantPipelineBoardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-4">
        {Array.from({ length: tab === 'pipeline' ? 4 : 3 }).map((_, i) => (
          <div
            key={i}
            className={
              tab === 'pipeline'
                ? 'col-span-12 md:col-span-6 xl:col-span-3 space-y-3'
                : 'col-span-12 sm:col-span-6 xl:col-span-4 space-y-3'
            }
          >
            {tab === 'pipeline' ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'pipeline') {
    const pipelineItems = applicants.filter((a) =>
      PIPELINE_COLUMNS.includes(a.status)
    );
    if (pipelineItems.length === 0) {
      return (
        <EmptyState
          title="No candidates in the pipeline"
          description="Add an applicant with a CV or Drive link to start screening."
          canManage={canManage}
          onCreate={onCreate}
        />
      );
    }

    return (
      <div className="grid grid-cols-12 gap-4">
        {PIPELINE_COLUMNS.map((status) => {
          const items = applicants.filter((a) => a.status === status);
          return (
            <section
              key={status}
              className="col-span-12 md:col-span-6 xl:col-span-3 flex flex-col gap-3 min-w-0"
            >
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-gray-900/70">
                <div className="flex min-w-0 items-center gap-2">
                  <UserRoundSearch className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
                    {RECRUITMENT_STATUS_LABELS[status]}
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {items.length}
                </span>
              </div>
              <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                    No applicants
                  </div>
                ) : (
                  items.map((applicant) => (
                    <ApplicantCard
                      key={applicant.id}
                      applicant={applicant}
                      canManage={canManage}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const status: RecruitmentStatus = tab === 'offered' ? 'offered' : 'rejected';
  const items = applicants.filter((a) => a.status === status);

  if (items.length === 0) {
    return (
      <EmptyState
        title={
          tab === 'offered'
            ? 'No offers yet'
            : 'No rejected candidates'
        }
        description={
          tab === 'offered'
            ? 'Candidates moved to Offered will appear here.'
            : 'Rejected candidates are kept here for reference.'
        }
        canManage={canManage}
        onCreate={onCreate}
      />
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {items.map((applicant) => (
        <div key={applicant.id} className="col-span-12 sm:col-span-6 xl:col-span-4">
          <ApplicantCard
            applicant={applicant}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        </div>
      ))}
    </div>
  );
}
