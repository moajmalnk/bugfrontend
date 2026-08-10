import { ALL_HELP_ARTICLES, HELP_CATEGORIES, getCategoryById, getArticlesByCategory, articleMatchesRole, getHelpRoleFilterForUser } from "@/lib/help";
import { showBugMessageInMainNav } from "@/lib/utils";

export type SearchCategory =
  | "pages"
  | "users"
  | "clients"
  | "bugs"
  | "fixes"
  | "docs"
  | "sheets"
  | "help"
  | "other";

export type SearchTab = "all" | SearchCategory;

export interface PageSearchEntry {
  id: string;
  label: string;
  path: string;
  keywords: string[];
  subtitle?: string;
  roles?: string[];
  excludeRoles?: string[];
  permission?: string;
  adminOnly?: boolean;
  showWhen?: (ctx: SearchVisibilityContext) => boolean;
}

export interface SearchVisibilityContext {
  role: string;
  hasPermission: (key: string) => boolean;
}

export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  href: string;
  external?: boolean;
  keywords?: string[];
}

const PAGE_ENTRIES: PageSearchEntry[] = [
  // —— Core (all roles) ——
  {
    id: "page-projects",
    label: "Projects",
    path: "/projects",
    keywords: ["projects", "project", "team", "portfolio"],
  },
  {
    id: "page-bugs",
    label: "Bugs",
    path: "/bugs",
    keywords: ["bugs", "bug", "issues", "report", "defect", "ticket"],
  },
  {
    id: "page-bugs-new",
    label: "New Bug",
    path: "/bugs/new",
    keywords: ["new bug", "report bug", "create bug", "submit bug", "raise bug"],
  },
  {
    id: "page-fixes",
    label: "Fixes",
    path: "/fixes",
    keywords: ["fixes", "fixed", "resolved", "verify", "verification"],
  },
  {
    id: "page-updates",
    label: "Updates",
    path: "/updates",
    keywords: ["updates", "update", "release notes", "changelog", "release"],
  },
  {
    id: "page-new-update",
    label: "New Update",
    path: "/new-update",
    keywords: ["new update", "create update", "release note", "publish update"],
  },

  // —— Attendance & work (non-tester) ——
  {
    id: "page-daily-work",
    label: "Daily Work Update",
    path: "/daily-work-update",
    keywords: [
      "daily work",
      "work update",
      "work hours",
      "check in",
      "check-in",
      "checkout",
      "check out",
      "attendance",
      "clock in",
      "overtime",
      "ot",
      "hours",
      "wfh",
      "work from home",
      "office",
      "late",
      "office only",
      "geofence",
      "gps",
      "break",
    ],
    excludeRoles: ["tester"],
    showWhen: (ctx) =>
      ctx.hasPermission("TASKS_VIEW_ALL") ||
      ctx.hasPermission("TASKS_VIEW_ASSIGNED") ||
      ctx.hasPermission("TASKS_CREATE"),
    subtitle: "Check-in · Hours · OT",
  },
  {
    id: "page-leave",
    label: "My Leave",
    path: "/leave",
    keywords: [
      "leave",
      "my leave",
      "pto",
      "vacation",
      "holiday",
      "absent",
      "time off",
      "sick leave",
      "casual leave",
    ],
    excludeRoles: ["tester"],
    subtitle: "Attendance",
  },
  {
    id: "page-tasks",
    label: "BugToDo",
    path: "/my-tasks?tab=shared-tasks",
    keywords: [
      "tasks",
      "todo",
      "bugtodo",
      "shared tasks",
      "check in",
      "assignments",
      "my tasks",
    ],
    excludeRoles: ["tester"],
    showWhen: (ctx) =>
      ctx.hasPermission("TASKS_VIEW_ALL") ||
      ctx.hasPermission("TASKS_VIEW_ASSIGNED") ||
      ctx.hasPermission("TASKS_CREATE"),
  },
  {
    id: "page-daily-update",
    label: "BugUpdate",
    path: "/daily-update",
    keywords: [
      "daily update",
      "bugupdate",
      "status report",
      "standup",
      "progress",
      "blockers",
    ],
    excludeRoles: ["tester"],
    showWhen: (ctx) =>
      ctx.hasPermission("DAILY_UPDATE_CREATE") ||
      ctx.hasPermission("DAILY_UPDATE_VIEW") ||
      ctx.hasPermission("UPDATES_VIEW") ||
      ctx.hasPermission("UPDATES_CREATE"),
  },
  {
    id: "page-meet",
    label: "BugMeet",
    path: "/meet?tab=shared-meets",
    keywords: ["meet", "meeting", "video", "bugmeet", "conference", "call", "lobby"],
    excludeRoles: ["tester"],
  },
  {
    id: "page-bugdocs",
    label: "BugDocs",
    path: "/bugdocs",
    keywords: ["docs", "documents", "bugdocs", "google docs", "templates"],
    excludeRoles: ["tester"],
  },
  {
    id: "page-bugsheets",
    label: "BugSheets",
    path: "/bugsheets",
    keywords: ["sheets", "spreadsheet", "bugsheets", "google sheets"],
    excludeRoles: ["tester"],
  },

  // —— Account & help ——
  {
    id: "page-profile",
    label: "Profile",
    path: "/profile",
    keywords: ["profile", "account", "password", "avatar", "me", "my account"],
  },
  {
    id: "page-notifications",
    label: "Notifications",
    path: "/notifications",
    keywords: ["notifications", "alerts", "push", "bell", "inbox"],
  },
  {
    id: "page-help",
    label: "Help & Support",
    path: "/help",
    keywords: ["help", "support", "guide", "documentation", "how to", "tutorial", "docs", "faq"],
    subtitle: "Help center",
  },
  {
    id: "page-common-bugs",
    label: "Common Bugs",
    path: "/common-bugs",
    keywords: ["common bugs", "duplicate", "already raised", "recurring", "known issues"],
    permission: "COMMON_BUGS_VIEW",
  },
  {
    id: "page-common-codo",
    label: "CODO Rules",
    path: "/common-codo",
    keywords: [
      "codo",
      "common codo",
      "codo rules",
      "compliance",
      "rules",
      "qa",
      "developer matrix",
      "quality",
      "standards",
    ],
    permission: "CODO_VIEW",
  },

  // —— Messaging ——
  {
    id: "page-messages",
    label: "BugMessage",
    path: "/messages",
    keywords: ["messages", "chat", "bugmessage", "team chat", "dm", "inbox"],
    showWhen: (ctx) =>
      showBugMessageInMainNav(ctx.role) || ctx.hasPermission("MESSAGING_VIEW"),
  },

  // —— Admin create / ops ——
  {
    id: "page-projects-new",
    label: "New Project",
    path: "/projects/new",
    keywords: ["new project", "create project", "add project"],
    permission: "PROJECTS_CREATE",
    subtitle: "Administration",
  },
  {
    id: "page-reports",
    label: "Reports",
    path: "/reports",
    keywords: ["reports", "analytics", "statistics", "metrics", "insights"],
    permission: "REPORTS_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-admin-dashboard",
    label: "Ops Dashboard",
    path: "/dashboard",
    keywords: [
      "dashboard",
      "ops",
      "deadlines",
      "tracking",
      "overview",
      "project health",
      "admin home",
      "home",
    ],
    permission: "DASHBOARD_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-developer-dashboard",
    label: "Developer Dashboard",
    path: "/dashboard",
    keywords: [
      "dashboard",
      "developer",
      "my fixes",
      "my projects",
      "tasks",
      "home",
      "overview",
    ],
    roles: ["developer"],
    subtitle: "Home",
  },
  {
    id: "page-tester-dashboard",
    label: "Tester Dashboard",
    path: "/dashboard",
    keywords: [
      "dashboard",
      "tester",
      "my bugs",
      "verify",
      "reports",
      "home",
      "overview",
    ],
    roles: ["tester", "user"],
    subtitle: "Home",
  },
  {
    id: "page-users",
    label: "Users",
    path: "/users",
    keywords: [
      "users",
      "team",
      "members",
      "add user",
      "permissions",
      "email",
      "phone",
      "contact",
      "staff",
      "employees",
    ],
    permission: "USERS_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-attendance-exceptions",
    label: "Attendance Exceptions",
    path: "/attendance-exceptions",
    keywords: [
      "attendance exception",
      "attendance exceptions",
      "allow wfh",
      "wfh exception",
      "forgive late",
      "unmark late",
      "late strike",
      "office only",
      "day exception",
      "grant exception",
      "wfh allowed",
    ],
    permission: "ATTENDANCE_MANAGE",
    subtitle: "Attendance",
  },
  {
    id: "page-clients",
    label: "Clients",
    path: "/clients",
    keywords: [
      "clients",
      "client",
      "corporate",
      "customer",
      "companies",
      "email",
      "phone",
      "contact",
      "crm",
    ],
    permission: "CLIENTS_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-ot",
    label: "OT Requests",
    path: "/overtime-requests",
    keywords: ["overtime", "ot", "requests", "extra hours", "approval", "ot requests"],
    permission: "OVERTIME_MANAGE",
    subtitle: "Attendance",
  },
  {
    id: "page-leave-requests",
    label: "Leave Requests",
    path: "/leave-requests",
    keywords: [
      "leave requests",
      "approve leave",
      "pto approval",
      "vacation approval",
      "leave admin",
      "leave management",
    ],
    permission: "LEAVE_MANAGE",
    subtitle: "Attendance",
  },
  {
    id: "page-whatsapp",
    label: "WhatsApp",
    path: "/whatsapp-messages",
    keywords: ["whatsapp", "messages", "bulk", "notify", "wa"],
    permission: "MESSAGING_CREATE",
    adminOnly: true,
    subtitle: "Administration",
  },
  {
    id: "page-feedback",
    label: "Feedbacks",
    path: "/feedback-stats",
    keywords: ["feedback", "stats", "rating", "satisfaction", "nps"],
    permission: "FEEDBACK_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-performance-reviews",
    label: "Performance Reviews",
    path: "/performance-reviews",
    keywords: [
      "performance reviews",
      "employee review",
      "monthly review",
      "appraisal",
      "challenges",
      "team review",
    ],
    permission: "PERFORMANCE_REVIEWS_MANAGE",
    subtitle: "Administration",
  },
  {
    id: "page-activity",
    label: "Activities",
    path: "/activity",
    keywords: ["activity", "log", "audit", "history", "timeline"],
    permission: "ACTIVITY_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-push-coverage",
    label: "Push Coverage",
    path: "/push-coverage",
    keywords: [
      "push",
      "push coverage",
      "fcm",
      "notification tokens",
      "devices",
      "coverage",
      "firebase",
    ],
    permission: "PUSH_COVERAGE_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-shorts",
    label: "Shorts",
    path: "/shorts",
    keywords: ["shorts", "videos", "clips", "reel", "media"],
    permission: "SHORTS_MANAGE",
    subtitle: "Administration",
  },
  {
    id: "page-settings",
    label: "Settings",
    path: "/settings",
    keywords: [
      "settings",
      "preferences",
      "config",
      "roles",
      "announcements",
      "notifications",
      "dark mode",
      "theme",
      "general",
    ],
    permission: "SETTINGS_EDIT",
    subtitle: "Administration",
  },
  {
    id: "page-office-location",
    label: "Office Check-in Location",
    path: "/settings?tab=general",
    keywords: [
      "office location",
      "office check-in",
      "geofence",
      "gps",
      "wired in",
      "coworks",
      "check-in radius",
      "office radius",
      "lat",
      "lng",
      "latitude",
      "longitude",
      "map",
      "office coords",
    ],
    permission: "SETTINGS_EDIT",
    subtitle: "Settings · General",
  },
  {
    id: "page-bugbackup",
    label: "BugBackup",
    path: "/bugbackup",
    keywords: ["backup", "bugbackup", "restore", "database", "archive", "export"],
    showWhen: (ctx) =>
      ctx.role === "admin" ||
      ctx.hasPermission("BACKUP_MANAGE") ||
      ctx.hasPermission("SETTINGS_EDIT"),
    subtitle: "Administration",
  },
];

