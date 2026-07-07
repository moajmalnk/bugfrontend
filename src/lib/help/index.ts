import { gettingStartedArticles } from "./articles/getting-started";
import { bugTrackingArticles } from "./articles/bug-tracking";
import { collaborationArticles } from "./articles/collaboration";
import { productivityArticles } from "./articles/productivity";
import { integrationsArticles } from "./articles/integrations";
import { administrationArticles } from "./articles/administration";
import type { HelpArticle, HelpRole } from "./types";
import { articleMatchesRole } from "./searchIndex";
import { getCategoryById } from "./categories";

export const ALL_HELP_ARTICLES: HelpArticle[] = [
  ...gettingStartedArticles,
  ...bugTrackingArticles,
  ...collaborationArticles,
  ...productivityArticles,
  ...integrationsArticles,
  ...administrationArticles,
];

export function getArticleById(id: string): HelpArticle | undefined {
  return ALL_HELP_ARTICLES.find((a) => a.id === id);
}

export function getArticlesByCategory(categoryId: string, roleFilter: HelpRole | "all" = "all"): HelpArticle[] {
  return ALL_HELP_ARTICLES.filter(
    (a) => a.categoryId === categoryId && articleMatchesRole(a, roleFilter)
  );
}

export function getRelatedArticles(article: HelpArticle): HelpArticle[] {
  if (!article.relatedIds?.length) return [];
  return article.relatedIds
    .map((id) => getArticleById(id))
    .filter((a): a is HelpArticle => !!a);
}

export { HELP_CATEGORIES, getCategoryById } from "./categories";
export { searchArticles, getPopularArticleIds, articleMatchesRole } from "./searchIndex";
export type * from "./types";
