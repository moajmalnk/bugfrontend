import { ALL_HELP_ARTICLES, HELP_CATEGORIES, getCategoryById, getArticlesByCategory, articleMatchesRole, getHelpRoleFilterForUser } from "@/lib/help";
import { showBugMessageInMainNav } from "@/lib/utils";

export type SearchCategory =
  | "pages"
  | "users"
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
    keywords: ["projects", "project", "team"],
  },
  {
    id: "page-bugs",
    label: "Bugs",
    path: "/bugs",
    keywords: ["bugs", "bug", "issues", "report"],
  },
  {
    id: "page-bugs-new",
    label: "New Bug",
    path: "/bugs/new",
    keywords: ["new bug", "report bug", "create bug", "submit bug"],
  },
  {
    id: "page-fixes",
    label: "Fixes",
    path: "/fixes",
    keywords: ["fixes", "fixed", "resolved", "verify"],
  },
  {
    id: "page-updates",
    label: "Updates",
    path: "/updates",
    keywords: ["updates", "update", "release notes", "changelog"],
  },
  {
    id: "page-new-update",
    label: "New Update",
    path: "/new-update",
    keywords: ["new update", "create update", "release note"],
  },
  {
    id: "page-profile",
    label: "Profile",
    path: "/profile",
    keywords: ["profile", "account", "password", "avatar", "me"],
  },
  {
    id: "page-notifications",
    label: "Notifications",
    path: "/notifications",
    keywords: ["notifications", "alerts", "push", "bell"],
  },
  {
    id: "page-help",
    label: "Help & Support",
    path: "/help",
    keywords: ["help", "support", "guide", "documentation", "how to", "tutorial", "docs"],
    subtitle: "Help center",
  },

  // —— Admin only ——
  {
    id: "page-projects-new",
    label: "New Project",
    path: "/projects/new",
    keywords: ["new project", "create project"],
    adminOnly: true,
    subtitle: "Administration",
  },
  {
    id: "page-bugdocs",
    label: "BugDocs",
    path: "/bugdocs",
    keywords: ["docs", "documents", "bugdocs", "google docs"],
    excludeRoles: ["tester"],
  },
  {
    id: "page-bugsheets",
    label: "BugSheets",
    path: "/bugsheets",
    keywords: ["sheets", "spreadsheet", "bugsheets", "google sheets"],
    excludeRoles: ["tester"],
  },
  {
    id: "page-meet",
    label: "BugMeet",
    path: "/meet?tab=shared-meets",
    keywords: ["meet", "meeting", "video", "bugmeet", "conference"],
    excludeRoles: ["tester"],
  },
  {
    id: "page-tasks",
    label: "BugToDo",
    path: "/my-tasks?tab=shared-tasks",
    keywords: ["tasks", "todo", "bugtodo", "shared tasks", "check in"],
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
    keywords: ["daily update", "bugupdate", "status report"],
    excludeRoles: ["tester"],
    showWhen: (ctx) =>
      ctx.hasPermission("DAILY_UPDATE_CREATE") ||
      ctx.hasPermission("DAILY_UPDATE_VIEW") ||
      ctx.hasPermission("UPDATES_VIEW") ||
      ctx.hasPermission("UPDATES_CREATE"),
  },
  {
    id: "page-daily-work",
    label: "Daily Work Update",
    path: "/daily-work-update",
    keywords: [
      "daily work",
      "work update",
      "work hours",
      "check in",
      "checkout",
      "overtime",
      "ot",
      "hours",
    ],
    excludeRoles: ["tester"],
    showWhen: (ctx) =>
      ctx.hasPermission("TASKS_VIEW_ALL") ||
      ctx.hasPermission("TASKS_VIEW_ASSIGNED") ||
      ctx.hasPermission("TASKS_CREATE"),
  },
  {
    id: "page-reports",
    label: "Reports",
    path: "/reports",
    keywords: ["reports", "analytics", "statistics", "metrics"],
    adminOnly: true,
    subtitle: "Administration",
  },
  {
    id: "page-common-bugs",
    label: "Common Bugs",
    path: "/common-bugs",
    keywords: ["common bugs", "duplicate", "already raised", "recurring"],
    roles: ["admin", "developer"],
  },

  // —— Messaging ——
  {
    id: "page-messages",
    label: "BugMessage",
    path: "/messages",
    keywords: ["messages", "chat", "bugmessage", "team chat"],
    showWhen: (ctx) =>
      showBugMessageInMainNav(ctx.role) || ctx.hasPermission("MESSAGING_VIEW"),
  },

  // —— Administration (admin role) ——
  {
    id: "page-users",
    label: "Users",
    path: "/users",
    keywords: ["users", "team", "members", "add user", "permissions"],
    adminOnly: true,
    subtitle: "Administration",
  },
  {
    id: "page-ot",
    label: "OT Requests",
    path: "/overtime-requests",
    keywords: ["overtime", "ot", "requests", "extra hours", "approval"],
    adminOnly: true,
    subtitle: "Administration",
  },

  // —— Administration (permission-gated) ——
  {
    id: "page-whatsapp",
    label: "WhatsApp",
    path: "/whatsapp-messages",
    keywords: ["whatsapp", "messages", "bulk", "notify"],
    permission: "MESSAGING_CREATE",
    subtitle: "Administration",
  },
  {
    id: "page-feedback",
    label: "Feedbacks",
    path: "/feedback-stats",
    keywords: ["feedback", "stats", "rating", "satisfaction"],
    permission: "FEEDBACK_VIEW",
    subtitle: "Administration",
  },
  {
    id: "page-activity",
    label: "Activities",
    path: "/activity",
    keywords: ["activity", "log", "audit", "history"],
    permission: "ACTIVITY_VIEW",
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
    ],
    permission: "SETTINGS_EDIT",
    subtitle: "Administration",
  },
  {
    id: "page-bugbackup",
    label: "BugBackup",
    path: "/bugbackup",
    keywords: ["backup", "bugbackup", "restore", "database", "archive"],
    permission: "SETTINGS_EDIT",
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
  if (entry.adminOnly && ctx.role !== "admin") return false;
  if (entry.roles && !entry.roles.includes(ctx.role)) return false;
  if (entry.excludeRoles?.includes(ctx.role)) return false;
  if (entry.permission && !ctx.hasPermission(entry.permission)) return false;
  if (entry.showWhen && !entry.showWhen(ctx)) return false;

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
    subtitle: entry.subtitle ?? "Navigation",
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
    tabs.splice(3, 0, "users");
  }

  if (role !== "tester") {
    const otherIndex = tabs.indexOf("other");
    tabs.splice(otherIndex, 0, "docs", "sheets");
  }

  return tabs;
}