function helpCategoryEntries(): PageSearchEntry[] {
  return HELP_CATEGORIES.map((cat) => ({
    id: `help-cat-${cat.id}`,
    label: `Help: ${cat.title}`,
    path: `/help?category=${cat.id}`,
    keywords: [cat.title, cat.description, "help", "support", "guide", cat.id],
    subtitle: "Help center",
  }));
}

function helpArticleEntries(): PageSearchEntry[] {
  return ALL_HELP_ARTICLES.map((article) => {
    const category = getCategoryById(article.categoryId);
    const entry: PageSearchEntry = {
      id: `help-article-${article.id}`,
      label: article.title,
      path: `/help/${article.id}`,
      keywords: [
        ...article.keywords,
        article.description,
        article.title,
        category?.title ?? "",
        "help",
        "support",
        "guide",
        "how to",
      ],
      subtitle: category ? `Help · ${category.title}` : "Help guide",
    };

    if (!article.roles.includes("all")) {
      entry.roles = article.roles.filter((r) => r !== "all");
    }

    return entry;
  });
}

const ALL_PAGE_ENTRIES: PageSearchEntry[] = [
  ...PAGE_ENTRIES,
  ...helpCategoryEntries(),
  ...helpArticleEntries(),
];

export function isPageVisible(
  entry: PageSearchEntry,
  ctx: SearchVisibilityContext
): boolean {
  if (entry.excludeRoles?.includes(ctx.role)) return false;
  if (entry.showWhen && !entry.showWhen(ctx)) return false;

  if (entry.permission) {
    if (ctx.role !== "admin" && !ctx.hasPermission(entry.permission)) return false;
  } else if (entry.adminOnly) {
    if (ctx.role !== "admin") return false;
  } else if (entry.roles && !entry.roles.includes(ctx.role)) {
    return false;
  }

  const helpRoleFilter = getHelpRoleFilterForUser(ctx.role);

  if (entry.id.startsWith("help-cat-")) {
    const categoryId = entry.id.replace("help-cat-", "");
    return getArticlesByCategory(categoryId, helpRoleFilter).length > 0;
  }

  if (entry.id.startsWith("help-article-")) {
    const articleId = entry.id.replace("help-article-", "");
    const article = ALL_HELP_ARTICLES.find((item) => item.id === articleId);
    return article ? articleMatchesRole(article, helpRoleFilter) : false;
  }

  return true;
}

