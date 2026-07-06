import { showBugMessageInMainNav } from "@/lib/utils";

export type SearchCategory =
  | "pages"
  | "users"
  | "bugs"
  | "fixes"
  | "docs"
  | "sheets"
  | "other";

export type SearchTab = "all" | SearchCategory;

export interface PageSearchEntry {
  id: string;
  label: string;
  path: string;
  keywords: string[];
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
  {
    id: "page-projects",
    label: "Projects",
    path: "/projects",
    keywords: ["projects", "project"],
  },
  {
    id: "page-bugs",
    label: "Bugs",
    path: "/bugs",
    keywords: ["bugs", "bug", "issues"],
  },
  {
    id: "page-fixes",
    label: "Fixes",
    path: "/fixes",
    keywords: ["fixes", "fixed", "resolved"],
  },
  {
    id: "page-updates",
    label: "Updates",
    path: "/updates",
    keywords: ["updates", "update"],
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
    keywords: ["meet", "meeting", "video", "bugmeet"],
    excludeRoles: ["tester"],
  },
  {
    id: "page-tasks",
    label: "BugToDo",
    path: "/my-tasks?tab=shared-tasks",
    keywords: ["tasks", "todo", "bugtodo", "shared tasks"],
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
    keywords: ["daily update", "bugupdate"],
    excludeRoles: ["tester"],
    showWhen: (ctx) =>
      ctx.hasPermission("DAILY_UPDATE_CREATE") ||
      ctx.hasPermission("DAILY_UPDATE_VIEW") ||
      ctx.hasPermission("UPDATES_VIEW") ||
      ctx.hasPermission("UPDATES_CREATE"),
  },
  {
    id: "page-messages",
    label: "BugMessage",
    path: "/messages",
    keywords: ["messages", "chat", "bugmessage"],
    showWhen: (ctx) =>
      showBugMessageInMainNav(ctx.role) || ctx.hasPermission("MESSAGING_VIEW"),
  },
  {
    id: "page-users",
    label: "Users",
    path: "/users",
    keywords: ["users", "team", "members"],
    adminOnly: true,
  },
  {
    id: "page-ot",
    label: "OT requests",
    path: "/overtime-requests",
    keywords: ["overtime", "ot", "requests"],
    adminOnly: true,
  },
  {
    id: "page-whatsapp",
    label: "WhatsApp",
    path: "/whatsapp-messages",
    keywords: ["whatsapp", "messages"],
    permission: "MESSAGING_CREATE",
  },
  {
    id: "page-feedback",
    label: "Feedback Stats",
    path: "/feedback-stats",
    keywords: ["feedback", "stats"],
    permission: "FEEDBACK_VIEW",
  },
  {
    id: "page-activity",
    label: "Activity",
    path: "/activity",
    keywords: ["activity", "log", "audit"],
    permission: "ACTIVITY_VIEW",
  },
  {
    id: "page-settings",
    label: "Settings",
    path: "/settings",
    keywords: ["settings", "preferences", "config"],
    permission: "SETTINGS_EDIT",
  },
  {
    id: "page-bugbackup",
    label: "BugBackup",
    path: "/bugbackup",
    keywords: ["backup", "bugbackup"],
    permission: "SETTINGS_EDIT",
  },
  {
    id: "page-profile",
    label: "Profile",
    path: "/profile",
    keywords: ["profile", "account", "me"],
  },
  {
    id: "page-daily-work",
    label: "Daily Work Update",
    path: "/daily-work-update",
    keywords: ["daily work", "work update", "hours"],
  },
  {
    id: "page-notifications",
    label: "Notifications",
    path: "/notifications",
    keywords: ["notifications", "alerts"],
  },
  {
    id: "page-reports",
    label: "Reports",
    path: "/reports",
    keywords: ["reports", "analytics"],
  },
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
  return true;
}

export function getVisiblePages(ctx: SearchVisibilityContext): SearchResult[] {
  return PAGE_ENTRIES.filter((entry) => isPageVisible(entry, ctx)).map(
    (entry) => ({
      id: entry.id,
      category: "pages" as const,
      title: entry.label,
      subtitle: "Navigation",
      href: entry.path,
      keywords: entry.keywords,
    })
  );
}

export function getVisibleTabs(
  role: string,
  hasPermission: (key: string) => boolean
): SearchTab[] {
  const ctx: SearchVisibilityContext = { role, hasPermission };
  const tabs: SearchTab[] = ["all", "pages", "bugs", "fixes", "other"];

  if (role === "admin") {
    tabs.splice(2, 0, "users");
  }

  if (role !== "tester") {
    const docsIndex = tabs.indexOf("other");
    tabs.splice(docsIndex, 0, "docs", "sheets");
  }

  return tabs;
}

export function tabLabel(tab: SearchTab): string {
  const labels: Record<SearchTab, string> = {
    all: "All",
    pages: "Pages",
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