export const SEARCH_GROUP_LABELS: Record<SearchCategory, string> = {
  pages: "Navigation",
  help: "Help Center",
  users: "Users",
  bugs: "Bugs",
  fixes: "Fixes",
  docs: "BugDocs",
  sheets: "BugSheets",
  other: "Projects & updates",
};

export function getSearchCategoryOrder(role: string): SearchCategory[] {
  if (role === "admin") {
    return ["pages", "help", "users", "bugs", "fixes", "docs", "sheets", "other"];
  }
  if (role === "tester") {
    return ["pages", "help", "bugs", "fixes", "other"];
  }
  return ["pages", "help", "bugs", "fixes", "docs", "sheets", "other"];
}

export function getSearchPlaceholder(role: string): string {
  switch (role) {
    case "admin":
      return "Search pages, users, bugs, docs, help…";
    case "developer":
      return "Search your projects, bugs, docs, and help…";
    case "tester":
      return "Search your projects, bugs, fixes, and help…";
    default:
      return "Search pages, bugs, and help…";
  }
}

export function getSearchEmptyHint(role: string, hasQuery: boolean): string {
  if (hasQuery) {
    return "No results found. Try another keyword or check spelling.";
  }
  switch (role) {
    case "admin":
      return "Type to search across navigation, users, bugs, docs, and help.";
    case "developer":
      return "Type to search your assigned projects, bugs, docs, and help guides.";
    case "tester":
      return "Type to search your assigned projects, bugs, fixes, and help guides.";
    default:
      return "Start typing to search across the app.";
  }
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
    bugs: "Bugs",
    fixes: "Fixes",
    docs: "Docs",
    sheets: "Sheets",
    other: "Other",
  };
  return labels[tab];
}

export function matchesSearchText(
  query: string,
  ...fields: (string | undefined | null)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => field?.toLowerCase().includes(q));
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