function entryToSearchResult(entry: PageSearchEntry): SearchResult {
  const isHelp =
    entry.id.startsWith("help-article-") || entry.id.startsWith("help-cat-");

  return {
    id: entry.id,
    category: isHelp ? "help" : "pages",
    title: entry.label,
    subtitle: entry.subtitle,
    href: entry.path,
    keywords: entry.keywords,
  };
}

export function getVisiblePages(ctx: SearchVisibilityContext): SearchResult[] {
  return ALL_PAGE_ENTRIES.filter((entry) => isPageVisible(entry, ctx)).map(
    entryToSearchResult
  );
}

export function getVisibleTabs(
  role: string,
  _hasPermission: (key: string) => boolean
): SearchTab[] {
  const tabs: SearchTab[] = ["all", "pages", "help", "bugs", "fixes", "other"];

  if (role === "admin") {
    tabs.splice(3, 0, "users", "clients");
  }

  if (role !== "tester") {
    const otherIndex = tabs.indexOf("other");
    tabs.splice(otherIndex, 0, "docs", "sheets");
  }

  return tabs;
}

export const SEARCH_GROUP_LABELS: Record<SearchCategory, string> = {
  pages: "Pages",
  help: "Help",
  users: "Users",
  clients: "Clients",
  bugs: "Bugs",
  fixes: "Fixes",
  docs: "Docs",
  sheets: "Sheets",
  other: "More",
};

