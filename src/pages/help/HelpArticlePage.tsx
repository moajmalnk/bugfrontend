import { Link, useParams, Navigate } from "react-router-dom";
import { ChevronRight, Clock, Lock, ArrowLeft, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getEffectiveRole } from "@/lib/utils";
import {
  getArticleById,
  getCategoryById,
  getRelatedArticles,
  articleMatchesRole,
  filterArticlesByRole,
  getHelpRoleFilterForUser,
} from "@/lib/help";
import { HelpArticleBody } from "@/components/help/HelpArticleBody";
import { HelpCategorySidebar } from "@/components/help/HelpCategorySidebar";
import { HelpRelatedArticles } from "@/components/help/HelpRelatedArticles";
import { HelpFeedbackFooter } from "@/components/help/HelpFeedbackFooter";
import { HelpRoleBadges } from "@/components/help/HelpRoleBadge";
import {
  HelpPageShell,
  HelpContentCard,
  helpGlassCard,
} from "@/components/help/HelpPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpArticleSkeleton } from "@/components/help/HelpSkeletons";

export default function HelpArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const { hasPermission, isLoading: permissionsLoading } = usePermissions(null);

  const article = articleId ? getArticleById(articleId) : undefined;
  const helpRoleFilter = getHelpRoleFilterForUser(role);

  if (permissionsLoading) {
    return <HelpArticleSkeleton />;
  }

  if (!article || !articleMatchesRole(article, helpRoleFilter)) {
    return <Navigate to={`/${role}/help`} replace />;
  }

  const category = getCategoryById(article.categoryId);
  const related = filterArticlesByRole(getRelatedArticles(article), helpRoleFilter);
  const lacksPermission =
    article.permissionKey && !hasPermission(article.permissionKey);

  return (
    <HelpPageShell>
      {/* Breadcrumb */}
      <nav
        className={`${helpGlassCard} px-4 py-3 flex items-center gap-1 text-sm text-muted-foreground flex-wrap`}
      >
        <Link
          to={`/${role}/help`}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          Help
        </Link>
        {category && (
          <>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
            <Link
              to={`/${role}/help?category=${category.id}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {category.title}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        <span className="text-foreground font-semibold truncate">{article.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left sidebar */}
        <aside className="hidden lg:block w-60 xl:w-64 shrink-0">
          <div className="sticky top-6">
            <HelpCategorySidebar
              rolePrefix={role}
              roleFilter={helpRoleFilter}
              activeCategoryId={article.categoryId}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 lg:hidden rounded-xl"
            asChild
          >
            <Link to={`/${role}/help`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Help
            </Link>
          </Button>

          <HelpContentCard>
            <header className="mb-8 pb-6 border-b border-gray-200/60 dark:border-gray-700/60">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <HelpRoleBadges roles={article.roles} />
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground rounded-full bg-muted/50 px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readMinutes} min read
                </span>
                {lacksPermission && (
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full text-amber-600 border-amber-300 dark:border-amber-700 dark:text-amber-400"
                  >
                    <Lock className="h-3 w-3" />
                    Requires permission
                  </Badge>
                )}
              </div>
              <div className="flex items-start gap-3">
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 shadow-md">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    {article.title}
                  </h1>
                  <p className="mt-2 text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere]">
                    {article.description}
                  </p>
                </div>
              </div>
            </header>

            <article className="space-y-10 min-w-0">
              {article.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2 className="text-xl font-bold mb-5 pb-3 border-b border-gray-200/60 dark:border-gray-700/60 text-foreground">
                    {section.heading}
                  </h2>
                  <HelpArticleBody blocks={section.blocks} />
                </section>
              ))}
            </article>
          </HelpContentCard>
        </main>
      </div>

      {/* Full-width bottom area: related articles + feedback */}
      <div className="w-full space-y-6">
        <HelpRelatedArticles articles={related} rolePrefix={role} />
        <HelpFeedbackFooter articleTitle={article.title} />
      </div>
    </HelpPageShell>
  );
}
