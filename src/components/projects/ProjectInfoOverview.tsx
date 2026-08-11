import { Badge } from '@/components/ui/badge';
import { buildDocumentPreviewPagePath } from '@/lib/attachmentUtils';
import {
  computeProjectDurationDays,
  deadlineTimerToneClass,
  formatProjectDate,
  getDeadlineTimerReminder,
  getProjectStatusLabel,
  parseProjectPlatforms,
  Project,
  PROJECT_PLATFORM_OPTIONS,
  projectStatusBadgeClass,
} from '@/lib/utils/projectUtils';
import { useAuth } from '@/context/AuthContext';
import {
  BellRing,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Github,
  Globe,
  Layers,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Smartphone,
  Timer,
  UserCircle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/users/UserAvatar';
import { ProjectDeadlineReminders } from '@/components/projects/ProjectDeadlineReminders';
import { ProjectWorkActivityOverview } from '@/components/projects/ProjectWorkActivityOverview';

interface ProjectInfoOverviewProps {
  project: Project;
  createdByName?: string;
}

function SectionShell({
  title,
  icon: Icon,
  accent = 'blue',
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'slate';
  children: React.ReactNode;
  className?: string;
}) {
  const accents = {
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-teal-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
    slate: 'from-slate-500 to-slate-700',
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-50/40 via-transparent to-blue-50/20 dark:from-gray-800/20 dark:to-blue-950/10" />
      <div className="relative p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div
            className={cn(
              'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-md',
              accents[accent]
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </section>
  );
}

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 min-w-0',
        highlight
          ? 'border-blue-200/80 bg-blue-50/60 dark:border-blue-800/60 dark:bg-blue-950/30'
          : 'border-gray-200/70 bg-gray-50/50 dark:border-gray-800/70 dark:bg-gray-800/30'
      )}
    >
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </p>
      <p className="mt-1 text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-words">
        {value}
      </p>
    </div>
  );
}

function DetailField({
  label,
  value,
  icon: Icon,
  empty = '—',
}: {
  label: string;
  value?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  empty?: string;
}) {
  const display = value?.trim() || empty;
  const isEmpty = !value?.trim() || display === empty;

  return (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex items-start gap-2 min-w-0">
        {Icon && (
          <Icon
            className={cn(
              'h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 shrink-0',
              isEmpty ? 'text-muted-foreground/50' : 'text-blue-500 dark:text-blue-400'
            )}
          />
        )}
        <p
          className={cn(
            'text-sm font-medium break-words',
            isEmpty ? 'text-muted-foreground italic' : 'text-gray-900 dark:text-gray-100'
          )}
        >
          {display}
        </p>
      </div>
    </div>
  );
}

type TeamMemberChip = {
  id: string;
  username: string;
  avatar?: string | null;
};

