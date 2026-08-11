export type ProjectStatus = 'active' | 'completed' | 'archived' | 'release_ready';
export type ClientAccountStatus = 'active' | 'inactive';
export type ProjectMemberRole = 'manager' | 'developer' | 'tester';
/** Comma-separated in DB; use helpers below. */
export type ProjectPlatform = 'web' | 'ios' | 'android';
/** Delivery categories — multi-select, separate from device platforms. */
export type ProjectCategory = 'WEB' | 'PWA' | 'APP' | 'SEO' | 'CREATIVE';

import type { ClientSummary } from '@/types';

export const PROJECT_PLATFORM_OPTIONS: { value: ProjectPlatform; label: string }[] = [
  { value: 'web', label: 'Web' },
  { value: 'ios', label: 'iOS App' },
  { value: 'android', label: 'Android App' },
];

export const PROJECT_CATEGORY_OPTIONS: {
  value: ProjectCategory;
  label: string;
  hint: string;
}[] = [
  { value: 'WEB', label: 'WEB', hint: 'Websites & web apps' },
  { value: 'PWA', label: 'PWA', hint: 'Progressive web apps' },
  { value: 'APP', label: 'APP', hint: 'Mobile / store apps' },
  { value: 'SEO', label: 'SEO', hint: 'Search & content' },
  { value: 'CREATIVE', label: 'CREATIVE', hint: 'Brand & design assets' },
];

export interface AppPublisherMeta {
  account?: string;
  company_name?: string;
  mail_id?: string;
  contact_number?: string;
  duns_number?: string;
  account_id?: string;
  play_store_transaction_id?: string;
  app_published_name?: string;
  app_package_id?: string;
}

export const emptyAppPublisherMeta = (): AppPublisherMeta => ({
  account: '',
  company_name: '',
  mail_id: '',
  contact_number: '',
  duns_number: '',
  account_id: '',
  play_store_transaction_id: '',
  app_published_name: '',
  app_package_id: '',
});

export function parseProjectPlatforms(value?: string | null): ProjectPlatform[] {
  if (!value?.trim()) return [];
  const allowed = new Set<ProjectPlatform>(['web', 'ios', 'android']);
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProjectPlatform => allowed.has(s as ProjectPlatform));
}

export function serializeProjectPlatforms(platforms: ProjectPlatform[]): string {
  return platforms.join(',');
}

export function parseProjectCategories(value?: string | null): ProjectCategory[] {
  if (!value?.trim()) return [];
  const allowed = new Set<ProjectCategory>(['WEB', 'PWA', 'APP', 'SEO', 'CREATIVE']);
  return value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is ProjectCategory => allowed.has(s as ProjectCategory));
}

export function serializeProjectCategories(categories: ProjectCategory[]): string {
  return categories.join(',');
}

