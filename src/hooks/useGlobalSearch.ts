import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bugService } from "@/services/bugService";
import { googleDocsService } from "@/services/googleDocsService";
import { googleSheetsService } from "@/services/googleSheetsService";
import { projectService } from "@/services/projectService";
import { sharedTaskService } from "@/services/sharedTaskService";
import { updateService } from "@/services/updateService";
import { userService } from "@/services/userService";
import {
  buildRolePath,
  createPermissionChecker,
  getVisiblePages,
  matchesSearchText,
  type SearchCategory,
  type SearchResult,
  type SearchTab,
} from "@/lib/globalSearchIndex";

interface SearchCache {
  pages: SearchResult[];
  help: SearchResult[];
  users: SearchResult[];
  bugs: SearchResult[];
  fixes: SearchResult[];
  docs: SearchResult[];
  sheets: SearchResult[];
  other: SearchResult[];
}

let sessionCache: SearchCache | null = null;
let sessionCacheKey = "";

function buildCacheKey(role: string, permissions: string[]): string {
  return `${role}:${permissions.sort().join(",")}`;
}

interface UseGlobalSearchOptions {
  query: string;
  activeTab: SearchTab;
  role: string;
  permissions: string[];
  enabled: boolean;
}

export function useGlobalSearch({
  query,
  activeTab,
  role,
  permissions,
  enabled,
}: UseGlobalSearchOptions) {
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<SearchCache | null>(sessionCache);
  const fetchStarted = useRef(false);

  const hasPermission = useCallback(
    (key: string) => createPermissionChecker(permissions)(key),
    [permissions]
  );

  const loadData = useCallback(async () => {
    const key = buildCacheKey(role, permissions);
    if (sessionCache && sessionCacheKey === key) {
      setCache(sessionCache);
      return;
    }

    setLoading(true);
    try {
      const visiblePages = getVisiblePages({ role, hasPermission });
      const pages = visiblePages
        .filter((p) => p.category === "pages")
        .map((page) => ({
          ...page,
          href: buildRolePath(role, page.href),
        }));

      const help = visiblePages
        .filter((p) => p.category === "help")
        .map((page) => ({
          ...page,
          href: buildRolePath(role, page.href),
        }));

      const [
        usersResult,
        bugsResult,
        projectsResult,
        updatesResult,
        docsResult,
        sheetsResult,
        tasksResult,
      ] = await Promise.allSettled([
        role === "admin" ? userService.getUsers() : Promise.resolve([]),
        bugService.getBugs({ limit: 1000 }),
        projectService.getProjects(),
        updateService.getUpdates(),
        role === "admin"
          ? googleDocsService.getAllDocuments()
          : role !== "tester"
            ? Promise.all([
                googleDocsService.getSharedDocuments(),
                googleDocsService.listGeneralDocuments(),
              ])
            : Promise.resolve([[], []]),
        role === "admin"
          ? googleSheetsService.getAllSheets()
          : role !== "tester"
            ? Promise.all([
                googleSheetsService.getSharedSheets(),
                googleSheetsService.listGeneralSheets(),
              ])
            : Promise.resolve([[], []]),
        role !== "tester" &&
        (hasPermission("TASKS_VIEW_ALL") ||
          hasPermission("TASKS_VIEW_ASSIGNED") ||
          hasPermission("TASKS_CREATE"))
          ? sharedTaskService.getSharedTasks()
          : Promise.resolve([]),
      ]);

      const users: SearchResult[] =
        usersResult.status === "fulfilled"
          ? usersResult.value.map((user) => ({
              id: `user-${user.id}`,
              category: "users" as const,
              title: user.username,
              subtitle: [user.role, user.email].filter(Boolean).join(" · "),
              href: buildRolePath(role, `/users/${user.id}`),
              keywords: [user.username, user.email, user.role],
            }))
          : [];

      const allBugs =
        bugsResult.status === "fulfilled" ? bugsResult.value.bugs : [];

      const bugs: SearchResult[] = allBugs
        .filter((bug) => bug.status !== "fixed")
        .map((bug) => ({
          id: `bug-${bug.id}`,
          category: "bugs" as const,
          title: bug.title,
          subtitle: [bug.status, bug.project_name].filter(Boolean).join(" · "),
          href: buildRolePath(role, `/bugs/${bug.id}`),
          keywords: [bug.title, bug.description, bug.id, bug.project_name],
        }));

      const fixes: SearchResult[] = allBugs
        .filter((bug) => bug.status === "fixed")
        .map((bug) => ({
          id: `fix-${bug.id}`,
          category: "fixes" as const,
          title: bug.title,
          subtitle: ["fixed", bug.project_name].filter(Boolean).join(" · "),
          href: buildRolePath(role, `/bugs/${bug.id}`),
          keywords: [bug.title, bug.description, bug.id, bug.project_name],
        }));

      const docs: SearchResult[] = [];
      if (docsResult.status === "fulfilled") {
        if (role === "admin") {
          const grouped = docsResult.value as Awaited<
            ReturnType<typeof googleDocsService.getAllDocuments>
          >;
          grouped.documents?.forEach((group) => {
            group.documents.forEach((doc) => {
              docs.push({
                id: `doc-${doc.id}`,
                category: "docs",
                title: doc.doc_title,
                subtitle: [group.project_name, doc.creator_name]
                  .filter(Boolean)
                  .join(" · "),
                href: doc.google_doc_url,
                external: true,
                keywords: [
                  doc.doc_title,
                  group.project_name,
                  doc.creator_name ?? undefined,
                  doc.template_name ?? undefined,
                ],
              });
            });
          });
        } else if (role !== "tester") {
          const [shared, general] = docsResult.value as [
            Awaited<ReturnType<typeof googleDocsService.getSharedDocuments>>,
            Awaited<ReturnType<typeof googleDocsService.listGeneralDocuments>>,
          ];
          const seen = new Set<number>();
          [...shared, ...general].forEach((doc) => {
            if (seen.has(doc.id)) return;
            seen.add(doc.id);
            docs.push({
              id: `doc-${doc.id}`,
              category: "docs",
              title: doc.doc_title,
              subtitle: [doc.project_name, doc.creator_name]
                .filter(Boolean)
                .join(" · "),
              href: doc.google_doc_url,
              external: true,
              keywords: [
                doc.doc_title,
                doc.project_name ?? undefined,
                doc.creator_name ?? undefined,
                doc.template_name ?? undefined,
              ],
            });
          });
        }
      }

      const sheets: SearchResult[] = [];
      if (sheetsResult.status === "fulfilled") {
        if (role === "admin") {
          const grouped = sheetsResult.value as Awaited<
            ReturnType<typeof googleSheetsService.getAllSheets>
          >;
          grouped.sheets?.forEach((group) => {
            group.sheets.forEach((sheet) => {
              sheets.push({
                id: `sheet-${sheet.id}`,
                category: "sheets",
                title: sheet.sheet_title,
                subtitle: [group.project_name, sheet.creator_name]
                  .filter(Boolean)
                  .join(" · "),
                href: sheet.google_sheet_url,
                external: true,
                keywords: [
                  sheet.sheet_title,
                  group.project_name,
                  sheet.creator_name ?? undefined,
                  sheet.template_name ?? undefined,
                ],
              });
            });
          });
        } else if (role !== "tester") {
          const [shared, general] = sheetsResult.value as [
            Awaited<ReturnType<typeof googleSheetsService.getSharedSheets>>,
            Awaited<ReturnType<typeof googleSheetsService.listGeneralSheets>>,
          ];
          const seen = new Set<number>();
          [...shared, ...general].forEach((sheet) => {
            if (seen.has(sheet.id)) return;
            seen.add(sheet.id);
            sheets.push({
              id: `sheet-${sheet.id}`,
              category: "sheets",
              title: sheet.sheet_title,
              subtitle: [sheet.project_name, sheet.creator_name]
                .filter(Boolean)
                .join(" · "),
              href: sheet.google_sheet_url,
              external: true,
              keywords: [
                sheet.sheet_title,
                sheet.project_name ?? undefined,
                sheet.creator_name ?? undefined,
                sheet.template_name ?? undefined,
              ],
            });
          });
        }
      }

      const other: SearchResult[] = [];

      if (projectsResult.status === "fulfilled") {
        projectsResult.value.forEach((project) => {
          other.push({
            id: `project-${project.id}`,
            category: "other",
            title: project.name,
            subtitle: "Project",
            href: buildRolePath(role, `/projects/${project.id}`),
            keywords: [project.name, project.description],
          });
        });
      }

      if (updatesResult.status === "fulfilled") {
        updatesResult.value.forEach((update) => {
          other.push({
            id: `update-${update.id}`,
            category: "other",
            title: update.title,
            subtitle: [update.status, update.project_name]
              .filter(Boolean)
              .join(" · "),
            href: buildRolePath(role, `/updates/${update.id}`),
            keywords: [update.title, update.description, update.project_name],
          });
        });
      }

      if (tasksResult.status === "fulfilled") {
        tasksResult.value.forEach((task) => {
          other.push({
            id: `task-${task.id}`,
            category: "other",
            title: task.title,
            subtitle: [task.status, task.project_names?.join(", ")]
              .filter(Boolean)
              .join(" · "),
            href: buildRolePath(role, "/my-tasks?tab=shared-tasks"),
            keywords: [
              task.title,
              task.description,
              task.assigned_to_name,
              ...(task.project_names ?? []),
            ],
          });
        });
      }

      const nextCache: SearchCache = {
        pages,
        help,
        users,
        bugs,
        fixes,
        docs,
        sheets,
        other,
      };

      sessionCache = nextCache;
      sessionCacheKey = key;
      setCache(nextCache);
    } finally {
      setLoading(false);
    }
  }, [role, permissions, hasPermission]);

  useEffect(() => {
    if (!enabled) {
      fetchStarted.current = false;
      return;
    }
    if (!fetchStarted.current) {
      fetchStarted.current = true;
      loadData();
    }
  }, [enabled, loadData]);

  const filterResults = useCallback(
    (items: SearchResult[]) => {
      if (!query.trim()) return items.slice(0, 12);
      return items
        .filter((item) =>
          matchesSearchText(
            query,
            item.title,
            item.subtitle,
            ...(item.keywords ?? [])
          )
        )
        .slice(0, 20);
    },
    [query]
  );

  const results = useMemo(() => {
    if (!cache) return [];

    const byCategory: Record<SearchCategory, SearchResult[]> = {
      pages: filterResults(cache.pages),
      help: filterResults(cache.help),
      users: filterResults(cache.users),
      bugs: filterResults(cache.bugs),
      fixes: filterResults(cache.fixes),
      docs: filterResults(cache.docs),
      sheets: filterResults(cache.sheets),
      other: filterResults(cache.other),
    };

    if (activeTab === "all") {
      return [
        ...byCategory.pages,
        ...byCategory.help,
        ...byCategory.users,
        ...byCategory.bugs,
        ...byCategory.fixes,
        ...byCategory.docs,
        ...byCategory.sheets,
        ...byCategory.other,
      ].slice(0, 24);
    }

    return byCategory[activeTab];
  }, [cache, activeTab, filterResults]);

  return { results, loading, reload: loadData };
}
