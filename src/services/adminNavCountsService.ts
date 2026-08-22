import { ENV } from '@/lib/env';
import { userService } from '@/services/userService';
import { clientService } from '@/services/clientService';
import { projectService } from '@/services/projectService';
import { bugService } from '@/services/bugService';
import { updateService } from '@/services/updateService';
import { listLeaveRequests, getMyLeaveRequests } from '@/services/leaveService';
import { listPendingWfhRequests } from '@/services/wfhRequestService';
import {
  listAllRequestSubmissions,
  normalizeAllRequestSubmissionsResponse,
} from '@/services/todoService';
import { MessagingService } from '@/services/messagingService';
import { sharedTaskService } from '@/services/sharedTaskService';
import { listCodoRules } from '@/services/codoRulesService';
import { commonBugsService } from '@/services/commonBugsService';
import { googleDocsService } from '@/services/googleDocsService';
import { googleSheetsService } from '@/services/googleSheetsService';
import { feedbackService } from '@/services/feedbackService';
import { performanceReviewService } from '@/services/performanceReviewService';
import { activityService } from '@/services/activityService';
import { shortsService } from '@/services/shortsService';
import { backupService } from '@/services/backupService';
import { listWeeklyReports } from '@/services/weeklyReportService';

export type AdminNavCounts = {
  dashboard: number;
  projects: number;
  bugs: number;
  fixes: number;
  updates: number;
  docs: number;
  sheets: number;
  meetings: number;
  tasks: number;
  bugupdate: number;
  weeklyReport: number;
  myleave: number;
  messages: number;
  commonBugs: number;
  codo: number;
  users: number;
  clients: number;
  ot: number;
  leave: number;
  attendance: number;
  whatsapp: number;
  feedbacks: number;
  reviews: number;
  activities: number;
  push: number;
  shorts: number;
  settings: number;
  backup: number;
};

export const EMPTY_ADMIN_NAV_COUNTS: AdminNavCounts = {
  dashboard: 0,
  projects: 0,
  bugs: 0,
  fixes: 0,
  updates: 0,
  docs: 0,
  sheets: 0,
  meetings: 0,
  tasks: 0,
  bugupdate: 0,
  weeklyReport: 0,
  myleave: 0,
  messages: 0,
  commonBugs: 0,
  codo: 0,
  users: 0,
  clients: 0,
  ot: 0,
  leave: 0,
  attendance: 0,
  whatsapp: 0,
  feedbacks: 0,
  reviews: 0,
  activities: 0,
  push: 0,
  shorts: 0,
  settings: 0,
  backup: 0,
};

export const ADMIN_NAV_COUNTS_QUERY_KEY = ['admin-nav-counts'] as const;

const ADMIN_NAV_COUNTS_EVENT = 'bugricer:admin-nav-counts';

/** Why: Remember production hosts that have not shipped sidebar_counts.php yet. */
let dedicatedCountsAvailable: boolean | null = null;

/**
 * Why: Queue pages mutate pending totals; the sidebar listens for this event
 * instead of each page importing QueryClient.
 */
export function notifyAdminNavCountsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ADMIN_NAV_COUNTS_EVENT));
}

export function subscribeAdminNavCountsChanged(onChange: () => void): () => void {
  window.addEventListener(ADMIN_NAV_COUNTS_EVENT, onChange);
  return () => window.removeEventListener(ADMIN_NAV_COUNTS_EVENT, onChange);
}

function currentTokenPayload(): { user_id?: string; role?: string } | null {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function assignedProjectCount(projects: Array<{ members?: unknown[] }>, userId: string): number {
  return projects.filter((project) =>
    (project.members || []).some((member) => {
      if (member && typeof member === 'object') {
        const rec = member as { user_id?: unknown; id?: unknown };
        return String(rec.user_id ?? rec.id ?? '') === userId;
      }
      return String(member) === userId;
    })
  ).length;
}

function isDevOrTesterRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized === 'developer' || normalized === 'tester';
}

/**
 * Why: Non-admin sidebar badges should mirror each page's default tab —
 * assigned projects, shared docs/sheets, and the user's shared tasks.
 */