export function getSearchCategoryOrder(role: string): SearchCategory[] {
  if (role === "admin") {
    return [
      "pages",
      "help",
      "users",
      "clients",
      "bugs",
      "fixes",
      "docs",
      "sheets",
      "other",
    ];
  }
  if (role === "tester") {
    return ["pages", "help", "bugs", "fixes", "other"];
  }
  return ["pages", "help", "bugs", "fixes", "docs", "sheets", "other"];
}

export function getSearchPlaceholder(role: string): string {
  if (role === "admin") {
    return "Search users, leave, attendance, bugs, settings…";
  }
  if (role === "tester") {
    return "Search bugs, projects, CODO rules, help…";
  }
  return "Search check-in, leave, bugs, projects, or keyword…";
}

export function getSearchEmptyHint(_role: string, hasQuery: boolean): string {
  if (hasQuery) {
    return "No matches for that search.";
  }
  return "Try a name, email, phone, leave, attendance, or page.";
}

export function getSearchHintChips(role: string): string[] {
  if (role === "admin") {
    return ["Name", "Email", "Leave", "Attendance", "Bug"];
  }
  if (role === "tester") {
    return ["Name", "Project", "Bug", "CODO", "Help"];
  }
  return ["Name", "Email", "Check-in", "Leave", "Bug"];
}