export function parseAppPublisherMeta(value?: string | null): AppPublisherMeta {
  const empty = emptyAppPublisherMeta();
  if (!value?.trim()) return empty;
  try {
    const parsed = JSON.parse(value) as AppPublisherMeta;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

export function serializeAppPublisherMeta(meta: AppPublisherMeta): string | undefined {
  const cleaned: AppPublisherMeta = {};
  (Object.keys(meta) as (keyof AppPublisherMeta)[]).forEach((key) => {
    const v = String(meta[key] || '').trim();
    if (v) cleaned[key] = v;
  });
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : undefined;
}

/** Drive / cloud URLs keyed by category (`WEB`) or slot (`APP:app_files`, `WEB:config:web_env`). */
export type CategoryAssetLinks = Record<string, string>;

export function emptyCategoryAssetLinks(): CategoryAssetLinks {
  return {};
}

export function assetSlotLinkKey(
  category: ProjectCategory,
  folder: string,
  slotKey?: string
): string {
  return slotKey ? `${category}:${folder}:${slotKey}` : `${category}:${folder}`;
}

export function parseCategoryAssetLinks(value?: string | null): CategoryAssetLinks {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const out: CategoryAssetLinks = {};
    Object.entries(parsed).forEach(([key, raw]) => {
      const v = String(raw || '').trim();
      if (key && v) out[key] = v;
    });
    return out;
  } catch {
    return {};
  }
}

export function serializeCategoryAssetLinks(links: CategoryAssetLinks): string | undefined {
  const cleaned: CategoryAssetLinks = {};
  Object.entries(links).forEach(([key, raw]) => {
    const v = String(raw || '').trim();
    if (key && v) cleaned[key] = v;
  });
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : undefined;
}

export function hasValidAssetLink(url?: string | null): boolean {
  const v = String(url || '').trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Pending upload with category/folder tags for type-specific assets. */
export type TaggedProjectFile = File & {
  preview?: string;
  category?: ProjectCategory | 'GENERAL';
  folder?: string;
  slotKey?: string;
};

export function isEnvFileName(name: string): boolean {
  const n = name.toLowerCase();
  return n === '.env' || n.startsWith('.env.') || n.endsWith('.env');
}

export function isJsonFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.json');
}

export function isReadmeFileName(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'readme' || n === 'readme.md' || n === 'readme.txt' || n.startsWith('readme.');
}

function webSlotSatisfied(
  slot: 'web_env' | 'web_json' | 'web_readme',
  names: string[],
  assetLinks?: CategoryAssetLinks
): boolean {
  const folder = slot === 'web_readme' ? 'docs' : 'config';
  const key = assetSlotLinkKey('WEB', folder, slot);
  if (hasValidAssetLink(assetLinks?.[key]) || hasValidAssetLink(assetLinks?.WEB)) {
    return true;
  }
  if (slot === 'web_env') return names.some(isEnvFileName);
  if (slot === 'web_json') return names.some(isJsonFileName);
  return names.some(isReadmeFileName);
}

/** WEB category slots (.env / .json / README) are optional — kept for callers. */
export function validateWebCategoryFiles(
  _pending?: Array<{ name: string; category?: string }>,
  _existing?: Array<{ file_name: string; category?: string | null }>,
  _assetLinks?: CategoryAssetLinks
): string | null {
  return null;
}

export interface ProjectComplianceSummaryLite {
  pipeline_stage: string;
  developer_verified: number;
  developer_total: number;
  tester_verified: number;
  tester_total: number;
  project_verified: number;
  project_total: number;
  emergency_bypass: boolean;
}

export interface ProjectMemberDetail {
  user_id: string;
  role: ProjectMemberRole;
  username?: string;
  email?: string;
  avatar?: string | null;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  category?: string | null;
  folder?: string | null;
  uploaded_by?: string;
  created_at?: string;
}

export interface ProjectBugStatsLite {
  total: number;
  open: number;
  fixed: number;
}

export interface ProjectUpdateStatsLite {
  total: number;
  open: number;
  /** Status = approved (in progress / ready for work). */
  approved?: number;
  completed: number;
}

export interface ProjectMemberStatsLite {
  total: number;
  developers: number;
  testers: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  client_id?: string | null;
  client?: ClientSummary | null;
  client_name?: string | null;
  client_location?: string | null;
  client_contact_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_account_status?: ClientAccountStatus;
  technology_stack?: string | null;
  reference_sites_or_themes?: string | null;
  frontend_domain?: string | null;
  backend_domain?: string | null;
  vercel_domain?: string | null;
  /** Comma-separated: web,ios,android */
  platforms?: string | null;
  /** Comma-separated: WEB,PWA,APP,SEO,CREATIVE */
  project_categories?: string | null;
  /** JSON string of AppPublisherMeta */
  app_publisher_meta?: string | null;
  /** JSON map of category → Drive/cloud folder URL */
  category_asset_links?: string | null;
  app_url_ios?: string | null;
  app_url_android?: string | null;
  testflight_url?: string | null;
  github_frontend?: string | null;
  github_backend?: string | null;
  github_app?: string | null;
  start_date?: string | null;
  deadline_date?: string | null;
  expected_publish_date?: string | null;
  testing_start_date?: string | null;
  testing_end_date?: string | null;
  frontend_finish_date?: string | null;
  backend_finish_date?: string | null;
  members?: string[];
  members_detail?: ProjectMemberDetail[];
  bug_stats?: ProjectBugStatsLite;
  update_stats?: ProjectUpdateStatsLite;
  member_stats?: ProjectMemberStatsLite;
  attachments?: ProjectAttachment[];
  compliance?: ProjectComplianceSummaryLite;
}

export type ExtractedProjectStats = {
  bugs: Record<string, number>;
  open: Record<string, number>;
  fixed: Record<string, number>;
  members: Record<string, ProjectMemberStatsLite>;
  hasEmbeddedStats: boolean;
};

export function extractStatsFromProjects(projects: Project[]): ExtractedProjectStats {
  const bugs: Record<string, number> = {};
  const open: Record<string, number> = {};
  const fixed: Record<string, number> = {};
  const members: Record<string, ProjectMemberStatsLite> = {};
  let hasEmbeddedStats = false;

  projects.forEach((project) => {
    if (project.bug_stats) {
      hasEmbeddedStats = true;
      bugs[project.id] = project.bug_stats.total;
      open[project.id] = project.bug_stats.open;
      fixed[project.id] = project.bug_stats.fixed;
    }
    if (project.member_stats) {
      hasEmbeddedStats = true;
      members[project.id] = {
        total: project.member_stats.total,
        developers: project.member_stats.developers,
        testers: project.member_stats.testers,
      };
    }
  });

  return { bugs, open, fixed, members, hasEmbeddedStats };
}

export interface ProjectMemberInput {
  user_id: string;
  role: ProjectMemberRole;
}

export interface CreateProjectData {
  name: string;
  description: string;
  status?: ProjectStatus;
  client_id?: string | null;
  client_name?: string;
  client_location?: string;
  client_contact_name?: string;
  client_email?: string;
  client_phone?: string;
  client_account_status?: ClientAccountStatus;
  technology_stack?: string;
  reference_sites_or_themes?: string;
  frontend_domain?: string;
  backend_domain?: string;
  vercel_domain?: string;
  platforms?: string;
  project_categories?: string;
  app_publisher_meta?: string;
  category_asset_links?: string;
  app_url_ios?: string;
  app_url_android?: string;
  testflight_url?: string;
  github_frontend?: string;
  github_backend?: string;
  github_app?: string;
  start_date?: string;
  deadline_date?: string;
  expected_publish_date?: string;
  testing_start_date?: string;
  testing_end_date?: string;
  frontend_finish_date?: string;
  backend_finish_date?: string;
  members?: ProjectMemberInput[];
}

export type UpdateProjectData = Partial<CreateProjectData>;

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  client_id: string;
  client_name: string;
  client_location: string;
  client_contact_name: string;
  client_email: string;
  client_phone: string;
  client_account_status: ClientAccountStatus;
  technology_stack: string;
  reference_sites_or_themes: string;
  frontend_domain: string;
  backend_domain: string;
  vercel_domain: string;
  platforms: ProjectPlatform[];
  project_categories: ProjectCategory[];
  app_publisher_meta: AppPublisherMeta;
  category_asset_links: CategoryAssetLinks;
  app_url_ios: string;
  app_url_android: string;
  testflight_url: string;
  github_frontend: string;
  github_backend: string;
  github_app: string;
  start_date: string;
  deadline_date: string;
  expected_publish_date: string;
  testing_start_date: string;
  testing_end_date: string;
  frontend_finish_date: string;
  backend_finish_date: string;
  project_lead_id: string;
  developer_ids: string[];
  tester_ids: string[];
}