async function applyRoleScopedNavOverrides(counts: AdminNavCounts): Promise<void> {
  const payload = currentTokenPayload();
  const userId = payload?.user_id ? String(payload.user_id) : '';
  const role = String(payload?.role || '').toLowerCase();
  if (!userId || role === 'admin') {
    return;
  }

  await Promise.all([
    projectService
      .getProjects()
      .then((projects) => {
        counts.projects = assignedProjectCount(projects, userId);
      })
      .catch(() => {}),
    isDevOrTesterRole(role)
      ? googleDocsService
          .getSharedDocuments()
          .then((docs) => {
            counts.docs = docs.length;
          })
          .catch(() => {})
      : Promise.resolve(),
    isDevOrTesterRole(role)
      ? googleSheetsService
          .getSharedSheets()
          .then((sheets) => {
            counts.sheets = sheets.length;
          })
          .catch(() => {})
      : Promise.resolve(),
    sharedTaskService
      .getSharedTasks()
      .then((tasks) => {
        counts.tasks = tasks.length;
      })
      .catch(() => {}),
  ]);
}

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function asCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeCounts(payload: Partial<AdminNavCounts>): AdminNavCounts {
  return {
    dashboard: asCount(payload.dashboard ?? payload.bugs),
    projects: asCount(payload.projects),
    bugs: asCount(payload.bugs),
    fixes: asCount(payload.fixes),
    updates: asCount(payload.updates),
    docs: asCount(payload.docs),
    sheets: asCount(payload.sheets),
    meetings: asCount(payload.meetings),
    tasks: asCount(payload.tasks),
    bugupdate: asCount(payload.bugupdate),
    weeklyReport: asCount(payload.weeklyReport),
    myleave: asCount(payload.myleave),
    messages: asCount(payload.messages),
    commonBugs: asCount(payload.commonBugs),
    codo: asCount(payload.codo),
    users: asCount(payload.users),
    clients: asCount(payload.clients),
    ot: asCount(payload.ot),
    leave: asCount(payload.leave),
    attendance: asCount(payload.attendance),
    whatsapp: asCount(payload.whatsapp),
    feedbacks: asCount(payload.feedbacks),
    reviews: asCount(payload.reviews),
    activities: asCount(payload.activities),
    push: asCount(payload.push ?? payload.users),
    shorts: asCount(payload.shorts),
    settings: asCount(payload.settings),
    backup: asCount(payload.backup),
  };
}

function paginationTotal(pagination: { total?: number; totalBugs?: number } | undefined): number {
  return asCount(pagination?.total ?? pagination?.totalBugs);
}

/**
 * Why: Until sidebar_counts.php is deployed, reuse existing list endpoints so
 * badges still appear against the current production API.
 */
