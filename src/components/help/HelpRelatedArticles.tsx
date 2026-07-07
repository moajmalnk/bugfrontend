import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import type { HelpArticle } from "@/lib/help/types";
import { HelpRoleBadges } from "./HelpRoleBadge";
import { helpGlassCard } from "./HelpPageShell";
import { cn } from "@/lib/utils";

interface HelpRelatedArticlesProps {
  articles: HelpArticle[];
  rolePrefix: string;
}

export function HelpRelatedArticles({ articles, rolePrefix }: HelpRelatedArticlesProps) {
  if (!articles.length) return null;

  return (
    <section className={cn(helpGlassCard, "w-full p-5 sm:p-6 md:p-8 space-y-5")}>
      <h3 className="text-lg font-bold text-foreground">Related articles</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link key={article.id} to={`/${rolePrefix}/help/${article.id}`} className="min-w-0">
            <div
              className={cn(
                "h-full rounded-xl border border-gray-200/50 dark:border-gray-700/50",
                "bg-white/50 dark:bg-gray-900/50 p-4 sm:p-5",
                "transition-all duration-200 hover:shadow-md hover:border-blue-300/50 dark:hover:border-blue-700/50",
                "hover:bg-white/80 dark:hover:bg-gray-900/80 group"
              )}
            >
              <h4 className="text-sm sm:text-base font-semibold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {article.title}
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {article.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200/40 dark:border-gray-700/40">
                <HelpRoleBadges roles={article.roles} />
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {article.readMinutes} min
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