export const emptyProjectFormValues = (): ProjectFormValues => ({
  name: '',
  description: '',
  status: 'active',
  client_id: '',
  client_name: '',
  client_location: '',
  client_contact_name: '',
  client_email: '',
  client_phone: '',
  client_account_status: 'active',
  technology_stack: '',
  reference_sites_or_themes: '',
  frontend_domain: '',
  backend_domain: '',
  vercel_domain: '',
  platforms: [],
  project_categories: [],
  app_publisher_meta: emptyAppPublisherMeta(),
  category_asset_links: emptyCategoryAssetLinks(),
  app_url_ios: '',
  app_url_android: '',
  testflight_url: '',
  github_frontend: '',
  github_backend: '',
  github_app: '',
  start_date: '',
  deadline_date: '',
  expected_publish_date: '',
  testing_start_date: '',
  testing_end_date: '',
  frontend_finish_date: '',
  backend_finish_date: '',
  project_lead_id: '',
  developer_ids: [],
  tester_ids: [],
});

export function projectToFormValues(project: Project): ProjectFormValues {
  const members = project.members_detail || [];
  return {
    name: project.name || '',
    description: project.description || '',
    status: project.status || 'active',
    client_id: project.client_id || project.client?.id || '',
    client_name: project.client?.corporate_name || project.client_name || '',
    client_location: project.client_location || '',
    client_contact_name: project.client_contact_name || '',
    client_email: project.client_email || '',
    client_phone: project.client_phone || '',
    client_account_status: project.client_account_status || 'active',
    technology_stack: project.technology_stack || '',
    reference_sites_or_themes: project.reference_sites_or_themes || '',
    frontend_domain: project.frontend_domain || '',
    backend_domain: project.backend_domain || '',
    vercel_domain: project.vercel_domain || '',
    platforms: parseProjectPlatforms(project.platforms),
    project_categories: parseProjectCategories(project.project_categories),
    app_publisher_meta: parseAppPublisherMeta(project.app_publisher_meta),
    category_asset_links: parseCategoryAssetLinks(project.category_asset_links),
    app_url_ios: project.app_url_ios || '',
    app_url_android: project.app_url_android || '',
    testflight_url: project.testflight_url || '',
    github_frontend: project.github_frontend || '',
    github_backend: project.github_backend || '',
    github_app: project.github_app || '',
    start_date: project.start_date || '',
    deadline_date: project.deadline_date || '',
    expected_publish_date: project.expected_publish_date || '',
    testing_start_date: project.testing_start_date || '',
    testing_end_date: project.testing_end_date || '',
    frontend_finish_date: project.frontend_finish_date || '',
    backend_finish_date: project.backend_finish_date || '',
    project_lead_id: members.find((m) => m.role === 'manager')?.user_id || '',
    developer_ids: members.filter((m) => m.role === 'developer').map((m) => m.user_id),
    tester_ids: members.filter((m) => m.role === 'tester').map((m) => m.user_id),
  };
}

