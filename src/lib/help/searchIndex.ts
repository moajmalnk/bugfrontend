import type { HelpArticle, HelpRole } from "./types";

export function articleMatchesRole(article: HelpArticle, roleFilter: HelpRole | "all"): boolean {
  if (roleFilter === "all") return true;
  return article.roles.includes("all") || article.roles.includes(roleFilter);
}

export function searchArticles(
  articles: HelpArticle[],
  query: string,
  roleFilter: HelpRole | "all" = "all"
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