function TeamRoleMembers({
  label,
  members,
  emptyLabel,
}: {
  label: string;
  members: TeamMemberChip[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 min-w-0 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5"
            >
              <UserAvatar
                name={member.username}
                avatar={member.avatar}
                size="sm"
                alt={`${member.username} profile photo`}
              />
              <p className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
                {member.username}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusStatPill({
  label,
  status,
  value,
}: {
  label: string;
  status: Project['status'];
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200/70 bg-gray-50/50 px-3 py-2.5 sm:px-4 sm:py-3 min-w-0 dark:border-gray-800/70 dark:bg-gray-800/30">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </p>
      <div className="mt-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
            projectStatusBadgeClass(status)
          )}
        >
          {(status === 'completed' || status === 'release_ready') && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          {value}
        </span>
      </div>
    </div>
  );
}

function DeadlineStatPill({
  deadline,
  status,
}: {
  deadline?: string | null;
  status: Project['status'];
}) {
  const reminder = getDeadlineTimerReminder(deadline, status);
  const dateLabel = formatProjectDate(deadline);

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 min-w-0',
        reminder.tone === 'overdue'
          ? 'border-red-300/80 bg-red-50/80 dark:border-red-800/60 dark:bg-red-950/30'
          : reminder.tone === 'today' || reminder.tone === 'soon'
            ? 'border-orange-300/80 bg-orange-50/80 dark:border-orange-800/60 dark:bg-orange-950/30'
            : reminder.tone === 'done'
              ? 'border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/30'
              : 'border-blue-200/80 bg-blue-50/60 dark:border-blue-800/60 dark:bg-blue-950/30'
      )}
    >
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
        Deadline
      </p>
      <p className="mt-1 text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-words">
        {dateLabel}
      </p>
      <span
        className={cn(
          'mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold',
          deadlineTimerToneClass(reminder.tone)
        )}
      >
        <Timer className="h-3 w-3 shrink-0" aria-hidden />
        {reminder.label}
      </span>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  deadlineHint,
  deadlineTone,
}: {
  label: string;
  value: string;
  deadlineHint?: string;
  deadlineTone?: ReturnType<typeof getDeadlineTimerReminder>['tone'];
}) {
  const isUnset = value === 'Not set';
  const isDeadline = label === 'Deadline' && deadlineHint;

  return (
    <div className="flex items-start gap-3 min-w-0">
      <div
        className={cn(
          'mt-1.5 h-2 w-2 rounded-full shrink-0',
          isDeadline && deadlineTone === 'overdue'
            ? 'bg-red-500'
            : isDeadline && (deadlineTone === 'today' || deadlineTone === 'soon')
              ? 'bg-amber-500'
              : isDeadline && deadlineTone === 'done'
                ? 'bg-emerald-500'
                : isUnset
                  ? 'bg-gray-300 dark:bg-gray-600'
                  : 'bg-emerald-500'
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-sm font-medium',
            isUnset ? 'text-muted-foreground italic' : 'text-gray-900 dark:text-white'
          )}
        >
          {value}
        </p>
        {isDeadline && deadlineHint ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              deadlineTimerToneClass(deadlineTone ?? 'none')
            )}
          >
            <Timer className="h-3 w-3 shrink-0" aria-hidden />
            {deadlineHint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function renderDescription(text?: string) {
  const content = text?.trim();
  if (!content) {
    return (
      <p className="text-sm text-muted-foreground italic">No description provided.</p>
    );
  }

  const urlMatch = content.match(/^https?:\/\/\S+$/i);
  if (urlMatch) {
    return (
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
      >
        {content}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
      {content}
    </p>
  );
}

function LinkOrText({ label, value }: { label: string; value?: string | null }) {
  const content = value?.trim();
  return (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {content ? (
        /^https?:\/\//i.test(content) ? (
          <a
            href={content}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {content}
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{content}</p>
        )
      ) : (
        <p className="text-sm text-muted-foreground italic">Not set</p>
      )}
    </div>
  );
}

export function ProjectInfoOverview({ project, createdByName }: ProjectInfoOverviewProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'admin';
  const duration = computeProjectDurationDays(project);
  const members = project.members_detail || [];
  const attachments = project.attachments || [];
  const techStack = project.technology_stack
    ? project.technology_stack.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const platforms = parseProjectPlatforms(project.platforms);
  const platformLabels = platforms.map(
    (p) => PROJECT_PLATFORM_OPTIONS.find((o) => o.value === p)?.label || p
  );

  const toChip = (m: (typeof members)[number]): TeamMemberChip => ({
    id: m.user_id,
    username: m.username || 'Unknown',
    avatar: m.avatar ?? null,
  });

  const leads = members.filter((m) => m.role === 'manager').map(toChip);
  const developers = members.filter((m) => m.role === 'developer').map(toChip);
  const testers = members.filter((m) => m.role === 'tester').map(toChip);

  const statusLabel = getProjectStatusLabel(project.status);
  const isActiveClient = project.client_account_status !== 'inactive';
  const deadlineReminder = getDeadlineTimerReminder(project.deadline_date, project.status);

  const timelineItems = [
    { label: 'Start Date', value: formatProjectDate(project.start_date) },
    {
      label: 'Deadline',
      value: formatProjectDate(project.deadline_date),
      deadlineHint: project.deadline_date ? deadlineReminder.label : undefined,
      deadlineTone: project.deadline_date ? deadlineReminder.tone : undefined,
    },
    { label: 'Expected Publish', value: formatProjectDate(project.expected_publish_date) },
    { label: 'Testing Start', value: formatProjectDate(project.testing_start_date) },
    { label: 'Testing End', value: formatProjectDate(project.testing_end_date) },
    { label: 'Frontend Finish', value: formatProjectDate(project.frontend_finish_date) },
    { label: 'Backend Finish', value: formatProjectDate(project.backend_finish_date) },
    { label: 'Duration', value: `${duration} days` },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key metrics strip */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 sm:gap-3">
        <StatPill label="Duration" value={`${duration} days`} highlight />
        <StatusStatPill label="Status" status={project.status} value={statusLabel} />
        <DeadlineStatPill deadline={project.deadline_date} status={project.status} />
        <StatPill label="Created" value={formatProjectDate(project.created_at)} />
        <StatPill label="Created By" value={createdByName || 'System'} />
      </div>

      {deadlineReminder.tone === 'overdue' && (
        <div className="rounded-xl border border-red-300/80 bg-gradient-to-r from-red-50/90 to-orange-50/70 px-4 py-3 dark:border-red-800/60 dark:from-red-950/40 dark:to-orange-950/30">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-700 dark:text-red-300">
              <Timer className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Deadline delayed
              </p>
              <p className="text-xs sm:text-sm text-red-700/90 dark:text-red-300/90 mt-0.5">
                {deadlineReminder.label}. Review timeline and update stakeholders.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Description — full width */}
      <SectionShell title="About Project" icon={FileText} accent="blue">
        {renderDescription(project.description)}
      </SectionShell>

      {/* Two-column dashboard on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <SectionShell title="Client Details" icon={Building2} accent="violet">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
            <DetailField label="Client" value={project.client_name} icon={Building2} />
            <DetailField
              label="Location"
              value={project.client_location}
              icon={MapPin}
              empty="Not provided"
            />
            <DetailField
              label="Primary Contact"
              value={project.client_contact_name}
              icon={UserCircle}
            />
            <DetailField label="Email" value={project.client_email} icon={Mail} />
            <DetailField label="Phone" value={project.client_phone} icon={Phone} />
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2">
                Account Status
              </p>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-semibold',
                  isActiveClient
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                )}
              >
                {isActiveClient ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </SectionShell>

        <SectionShell title="Team Allocation" icon={Users} accent="emerald">
          <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
            <TeamRoleMembers
              label="Project Lead"
              members={leads}
              emptyLabel="Not assigned"
            />
            <TeamRoleMembers
              label="Developers"
              members={developers}
              emptyLabel="Not assigned"
            />
            <TeamRoleMembers
              label="QA & Testing"
              members={testers}
              emptyLabel="Not assigned"
            />
          </div>
        </SectionShell>
      </div>

      <ProjectWorkActivityOverview projectId={project.id} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <SectionShell title="Technology Stack" icon={Layers} accent="amber" className="xl:col-span-1">
          {techStack.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {techStack.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="rounded-lg px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/60"
                >
                  {item}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not specified</p>
          )}
        </SectionShell>

        <SectionShell title="Project Timeline" icon={Calendar} accent="blue" className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {timelineItems.map((item) => (
              <TimelineItem
                key={item.label}
                label={item.label}
                value={item.value}
                deadlineHint={item.deadlineHint}
                deadlineTone={item.deadlineTone}
              />
            ))}
          </div>
        </SectionShell>
      </div>

      {role === 'admin' && (
        <SectionShell title="Deadline reminders" icon={BellRing} accent="amber">
          <ProjectDeadlineReminders projectId={project.id} isAdmin />
        </SectionShell>
      )}

      <SectionShell title="Reference Sites / Themes" icon={ExternalLink} accent="slate">
        {renderDescription(project.reference_sites_or_themes)}
      </SectionShell>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <SectionShell title="Domains & Deployment" icon={Globe} accent="blue">
          <div className="space-y-4">
            <LinkOrText label="Frontend Domain" value={project.frontend_domain} />
            <LinkOrText label="Backend Domain" value={project.backend_domain} />
            <LinkOrText label="Vercel Domain" value={project.vercel_domain} />
          </div>
        </SectionShell>

        <SectionShell title="Platforms & App URLs" icon={Smartphone} accent="violet">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2">
                Target Platforms
              </p>
              {platformLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {platformLabels.map((label) => (
                    <Badge key={label} variant="secondary" className="rounded-lg">
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set</p>
              )}
            </div>
            <LinkOrText label="iOS App URL" value={project.app_url_ios} />
            <LinkOrText label="Android App URL" value={project.app_url_android} />
            <LinkOrText label="TestFlight URL" value={project.testflight_url} />
          </div>
        </SectionShell>

        <SectionShell title="GitHub Repositories" icon={Github} accent="slate">
          <div className="space-y-4">
            <LinkOrText label="Web Frontend" value={project.github_frontend} />
            <LinkOrText label="Backend" value={project.github_backend} />
            <LinkOrText label="App" value={project.github_app} />
          </div>
        </SectionShell>
      </div>

      <SectionShell title="Attachments" icon={Paperclip} accent="slate">
        {attachments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {attachments.map((att) => (
              <button
                key={att.id}
                type="button"
                onClick={() =>
                  navigate(
                    buildDocumentPreviewPagePath(role, {
                      filePath: att.file_path,
                      fileName: att.file_name,
                      returnTo: `/${role}/projects/${project.id}`,
                    })
                  )
                }
                className="group flex w-full items-center gap-3 rounded-xl border border-gray-200/70 bg-white/60 px-3 py-2.5 text-left transition-all hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700/70 dark:bg-gray-800/40 dark:hover:border-blue-700 dark:hover:bg-blue-950/20 sm:px-4 sm:py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-blue-100 dark:bg-gray-800 dark:group-hover:bg-blue-900/40">
                  <FileText className="h-4 w-4 text-gray-600 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {att.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Click to preview</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300/80 bg-gray-50/30 py-8 px-4 dark:border-gray-700 dark:bg-gray-800/20">
            <Paperclip className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No attachments uploaded yet</p>
          </div>
        )}
      </SectionShell>
    </div>
  );
}
