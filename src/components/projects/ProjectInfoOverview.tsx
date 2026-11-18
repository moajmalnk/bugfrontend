import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildDocumentPreviewPagePath } from '@/lib/attachmentUtils';
import {
  assetSlotLinkKey,
  computeProjectDurationDays,
  deadlineTimerToneClass,
  formatProjectDate,
  formatProjectDateTime,
  formatProjectHoursDisplay,
  getDeadlineTimerReminder,
  getProjectStatusLabel,
  hasValidAssetLink,
  isProjectComplianceRequired,
  latestTimelineChange,
  parseAppPublisherMeta,
  parseCategoryAssetLinks,
  parseProjectCategories,
  parseProjectPlatforms,
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_PLATFORM_OPTIONS,
  Project,
  ProjectAttachment,
  ProjectCategory,
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
  Link2,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Smartphone,
  Timer,
  UserCircle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/users/UserAvatar';
import { ProjectDeadlineReminders } from '@/components/projects/ProjectDeadlineReminders';
import { ProjectWorkActivityOverview } from '@/components/projects/ProjectWorkActivityOverview';
import { ProjectTimelineChangeHistory } from '@/components/projects/ProjectTimelineChangeHistory';

interface ProjectInfoOverviewProps {
  project: Project;
  createdByName?: string;
}

function SectionShell({
  title,
  icon: Icon,
  accent = 'blue',
  description,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'slate';
  description?: string;
  action?: React.ReactNode;
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
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-md shrink-0',
                accents[accent]
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {description ? (
                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground leading-snug">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
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
  onMemberClick,
}: {
  label: string;
  members: TeamMemberChip[];
  emptyLabel: string;
  /** Why: Admin / Super Admin open user detail; other roles keep chips non-interactive. */
  onMemberClick?: (member: TeamMemberChip) => void;
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
          {members.map((member) => {
            const chipClass = cn(
              'flex items-center gap-3 min-w-0 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 text-left w-full',
              onMemberClick &&
                'cursor-pointer transition-colors hover:border-emerald-300/80 hover:bg-emerald-50/50 dark:hover:border-emerald-700/60 dark:hover:bg-emerald-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40'
            );
            const avatar = (
              <>
                <UserAvatar
                  name={member.username}
                  avatar={member.avatar}
                  size="sm"
                  alt={`${member.username} profile photo`}
                />
                <p className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
                  {member.username}
                </p>
              </>
            );

            if (onMemberClick) {
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onMemberClick(member)}
                  className={chipClass}
                  aria-label={`View ${member.username} profile`}
                >
                  {avatar}
                </button>
              );
            }

            return (
              <div key={member.id} className={chipClass}>
                {avatar}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusStatPill({
  label,
  status,
  value,
  completedAt,
}: {
  label: string;
  status: Project['status'];
  value: string;
  completedAt?: string | null;
}) {
  const isClosed = status === 'completed' || status === 'release_ready';
  const completedLabel =
    isClosed && completedAt ? formatProjectDateTime(completedAt) : null;

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 min-w-0',
        isClosed
          ? 'border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/30'
          : 'border-gray-200/70 bg-gray-50/50 dark:border-gray-800/70 dark:bg-gray-800/30'
      )}
    >
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
          {isClosed && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          {value}
        </span>
      </div>
      {completedLabel ? (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-100/70 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Calendar className="h-3 w-3 shrink-0" aria-hidden />
          Completed {completedLabel}
        </span>
      ) : null}
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
  lastChange,
}: {
  label: string;
  value: string;
  deadlineHint?: string;
  deadlineTone?: ReturnType<typeof getDeadlineTimerReminder>['tone'];
  lastChange?: { username: string; changedAt: string } | null;
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
        {lastChange ? (
          <p className="text-[11px] text-muted-foreground leading-snug">
            Last changed by {lastChange.username} · {formatProjectDateTime(lastChange.changedAt)}
          </p>
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

function LinkOrText({
  label,
  value,
  hint,
  dotClass,
}: {
  label: string;
  value?: string | null;
  hint?: string;
  dotClass?: string;
}) {
  const content = value?.trim();
  return (
    <div className="min-w-0 rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div className="space-y-0.5 mb-1.5">
        <p className="text-[10px] sm:text-xs font-semibold text-foreground flex items-center gap-1.5">
          {dotClass ? (
            <span className={cn('h-1.5 w-1.5 rounded-full bg-gradient-to-r shrink-0', dotClass)} />
          ) : null}
          {label}
        </p>
        {hint ? <p className="text-[10px] text-muted-foreground pl-3">{hint}</p> : null}
      </div>
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

type AssetSlotView = {
  title: string;
  hint: string;
  category: ProjectCategory;
  folder: string;
  slotKey?: string;
};

const CATEGORY_SLOT_VIEWS: Partial<Record<ProjectCategory, AssetSlotView[]>> = {
  WEB: [
    { title: '.env', hint: 'Environment variables', category: 'WEB', folder: 'config', slotKey: 'web_env' },
    { title: 'JSON config', hint: 'package.json / firebase config', category: 'WEB', folder: 'config', slotKey: 'web_json' },
    { title: 'README', hint: 'readme.md or README.txt', category: 'WEB', folder: 'docs', slotKey: 'web_readme' },
  ],
  PWA: [
    { title: 'manifest.json', hint: 'Web app manifest', category: 'PWA', folder: 'pwa', slotKey: 'pwa_manifest' },
    { title: 'Service worker', hint: 'sw.js / service-worker.js', category: 'PWA', folder: 'pwa', slotKey: 'pwa_sw' },
    { title: 'Icons', hint: 'Icon pack or zip', category: 'PWA', folder: 'icons' },
  ],
  APP: [
    { title: 'App files', hint: 'local.properties, google-services.json', category: 'APP', folder: 'app_files' },
    { title: 'Key store', hint: 'Signing configs', category: 'APP', folder: 'key_store' },
    { title: 'Android builds', hint: '.apk / .aab', category: 'APP', folder: 'builds', slotKey: 'android_builds' },
    { title: 'Mac / iOS IPA', hint: '.ipa package', category: 'APP', folder: 'builds', slotKey: 'mac_ipa' },
  ],
  SEO: [
    { title: 'robots.txt', hint: 'Crawl directives', category: 'SEO', folder: 'seo', slotKey: 'seo_robots' },
    { title: 'sitemap.xml', hint: 'XML sitemap', category: 'SEO', folder: 'seo', slotKey: 'seo_sitemap' },
    { title: 'Keywords', hint: 'CSV / XLSX sheet', category: 'SEO', folder: 'seo', slotKey: 'seo_keywords' },
    { title: 'SEO notes', hint: 'md / txt brief', category: 'SEO', folder: 'seo', slotKey: 'seo_notes' },
  ],
  CREATIVE: [
    { title: 'Brand / creative', hint: 'Images, PDF, design exports', category: 'CREATIVE', folder: 'creative' },
  ],
};

function matchesSlotFile(fileName: string, slotKey?: string): boolean {
  if (!slotKey) return true;
  const n = fileName.toLowerCase();
  if (slotKey === 'web_env') return n === '.env' || n.startsWith('.env.') || n.endsWith('.env');
  if (slotKey === 'web_json') return n.endsWith('.json');
  if (slotKey === 'web_readme') {
    return n === 'readme' || n === 'readme.md' || n === 'readme.txt' || n.startsWith('readme.');
  }
  if (slotKey === 'mac_ipa') return n.endsWith('.ipa');
  if (slotKey === 'android_builds') return !n.endsWith('.ipa');
  if (slotKey === 'pwa_manifest') return n.includes('manifest') || n.endsWith('.json');
  if (slotKey === 'pwa_sw') return n.includes('sw') || n.includes('service-worker') || n.endsWith('.js');
  return true;
}

function AssetSlotCard({
  slot,
  link,
  files,
  role,
  projectId,
}: {
  slot: AssetSlotView;
  link?: string;
  files: ProjectAttachment[];
  role: string;
  projectId: string;
}) {
  const navigate = useNavigate();
  const hasLink = hasValidAssetLink(link);
  const hasFiles = files.length > 0;

  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3 sm:p-3.5 space-y-2.5 min-w-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{slot.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{slot.hint}</p>
      </div>
      {hasLink ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 break-all"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          Open linked resource
        </a>
      ) : null}
      {hasFiles ? (
        <div className="flex flex-col gap-1.5">
          {files.map((att) => (
            <button
              key={att.id}
              type="button"
              onClick={() =>
                navigate(
                  buildDocumentPreviewPagePath(role, {
                    filePath: att.file_path,
                    fileName: att.file_name,
                    returnTo: `/${role}/projects/${projectId}`,
                  })
                )
              }
              className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-left text-xs font-medium hover:border-blue-300 hover:bg-blue-50/40 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{att.file_name}</span>
            </button>
          ))}
        </div>
      ) : null}
      {!hasLink && !hasFiles ? (
        <p className="text-xs text-muted-foreground italic">Not linked or uploaded</p>
      ) : null}
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
  const categories = parseProjectCategories(project.project_categories);
  const assetLinks = parseCategoryAssetLinks(project.category_asset_links);
  const appMeta = parseAppPublisherMeta(project.app_publisher_meta);
  const categoryAttachments = attachments.filter((a) => {
    const cat = String(a.category || '').toUpperCase();
    return cat && cat !== 'GENERAL';
  });
  const generalAttachments = attachments.filter((a) => {
    const cat = String(a.category || '').toUpperCase();
    return !cat || cat === 'GENERAL';
  });
  const categoryLabels = categories.map(
    (c) => PROJECT_CATEGORY_OPTIONS.find((o) => o.value === c)?.label || c
  );
  const appMetaRows = (
    [
      ['account', 'Account'],
      ['company_name', 'Company name'],
      ['mail_id', 'Mail Id'],
      ['contact_number', 'Contact number'],
      ['duns_number', 'DUNS Number'],
      ['account_id', 'Account ID'],
      ['play_store_transaction_id', 'Play store transaction ID'],
      ['app_published_name', 'App published name'],
      ['app_package_id', 'Package ID'],
    ] as const
  ).filter(([key]) => String(appMeta[key] || '').trim());

  const toChip = (m: (typeof members)[number]): TeamMemberChip => ({
    id: m.user_id,
    username: m.username || 'Unknown',
    avatar: m.avatar ?? null,
  });

  const leads = members.filter((m) => m.role === 'manager').map(toChip);
  const developers = members.filter((m) => m.role === 'developer').map(toChip);
  const testers = members.filter((m) => m.role === 'tester').map(toChip);
  const creators = members.filter((m) => m.role === 'creator').map(toChip);

  /** Why: JWT role stays `admin` for Super Admin; both may open profiles. */
  const canOpenUserProfile = role === 'admin';
  const isAssignedMember = members.some(
    (m) => String(m.user_id) === String(currentUser?.id)
  );
  /** Why: Admins edit everything; assigned CODO developers/testers update delivery setup. */
  const canManageProjectSetup =
    role === 'admin' ||
    ((role === 'developer' || role === 'tester') && isAssignedMember);
  const handleTeamMemberClick = (member: TeamMemberChip) => {
    if (!canOpenUserProfile || !member.id) return;
    navigate(`/${role}/users/${member.id}`);
  };
  const setupUpdateAction = canManageProjectSetup ? (
    <Button asChild size="sm" variant="outline" className="rounded-xl h-9">
      <Link to={`/${role}/projects/${project.id}/edit`}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        Update
      </Link>
    </Button>
  ) : null;

  const slotFilesFor = (slot: AssetSlotView) =>
    categoryAttachments.filter((f) => {
      if (String(f.category || '').toUpperCase() !== slot.category) return false;
      const folderOk = !f.folder || String(f.folder) === slot.folder;
      if (!folderOk) return false;
      return matchesSlotFile(f.file_name, slot.slotKey);
    });

  const statusLabel = getProjectStatusLabel(project.status);
  const isActiveClient = project.client_account_status !== 'inactive';
  const deadlineReminder = getDeadlineTimerReminder(project.deadline_date, project.status);

  const history = project.timeline_history || [];
  const lastFor = (fieldKey: string) => {
    const entry = latestTimelineChange(history, fieldKey);
    return entry
      ? { username: entry.changed_by_username, changedAt: entry.changed_at }
      : null;
  };

  const timelineItems = [
    { label: 'Start Date', value: formatProjectDateTime(project.start_date), fieldKey: 'start_date' },
    {
      label: 'Deadline',
      value: formatProjectDateTime(project.deadline_date),
      fieldKey: 'deadline_date',
      deadlineHint: project.deadline_date ? deadlineReminder.label : undefined,
      deadlineTone: project.deadline_date ? deadlineReminder.tone : undefined,
    },
    { label: 'Expected Publish', value: formatProjectDateTime(project.expected_publish_date), fieldKey: 'expected_publish_date' },
    { label: 'Testing Start', value: formatProjectDateTime(project.testing_start_date), fieldKey: 'testing_start_date' },
    { label: 'Testing End', value: formatProjectDateTime(project.testing_end_date), fieldKey: 'testing_end_date' },
    { label: 'Frontend Finish', value: formatProjectDateTime(project.frontend_finish_date), fieldKey: 'frontend_finish_date' },
    { label: 'Backend Finish', value: formatProjectDateTime(project.backend_finish_date), fieldKey: 'backend_finish_date' },
    ...(isProjectComplianceRequired(project)
      ? [
          {
            label: 'Tester Compliance Complete',
            value: formatProjectDateTime(project.tester_compliance_complete_date),
            fieldKey: 'tester_compliance_complete_date',
          },
          {
            label: 'Developer Compliance Complete',
            value: formatProjectDateTime(project.developer_compliance_complete_date),
            fieldKey: 'developer_compliance_complete_date',
          },
        ]
      : []),
    { label: 'Duration', value: `${duration} days` },
    { label: 'Hours Needed', value: formatProjectHoursDisplay(project.estimated_hours) },
    {
      label: 'Developer Hours Taken',
      value: formatProjectHoursDisplay(project.developer_hours_taken),
    },
    {
      label: 'Tester Hours Taken',
      value: formatProjectHoursDisplay(project.tester_hours_taken),
    },
  ];

  const hoursNeededDisplay = formatProjectHoursDisplay(project.estimated_hours);
  const developerHoursDisplay = formatProjectHoursDisplay(project.developer_hours_taken);
  const showHoursNeeded = hoursNeededDisplay !== 'Not set';
  const showDeveloperHours = developerHoursDisplay !== 'Not set';
  const testerHoursDisplay = formatProjectHoursDisplay(project.tester_hours_taken);
  const showTesterHours = testerHoursDisplay !== 'Not set';
  const metricCols =
    5 + (showHoursNeeded ? 1 : 0) + (showDeveloperHours ? 1 : 0) + (showTesterHours ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key metrics strip */}
      <div
        className={cn(
          'grid grid-cols-2 gap-2 sm:gap-3',
          metricCols <= 5
            ? 'xl:grid-cols-5'
            : metricCols === 6
              ? 'xl:grid-cols-6'
              : metricCols === 7
                ? 'xl:grid-cols-7'
                : 'xl:grid-cols-8'
        )}
      >
        <StatPill label="Duration" value={`${duration} days`} highlight />
        {showHoursNeeded ? (
          <StatPill label="Hours Needed" value={hoursNeededDisplay} highlight />
        ) : null}
        {showDeveloperHours ? (
          <StatPill label="Dev Hours" value={developerHoursDisplay} highlight />
        ) : null}
        {showTesterHours ? (
          <StatPill label="Tester Hours" value={testerHoursDisplay} highlight />
        ) : null}
        <StatusStatPill
          label="Status"
          status={project.status}
          value={statusLabel}
          completedAt={
            project.completed_at ||
            ((project.status === 'completed' || project.status === 'release_ready')
              ? project.updated_at || project.created_at
              : null)
          }
        />
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
              onMemberClick={canOpenUserProfile ? handleTeamMemberClick : undefined}
            />
            <TeamRoleMembers
              label="Developers"
              members={developers}
              emptyLabel="Not assigned"
              onMemberClick={canOpenUserProfile ? handleTeamMemberClick : undefined}
            />
            <TeamRoleMembers
              label="QA & Testing"
              members={testers}
              emptyLabel="Not assigned"
              onMemberClick={canOpenUserProfile ? handleTeamMemberClick : undefined}
            />
            <TeamRoleMembers
              label="Creators"
              members={creators}
              emptyLabel="Not assigned"
              onMemberClick={canOpenUserProfile ? handleTeamMemberClick : undefined}
            />
          </div>
        </SectionShell>
      </div>

      <ProjectWorkActivityOverview projectId={project.id} />

      <div className="flex flex-col gap-4 sm:gap-6">
        <SectionShell
          title="Technology Stack"
          description="Languages, frameworks, and tools used across this project"
          icon={Layers}
          accent="amber"
          action={setupUpdateAction}
        >
          <div className="flex flex-col gap-5">
            {categoryLabels.length > 0 ? (
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {categoryLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="rounded-lg px-2.5 py-1 text-xs font-medium"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
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
            <div className="border-t border-border/40 pt-4 space-y-2">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                Reference Sites / Themes
              </p>
              {renderDescription(project.reference_sites_or_themes)}
            </div>
          </div>
        </SectionShell>

        <SectionShell title="Project Timeline" icon={Calendar} accent="blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {timelineItems.map((item) => (
              <TimelineItem
                key={item.label}
                label={item.label}
                value={item.value}
                deadlineHint={item.deadlineHint}
                deadlineTone={item.deadlineTone}
                lastChange={item.fieldKey ? lastFor(item.fieldKey) : null}
              />
            ))}
          </div>
          <div className="mt-5 sm:mt-6 border-t border-border/40 pt-4 sm:pt-5">
            <ProjectTimelineChangeHistory history={history} />
          </div>
        </SectionShell>
      </div>

      {role === 'admin' && (
        <SectionShell title="Deadline reminders" icon={BellRing} accent="amber">
          <ProjectDeadlineReminders projectId={project.id} isAdmin />
        </SectionShell>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <SectionShell
          title="Domains & Deployment"
          description="Frontend, backend, and hosting domains"
          icon={Globe}
          accent="blue"
        >
          <div className="flex flex-col gap-3">
            <LinkOrText
              label="Frontend Domain"
              hint="Public web / SPA domain"
              value={project.frontend_domain}
              dotClass="from-sky-500 to-blue-600"
            />
            <LinkOrText
              label="Backend Domain"
              hint="API / server domain"
              value={project.backend_domain}
              dotClass="from-indigo-500 to-violet-600"
            />
            <LinkOrText
              label="Vercel Domain"
              hint="Vercel preview or production URL"
              value={project.vercel_domain}
              dotClass="from-zinc-500 to-slate-700"
            />
          </div>
        </SectionShell>

        <SectionShell
          title="Platforms & App URLs"
          description="Planning Web, iOS, Android — or both"
          icon={Smartphone}
          accent="violet"
        >
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5 sm:px-3.5 sm:py-3">
              <p className="text-[10px] sm:text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600" />
                Target Platforms
              </p>
              {platformLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {platformLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="rounded-lg border border-violet-200/70 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set</p>
              )}
            </div>
            <LinkOrText
              label="iOS App URL"
              hint="App Store / deep link URL"
              value={project.app_url_ios}
              dotClass="from-blue-500 to-cyan-600"
            />
            <LinkOrText
              label="TestFlight URL"
              hint="https://testflight.apple.com/join/..."
              value={project.testflight_url}
              dotClass="from-sky-500 to-blue-600"
            />
            <LinkOrText
              label="Android App URL"
              hint="Play Store / APK / deep link URL"
              value={project.app_url_android}
              dotClass="from-emerald-500 to-green-600"
            />
          </div>
        </SectionShell>

        <SectionShell
          title="GitHub Repositories"
          description="Separate repos for web frontend, backend, and app"
          icon={Github}
          accent="slate"
        >
          <div className="flex flex-col gap-3">
            <LinkOrText
              label="Web Frontend GitHub"
              value={project.github_frontend}
              dotClass="from-sky-500 to-blue-600"
            />
            <LinkOrText
              label="Backend GitHub"
              value={project.github_backend}
              dotClass="from-indigo-500 to-violet-600"
            />
            <LinkOrText
              label="App GitHub"
              value={project.github_app}
              dotClass="from-violet-500 to-fuchsia-600"
            />
          </div>
        </SectionShell>
      </div>

      {categories.length > 0 ? (
        <SectionShell
          title="Category assets"
          description="Type-specific links and files for selected categories"
          icon={Layers}
          accent="blue"
          action={setupUpdateAction}
        >
          <div className="flex flex-col gap-4 sm:gap-5">
            {categories.includes('APP') && appMetaRows.length > 0 ? (
              <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/15 p-3 sm:p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                    APP publisher details
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Store listing and developer account metadata
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {appMetaRows.map(([key, label]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 min-w-0"
                    >
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                        {label}
                      </p>
                      <p className="text-sm font-medium text-foreground break-all">
                        {appMeta[key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {categories.map((category) => {
              const slots = CATEGORY_SLOT_VIEWS[category] || [];
              if (slots.length === 0) return null;
              const tone =
                category === 'WEB'
                  ? 'border-sky-200/60 dark:border-sky-800/40 bg-sky-50/40 dark:bg-sky-950/15'
                  : category === 'PWA'
                    ? 'border-violet-200/60 dark:border-violet-800/40 bg-violet-50/40 dark:bg-violet-950/15'
                    : category === 'APP'
                      ? 'border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/15'
                      : category === 'SEO'
                        ? 'border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/15'
                        : 'border-pink-200/60 dark:border-pink-800/40 bg-pink-50/40 dark:bg-pink-950/15';
              return (
                <div
                  key={category}
                  className={cn('rounded-2xl border p-3 sm:p-4 space-y-3', tone)}
                >
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{category} assets</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Linked resources and uploaded files for this category
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {slots.map((slot) => (
                      <AssetSlotCard
                        key={`${slot.category}:${slot.folder}:${slot.slotKey || 'root'}`}
                        slot={slot}
                        link={assetLinks[assetSlotLinkKey(slot.category, slot.folder, slot.slotKey)]}
                        files={slotFilesFor(slot)}
                        role={role}
                        projectId={project.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionShell>
      ) : null}

      <SectionShell
        title="General attachments"
        description="Extra docs not tied to a category slot"
        icon={Paperclip}
        accent="slate"
        action={setupUpdateAction}
      >
        {generalAttachments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {generalAttachments.map((att) => (
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
            <p className="text-sm text-muted-foreground">No general attachments yet</p>
            {canManageProjectSetup ? (
              <p className="text-xs text-muted-foreground mt-1">
                Use Update to upload miscellaneous project files
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Assigned developers and testers can update setup on their projects
              </p>
            )}
          </div>
        )}
      </SectionShell>
    </div>
  );
}
