import { gettingStartedArticles } from "./articles/getting-started";
import { bugTrackingArticles } from "./articles/bug-tracking";
import { collaborationArticles } from "./articles/collaboration";
import { productivityArticles } from "./articles/productivity";
import { integrationsArticles } from "./articles/integrations";
import { administrationArticles } from "./articles/administration";
import { testerGuideArticles } from "./articles/tester-guides";
import { developerGuideArticles } from "./articles/developer-guides";
import { adminGuideArticles } from "./articles/admin-guides";
import { sharedFeatureArticles } from "./articles/shared-features";
import { articleMatchesRole } from "./searchIndex";
import type { HelpArticle } from "./types";
import type { HelpRoleFilter } from "./searchIndex";
import { getCategoryById } from "./categories";

export const ALL_HELP_ARTICLES: HelpArticle[] = [
  ...gettingStartedArticles,
  ...bugTrackingArticles,
  ...collaborationArticles,
  ...productivityArticles,
  ...integrationsArticles,
  ...administrationArticles,
  ...testerGuideArticles,
  ...developerGuideArticles,
  ...adminGuideArticles,
  ...sharedFeatureArticles,
];

export function getArticleById(id: string): HelpArticle | undefined {
  return ALL_HELP_ARTICLES.find((a) => a.id === id);
}

export function getArticlesByCategory(categoryId: string, roleFilter: HelpRoleFilter = "all"): HelpArticle[] {
  return ALL_HELP_ARTICLES.filter(
    (a) => a.categoryId === categoryId && articleMatchesRole(a, roleFilter)
  );
}

export function filterArticlesByRole(
  articles: HelpArticle[],
  roleFilter: HelpRoleFilter = "all"
): HelpArticle[] {
  return articles.filter((a) => articleMatchesRole(a, roleFilter));
}

export function getArticleCountForRole(roleFilter: HelpRoleFilter = "all"): number {
  return filterArticlesByRole(ALL_HELP_ARTICLES, roleFilter).length;
}

export function getRelatedArticles(article: HelpArticle): HelpArticle[] {
  if (!article.relatedIds?.length) return [];
  return article.relatedIds
    .map((id) => getArticleById(id))
    .filter((a): a is HelpArticle => !!a);
}

export { HELP_CATEGORIES, getCategoryById } from "./categories";
export {
  searchArticles,
  getPopularArticleIds,
  articleMatchesRole,
  getHelpRoleFilterForUser,
  canSwitchHelpRoleFilter,
  getHelpRoleFilterOptions,
  HELP_ROLE_FILTER_OPTIONS,
} from "./searchIndex";
export type { HelpRoleFilter } from "./searchIndex";
export type * from "./types";