export function formValuesToPayload(values: ProjectFormValues): CreateProjectData {
  const members: ProjectMemberInput[] = [];
  if (values.project_lead_id) {
    members.push({ user_id: values.project_lead_id, role: 'manager' });
  }
  values.developer_ids.forEach((userId) => {
    if (userId) members.push({ user_id: userId, role: 'developer' });
  });
  values.tester_ids.forEach((userId) => {
    if (userId) members.push({ user_id: userId, role: 'tester' });
  });

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    status: values.status,
    client_id: values.client_id.trim() || null,
    client_name: values.client_name.trim() || undefined,
    client_location: values.client_location.trim() || undefined,
    client_contact_name: values.client_contact_name.trim() || undefined,
    client_email: values.client_email.trim() || undefined,
    client_phone: values.client_phone.trim() || undefined,
    client_account_status: values.client_account_status,
    technology_stack: values.technology_stack.trim() || undefined,
    reference_sites_or_themes: values.reference_sites_or_themes.trim() || undefined,
    frontend_domain: values.frontend_domain.trim() || undefined,
    backend_domain: values.backend_domain.trim() || undefined,
    vercel_domain: values.vercel_domain.trim() || undefined,
    platforms: serializeProjectPlatforms(values.platforms) || undefined,
    project_categories: serializeProjectCategories(values.project_categories) || undefined,
    app_publisher_meta: serializeAppPublisherMeta(values.app_publisher_meta),
    category_asset_links: serializeCategoryAssetLinks(values.category_asset_links),
    app_url_ios: values.app_url_ios.trim() || undefined,
    app_url_android: values.app_url_android.trim() || undefined,
    testflight_url: values.testflight_url.trim() || undefined,
    github_frontend: values.github_frontend.trim() || undefined,
    github_backend: values.github_backend.trim() || undefined,
    github_app: values.github_app.trim() || undefined,
    start_date: values.start_date || undefined,
    deadline_date: values.deadline_date || undefined,
    expected_publish_date: values.expected_publish_date || undefined,
    testing_start_date: values.testing_start_date || undefined,
    testing_end_date: values.testing_end_date || undefined,
    frontend_finish_date: values.frontend_finish_date || undefined,
    backend_finish_date: values.backend_finish_date || undefined,
    members,
  };
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'active':
      return 'Ongoing';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    case 'release_ready':
      return 'Release Ready';
    default:
      return status;
  }
}