async function fetchAdminNavCountsFallback(): Promise<AdminNavCounts> {
  const counts: AdminNavCounts = { ...EMPTY_ADMIN_NAV_COUNTS };
  const payload = currentTokenPayload();
  const userId = payload?.user_id ? String(payload.user_id) : '';
  const role = String(payload?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  await Promise.all([
    projectService
      .getProjects()
      .then((projects) => {
        counts.projects = isAdmin
          ? projects.length
          : assignedProjectCount(projects, userId);
      })
      .catch(() => {}),
    bugService
      .getBugs({ page: 1, limit: 1, status: 'pending,in_progress' })
      .then((result) => {
        counts.bugs = paginationTotal(result.pagination);
        counts.dashboard = counts.bugs;
      })
      .catch(() => {}),
    bugService
      .getBugs({ page: 1, limit: 1, status: 'fixed,rejected' })
      .then((result) => {
        counts.fixes = paginationTotal(result.pagination);
      })
      .catch(() => {}),
    updateService
      .getUpdates()
      .then((updates) => {
        counts.updates = updates.length;
      })
      .catch(() => {}),
    isAdmin
      ? googleDocsService
          .getAllDocuments(false)
          .then((result) => {
            counts.docs = asCount(result.count);
          })
          .catch(() => {})
      : isDevOrTesterRole(role)
        ? googleDocsService
            .getSharedDocuments()
            .then((docs) => {
              counts.docs = docs.length;
            })
            .catch(() => {})
        : Promise.resolve(),
    isAdmin
      ? googleSheetsService
          .getAllSheets(false)
          .then((result) => {
            counts.sheets = asCount(result.count);
          })
          .catch(() => {})
      : isDevOrTesterRole(role)
        ? googleSheetsService
            .getSharedSheets()
            .then((sheets) => {
              counts.sheets = sheets.length;
            })
            .catch(() => {})
        : Promise.resolve(),
    sharedTaskService
      .getSharedTasks()
      .then((tasks) => {
        counts.tasks = tasks.length;
      })
      .catch(() => {}),
    listWeeklyReports({
      scope: isAdmin ? 'team' : 'mine',
      page: 1,
      limit: 1,
    })
      .then((result) => {
        counts.weeklyReport = asCount(result.total);
      })
      .catch(() => {}),
    getMyLeaveRequests()
      .then((rows) => {
        counts.myleave = rows.length;
      })
      .catch(() => {}),
    MessagingService
      .getMyChatGroups()
      .then((groups) => {
        counts.messages = groups.length;
      })
      .catch(() => {}),
    commonBugsService
      .getCommonBugs({ page: 1, limit: 1 })
      .then((result) => {
        counts.commonBugs = asCount(result.pagination?.totalBugs);
      })
      .catch(() => {}),
    listCodoRules()
      .then((payload) => {
        counts.codo = asCount(payload.counts?.all) || payload.rules.length;
      })
      .catch(() => {}),
    listPendingWfhRequests()
      .then((payload) => {
        counts.attendance =
          asCount(payload.pending_count) ||
          (Array.isArray(payload.pending) ? payload.pending.length : 0);
      })
      .catch(() => {}),
    listLeaveRequests({ pending_only: true })
      .then((rows) => {
        counts.leave = rows.length;
      })
      .catch(() => {}),
    listAllRequestSubmissions({ pending_only: true })
      .then((res) => {
        const normalized = normalizeAllRequestSubmissionsResponse(res, {
          from: '',
          to: '',
        });
        counts.ot = normalized.submissions.length;
      })
      .catch(() => {}),
    userService
      .getUsers()
      .then((users) => {
        counts.users = users.length;
        counts.push = users.length;
        counts.whatsapp = users.filter(
          (user) => String(user.phone || '').trim() !== ''
        ).length;
      })
      .catch(() => {}),
    clientService
      .getClients()
      .then((clients) => {
        counts.clients = clients.length;
      })
      .catch(() => {}),
    feedbackService
      .getFeedbackStats()
      .then((stats) => {
        counts.feedbacks = asCount(stats.statistics?.total_submissions);
      })
      .catch(() => {}),
    performanceReviewService
      .listReviews({ page: 1, limit: 1 })
      .then((result) => {
        counts.reviews = asCount(result.total);
      })
      .catch(() => {}),
    activityService
      .getUserActivities(1, 0)
      .then((result) => {
        counts.activities = asCount(result.pagination?.total);
      })
      .catch(() => {}),
    shortsService
      .list()
      .then((items) => {
        counts.shorts = items.length;
      })
      .catch(() => {}),
    backupService
      .getHistory(100)
      .then((jobs) => {
        counts.backup = jobs.length;
      })
      .catch(() => {}),
  ]);

  return counts;
}

export async function fetchAdminNavCounts(): Promise<AdminNavCounts> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return EMPTY_ADMIN_NAV_COUNTS;
  }

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    return EMPTY_ADMIN_NAV_COUNTS;
  }

  if (dedicatedCountsAvailable === false) {
    return fetchAdminNavCountsFallback();
  }

  try {
    const res = await fetch(`${ENV.API_URL}/admin/sidebar_counts.php`, {
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    const payload = data?.data;
    const hasCounts =
      res.ok &&
      data?.success === true &&
      payload &&
      typeof payload === 'object';

    if (!hasCounts) {
      if (dedicatedCountsAvailable !== true) {
        dedicatedCountsAvailable = false;
        return fetchAdminNavCountsFallback();
      }
      return EMPTY_ADMIN_NAV_COUNTS;
    }

    dedicatedCountsAvailable = true;
    const counts = normalizeCounts(payload as Partial<AdminNavCounts>);
    await applyRoleScopedNavOverrides(counts);
    return counts;
  } catch {
    if (dedicatedCountsAvailable !== true) {
      dedicatedCountsAvailable = false;
      return fetchAdminNavCountsFallback();
    }
    return EMPTY_ADMIN_NAV_COUNTS;
  }
}
