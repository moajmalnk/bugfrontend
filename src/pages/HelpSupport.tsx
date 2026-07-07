import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Clock,
  LifeBuoy,
  Mail,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole } from "@/lib/utils";
import {
  ALL_HELP_ARTICLES,
  HELP_CATEGORIES,
  filterArticlesByRole,
  getArticleCountForRole,
  getHelpRoleFilterForUser,
  getHelpRoleFilterOptions,
  getPopularArticleIds,
  searchArticles,
} from "@/lib/help";
import type { HelpRoleFilter } from "@/lib/help";
import { HelpSearch } from "@/components/help/HelpSearch";
import { HelpCategoryGrid } from "@/components/help/HelpCategoryGrid";
import { HelpRoleBadges } from "@/components/help/HelpRoleBadge";
import {
  HelpPageShell,
  HelpPageHeader,
  helpGlassCard,
  helpInnerCard,
} from "@/components/help/HelpPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Step-by-step guides for admins, developers, and testers — every BugRicer feature explained.",
  developer: "Guides for developers — projects, bugs, collaboration, and productivity tools.",
  tester: "Guides for testers — reporting bugs, tracking fixes, and core workflows.",
  user: "Step-by-step guides for your BugRicer role and permissions.",
};

export default function HelpSupport() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");

  const defaultRoleFilter = getHelpRoleFilterForUser(role);
  const roleFilterOptions = getHelpRoleFilterOptions(role);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<HelpRoleFilter>(defaultRoleFilter);

  const filteredArticles = useMemo(() => {
    let articles = searchArticles(ALL_HELP_ARTICLES, query, roleFilter);
    if (categoryFilter) {
      articles = articles.filter((a) => a.categoryId === categoryFilter);
    }
    return articles;
  }, [query, roleFilter, categoryFilter]);

  const popularArticles = useMemo(
    () =>
      filterArticlesByRole(
        getPopularArticleIds()
          .map((id) => ALL_HELP_ARTICLES.find((article) => article.id === id))
          .filter((article): article is NonNullable<typeof article> => !!article),
        roleFilter
      ),
    [roleFilter]
  );

  const articleCount = getArticleCountForRole(roleFilter);
  const headerDescription =
    ROLE_DESCRIPTIONS[role] ?? ROLE_DESCRIPTIONS.user;

  const activeCategory = HELP_CATEGORIES.find((c) => c.id === categoryFilter);

  return (
    <HelpPageShell>
      <HelpPageHeader
        icon={LifeBuoy}
        title="Help & Support"
        description={headerDescription}
      >
        <div className="flex h-12 items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="rounded-lg bg-blue-500 p-1.5">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-medium text-blue-800/80 dark:text-blue-200/80">
              Articles
            </div>
            <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {articleCount} guide{articleCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </HelpPageHeader>

      {/* Search + role filter */}
      <div className={`${helpGlassCard} p-5 sm:p-6 space-y-5`}>
        <HelpSearch value={query} onChange={setQuery} size="large" />
        {roleFilterOptions.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {roleFilterOptions.map((rf) => (
              <Button
                key={rf.value}
                variant={roleFilter === rf.value ? "default" : "outline"}
                size="sm"
                onClick={() => setRoleFilter(rf.value)}
                className={cn(
                  "rounded-full font-semibold",
                  roleFilter !== rf.value &&
                    "border-gray-200/70 dark:border-gray-700/70 bg-white/60 dark:bg-gray-900/60"
                )}
              >
                {rf.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Search results */}
      {query.trim() && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for
            &ldquo;{query}&rdquo;
          </h2>
          {filteredArticles.length === 0 ? (
            <div className={`${helpGlassCard} p-8 text-center text-muted-foreground`}>
              No articles match your search.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredArticles.map((article) => (
                <Link key={article.id} to={`/${role}/help/${article.id}`}>
                  <div
                    className={`${helpGlassCard} p-4 sm:p-5 transition-all hover:shadow-md hover:border-blue-300/40 dark:hover:border-blue-700/40`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{article.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {article.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs rounded-full border-gray-200 dark:border-gray-700"
                      >
                        {HELP_CATEGORIES.find((c) => c.id === article.categoryId)?.title}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Category filter header */}
      {activeCategory && !query.trim() && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{activeCategory.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{activeCategory.description}</p>
          </div>
          <Link to={`/${role}/help`}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200/70 dark:border-gray-700/70"
            >
              View all
            </Button>
          </Link>
        </div>
      )}

      {/* Category grid */}
      {!query.trim() && !categoryFilter && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Browse by topic
          </h2>
          <HelpCategoryGrid
            categories={HELP_CATEGORIES}
            rolePrefix={role}
            roleFilter={roleFilter}
          />
        </section>
      )}

      {/* Category article list */}
      {!query.trim() && categoryFilter && (
        <section className="grid gap-3 sm:grid-cols-2">
          {filteredArticles.length === 0 ? (
            <div className={`${helpGlassCard} sm:col-span-2 p-8 text-center text-muted-foreground`}>
              No guides in this topic for your role.
            </div>
          ) : (
            filteredArticles.map((article) => (
              <Link key={article.id} to={`/${role}/help/${article.id}`}>
                <div
                  className={`${helpGlassCard} h-full p-5 transition-all hover:shadow-md hover:border-blue-300/40 dark:hover:border-blue-700/40`}
                >
                  <h3 className="font-semibold text-foreground">{article.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {article.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <HelpRoleBadges roles={article.roles} />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readMinutes} min
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </section>
      )}

      {/* Popular articles */}
      {!query.trim() && !categoryFilter && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Popular articles</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularArticles.map((article) => (
              <Link key={article.id} to={`/${role}/help/${article.id}`}>
                <div
                  className={cn(
                    helpInnerCard,
                    "h-full p-4 transition-all hover:shadow-md hover:border-blue-300/40 dark:hover:border-blue-700/40 group"
                  )}
                >
                  <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {article.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readMinutes} min read
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Contact support */}
      <div
        className={`${helpGlassCard} p-6 sm:p-8 border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-br from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:to-emerald-950/20`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Still need help?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-lg">
              Contact our support team or use the Rate Us feedback widget on any page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button asChild className="rounded-xl shadow-sm">
              <a href="mailto:support@bugricer.com">
                <Mail className="h-4 w-4 mr-2" />
                support@bugricer.com
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-gray-200/70 dark:border-gray-700/70"
            >
              <a href="https://bugricer.com" target="_blank" rel="noopener noreferrer">
                Visit bugricer.com
              </a>
            </Button>
          </div>
        </div>
      </div>
    </HelpPageShell>
  );
}