export function projectStatusBadgeClass(status?: ProjectStatus | string | null): string {
  switch (status) {
    case 'active':
      return 'border-blue-300/80 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200';
    case 'release_ready':
      return 'border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'completed':
      return 'border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'archived':
      return 'border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200';
    default:
      return 'border-gray-300/80 bg-gray-50 text-gray-700 dark:border-gray-700/60 dark:bg-gray-900/40 dark:text-gray-300';
  }
}

export type DeadlineTimerTone = 'ok' | 'soon' | 'today' | 'overdue' | 'done' | 'none';

/** Why: One deadline countdown label for project cards, overview, and headers. */
export function getDeadlineTimerReminder(
  deadline?: string | null,
  status?: ProjectStatus | string | null
): { label: string; tone: DeadlineTimerTone; daysUntil: number | null } {
  if (!deadline) {
    return { label: 'No deadline set', tone: 'none', daysUntil: null };
  }
  if (status === 'completed' || status === 'archived') {
    return { label: 'Project closed', tone: 'done', daysUntil: null };
  }
  const end = new Date(deadline.includes('T') ? deadline : `${deadline}T00:00:00`);
  if (Number.isNaN(end.getTime())) {
    return { label: 'No deadline set', tone: 'none', daysUntil: null };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysUntil = Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil);
    return {
      label: `${overdue} day${overdue === 1 ? '' : 's'} overdue`,
      tone: 'overdue',
      daysUntil,
    };
  }
  if (daysUntil === 0) {
    return { label: 'Due today — act now', tone: 'today', daysUntil: 0 };
  }
  if (daysUntil === 1) {
    return { label: '1 day left', tone: 'soon', daysUntil: 1 };
  }
  if (daysUntil <= 7) {
    return {
      label: `${daysUntil} days left — due soon`,
      tone: 'soon',
      daysUntil,
    };
  }
  return {
    label: `${daysUntil} days left`,
    tone: 'ok',
    daysUntil,
  };
}

export function deadlineTimerToneClass(tone: DeadlineTimerTone): string {
  switch (tone) {
    case 'overdue':
      return 'border-red-300/80 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200';
    case 'today':
      return 'border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200';
    case 'soon':
      return 'border-orange-300/80 bg-orange-50 text-orange-900 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-200';
    case 'done':
      return 'border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'none':
      return 'border-border/60 bg-muted/40 text-muted-foreground';
    default:
      return 'border-cyan-200/80 bg-cyan-50 text-cyan-800 dark:border-cyan-800/50 dark:bg-cyan-950/30 dark:text-cyan-200';
  }
}

/** Rank for picker: Ongoing first, then Release Ready, then others. */
export function projectPickerStatusRank(status?: ProjectStatus | string | null): number {
  switch (status) {
    case 'active':
      return 0;
    case 'release_ready':
      return 1;
    case 'completed':
      return 2;
    case 'archived':
      return 3;
    default:
      return 4;
  }
}

