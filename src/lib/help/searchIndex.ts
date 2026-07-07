import type { HelpArticle, HelpRole } from "./types";

export type HelpRoleFilter = HelpRole | "all";

export function getHelpRoleFilterForUser(effectiveRole: string): HelpRoleFilter {
  if (effectiveRole === "admin") return "all";
  if (effectiveRole === "developer") return "developer";
  if (effectiveRole === "tester") return "tester";
  return "all";
}

export function canSwitchHelpRoleFilter(effectiveRole: string): boolean {
  return effectiveRole === "admin";
}

export const HELP_ROLE_FILTER_OPTIONS: { value: HelpRoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "tester", label: "Tester" },
];

export function getHelpRoleFilterOptions(effectiveRole: string) {
  if (effectiveRole === "admin") {
    return HELP_ROLE_FILTER_OPTIONS;
  }
  if (effectiveRole === "developer") {
    return HELP_ROLE_FILTER_OPTIONS.filter((option) => option.value === "developer");
  }
  if (effectiveRole === "tester") {
    return HELP_ROLE_FILTER_OPTIONS.filter((option) => option.value === "tester");
  }
  return HELP_ROLE_FILTER_OPTIONS.filter((option) => option.value === "all");
}

export function articleMatchesRole(article: HelpArticle, roleFilter: HelpRoleFilter): boolean {
  if (roleFilter === "all") return true;
  return article.roles.includes("all") || article.roles.includes(roleFilter);
}

export function searchArticles(
  articles: HelpArticle[],
  query: string,
  roleFilter: HelpRoleFilter = "all"
): HelpArticle[] {
  const q = query.trim().toLowerCase();
  const filtered = articles.filter((a) => articleMatchesRole(a, roleFilter));

  if (!q) return filtered;

  return filtered.filter((article) => {
    const haystack = [
      article.title,
      article.description,
      ...article.keywords,
      ...article.sections.flatMap((s) => [
        s.heading,
        ...s.blocks.flatMap((b) => {
          if (b.type === "paragraph") return [b.text];
          if (b.type === "list") return b.items;
          if (b.type === "callout") return [b.title ?? "", b.text];
          if (b.type === "steps") return b.steps.flatMap((st) => [st.title, st.body]);
          return [];
        }),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q) || q.split(/\s+/).every((word) => haystack.includes(word));
  });
}

export function getPopularArticleIds(): string[] {
  return [
    "getting-started-overview",
    "bugs-reporting",
    "bugs-workflow",
    "projects-guide",
    "daily-work-update",
    "users-management",
  ];
}
