import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildAttachmentUrl } from '@/lib/attachmentUtils';
import { cn } from '@/lib/utils';
import type {
  RecruitmentApplicant,
  RecruitmentStatus,
} from '@/services/recruitmentService';
import { RECRUITMENT_STATUS_LABELS } from '@/services/recruitmentService';
import {
  Briefcase,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';

type ApplicantCardProps = {
  applicant: RecruitmentApplicant;
  canManage: boolean;
  onEdit: (applicant: RecruitmentApplicant) => void;
  onDelete: (applicant: RecruitmentApplicant) => void;
  onStatusChange: (id: string, status: RecruitmentStatus) => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ApplicantCard({
  applicant,
  canManage,
  onEdit,
  onDelete,
  onStatusChange,
}: ApplicantCardProps) {
  const resumeFile = (applicant.attachments ?? []).find((a) => a.kind === 'resume');

  return (
    <article className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-sm font-bold text-emerald-600 dark:text-emerald-400">
          {initials(applicant.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">
                {applicant.full_name}
              </h3>
              {applicant.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {applicant.email}
                </p>
              ) : null}
            </div>
            {canManage ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => onEdit(applicant)}
                  aria-label="Edit applicant"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                  onClick={() => onDelete(applicant)}
                  aria-label="Delete applicant"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {applicant.department ? (
              <span className="rounded-xl bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {applicant.department}
              </span>
            ) : null}
            {applicant.has_resume ? (
              <span className="rounded-xl bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                CV Ready
              </span>
            ) : (
              <span className="rounded-xl bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                No CV
              </span>
            )}
          </div>

          {(applicant.role_applied || applicant.experience) && (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {applicant.role_applied ? (
                <p className="flex min-w-0 items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{applicant.role_applied}</span>
                </p>
              ) : null}
              {applicant.experience ? (
                <p className="truncate pl-5">{applicant.experience}</p>
              ) : null}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {resumeFile ? (
              <a
                href={buildAttachmentUrl(resumeFile.file_path, resumeFile.file_name)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl border border-border px-2 py-1',
                  'text-[11px] font-medium text-foreground hover:bg-muted'
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Resume
              </a>
            ) : null}
            {applicant.resume_drive_link ? (
              <a
                href={applicant.resume_drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl border border-border px-2 py-1',
                  'text-[11px] font-medium text-foreground hover:bg-muted'
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Drive
              </a>
            ) : null}
          </div>

          <div className="mt-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Current Stage
            </p>
            <Select
              value={applicant.status}
              onValueChange={(v) =>
                onStatusChange(applicant.id, v as RecruitmentStatus)
              }
              disabled={!canManage}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {(Object.keys(RECRUITMENT_STATUS_LABELS) as RecruitmentStatus[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {RECRUITMENT_STATUS_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </article>
  );
}