type ProjectMembershipSource = {
  created_by?: string;
  members?: unknown[];
  members_detail?: { user_id?: string }[];
};

export function isUserAssignedToProject(
  project: ProjectMembershipSource,
  userId: string | undefined,
  role: string
): boolean {
  if (role === "admin") return true;
  if (!userId) return false;
  if (project.created_by === userId) return true;

  if (Array.isArray(project.members_detail) && project.members_detail.length > 0) {
    return project.members_detail.some((member) => member.user_id === userId);
  }

  if (Array.isArray(project.members) && project.members.length > 0) {
    if (typeof project.members[0] === "string") {
      return (project.members as string[]).includes(userId);
    }
    return (project.members as { id?: string; user_id?: string }[]).some(
      (member) => member.id === userId || member.user_id === userId
    );
  }

  return false;
}

export function tabLabel(tab: SearchTab): string {
  const labels: Record<SearchTab, string> = {
    all: "All",
    pages: "Pages",
    help: "Help",
    users: "Users",
    clients: "Clients",
    bugs: "Bugs",
    fixes: "Fixes",
    docs: "Docs",
    sheets: "Sheets",
    other: "Other",
  };
  return labels[tab];
}

/** Digits-only form of a phone/email query fragment for flexible matching. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Match free text plus phone-style queries.
 * e.g. "8848676627" matches "+91 88486-76627" via digit normalization.
 */
export function matchesSearchText(
  query: string,
  ...fields: (string | undefined | null)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (fields.some((field) => field?.toLowerCase().includes(q))) {
    return true;
  }

  const qDigits = normalizePhoneDigits(q);
  if (qDigits.length < 4) return false;

  return fields.some((field) => {
    if (!field) return false;
    const fieldDigits = normalizePhoneDigits(field);
    return fieldDigits.length >= 4 && fieldDigits.includes(qDigits);
  });
}

/** Compact contact line for search result subtitles. */
export function formatSearchContactLine(
  ...parts: (string | undefined | null)[]
): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/** Collect contact-related keywords from a project (inline + linked client). */
export function getProjectContactKeywords(project: {
  name?: string | null;
  description?: string | null;
  client_name?: string | null;
  client_location?: string | null;
  client_contact_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client?: {
    corporate_name?: string | null;
    primary_contact_name?: string | null;
    direct_email?: string | null;
    direct_phone?: string | null;
    hq_location?: string | null;
    website?: string | null;
  } | null;
}): string[] {
  const linked = project.client;
  return [
    project.name,
    project.description,
    project.client_name,
    project.client_location,
    project.client_contact_name,
    project.client_email,
    project.client_phone,
    linked?.corporate_name,
    linked?.primary_contact_name,
    linked?.direct_email,
    linked?.direct_phone,
    linked?.hq_location,
    linked?.website,
  ].filter((value): value is string => Boolean(value?.trim()));
}

export function buildRolePath(role: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return role ? `/${role}${normalized}` : normalized;
}

export function createPermissionChecker(permissions: string[]) {
  return (key: string): boolean => {
    if (permissions.includes("SUPER_ADMIN")) return true;
    return permissions.includes(key);
  };
}