/**
 * Workload sort for project lists and pickers:
 * open bugs ↓ first (so high-open projects surface even if Release Ready),
 * then status (Ongoing → Release Ready → …), active updates ↓, total updates ↓, name.
 * Optional live count maps override embedded stats (Projects page cards).
 */
export type ProjectWorkloadSortCounts = {
  openBugs?: Record<string, number>;
  /** Prefer Approved (card metric); falls back to update_stats.open / approved */
  updatesActive?: Record<string, number>;
  updatesTotal?: Record<string, number>;
};

type WorkloadSortableProject = {
  id?: string;
  name: string;
  status?: ProjectStatus | string | null;
  bug_stats?: ProjectBugStatsLite | null;
  update_stats?: ProjectUpdateStatsLite | null;
};

function projectWorkloadActiveUpdates(project: WorkloadSortableProject): number {
  const stats = project.update_stats;
  if (typeof stats?.approved === "number") return stats.approved;
  return stats?.open ?? 0;
}

export function compareProjectsByWorkload(
  a: WorkloadSortableProject,
  b: WorkloadSortableProject,
  counts?: ProjectWorkloadSortCounts
): number {
  const aId = a.id != null ? String(a.id) : "";
  const bId = b.id != null ? String(b.id) : "";

  const aBugs =
    (aId && counts?.openBugs?.[aId] !== undefined
      ? counts.openBugs[aId]
      : a.bug_stats?.open) ?? 0;
  const bBugs =
    (bId && counts?.openBugs?.[bId] !== undefined
      ? counts.openBugs[bId]
      : b.bug_stats?.open) ?? 0;
  if (bBugs !== aBugs) return bBugs - aBugs;

  const statusDiff =
    projectPickerStatusRank(a.status) - projectPickerStatusRank(b.status);
  if (statusDiff !== 0) return statusDiff;

  const aUpdatesActive =
    (aId && counts?.updatesActive?.[aId] !== undefined
      ? counts.updatesActive[aId]
      : projectWorkloadActiveUpdates(a)) ?? 0;
  const bUpdatesActive =
    (bId && counts?.updatesActive?.[bId] !== undefined
      ? counts.updatesActive[bId]
      : projectWorkloadActiveUpdates(b)) ?? 0;
  if (bUpdatesActive !== aUpdatesActive) return bUpdatesActive - aUpdatesActive;

  const aUpdatesTotal =
    (aId && counts?.updatesTotal?.[aId] !== undefined
      ? counts.updatesTotal[aId]
      : a.update_stats?.total) ?? 0;
  const bUpdatesTotal =
    (bId && counts?.updatesTotal?.[bId] !== undefined
      ? counts.updatesTotal[bId]
      : b.update_stats?.total) ?? 0;
  if (bUpdatesTotal !== aUpdatesTotal) return bUpdatesTotal - aUpdatesTotal;

  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function sortProjectsByWorkload<T extends WorkloadSortableProject>(
  projects: T[],
  counts?: ProjectWorkloadSortCounts
): T[] {
  return [...projects].sort((a, b) => compareProjectsByWorkload(a, b, counts));
}

/**
 * Sort projects for bug/update pickers:
 * open bugs ↓, then Ongoing → Release Ready, updates ↓, name.
 */
export function sortProjectsForPicker<
  T extends {
    id?: string;
    name: string;
    status?: ProjectStatus | string | null;
    bug_stats?: ProjectBugStatsLite | null;
    update_stats?: ProjectUpdateStatsLite | null;
  },
>(projects: T[]): T[] {
  return sortProjectsByWorkload(projects);
}


export function computeProjectDurationDays(project: Pick<Project, 'start_date' | 'created_at' | 'deadline_date' | 'status'>): number {
  const start = project.start_date || project.created_at?.slice(0, 10);
  if (!start) return 0;

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 0;

  const end = project.deadline_date ? new Date(project.deadline_date) : new Date();
  const diffMs = end.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatProjectDate(value?: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
