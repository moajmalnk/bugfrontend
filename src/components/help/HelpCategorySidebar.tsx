import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HELP_CATEGORIES, getArticlesByCategory } from "@/lib/help";
import type { HelpRole } from "@/lib/help/types";
import { helpInnerCard } from "./HelpPageShell";

interface HelpCategorySidebarProps {
  rolePrefix: string;
  roleFilter: HelpRole | "all";
  activeCategoryId?: string;
}

export function HelpCategorySidebar({
  rolePrefix,
  roleFilter,
  activeCategoryId,
}: HelpCategorySidebarProps) {
  const location = useLocation();

  const linkClass = (active: boolean) =>
    cn(
      "block rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
      active
        ? "bg-white dark:bg-gray-800 text-foreground shadow-sm border border-gray-200/70 dark:border-gray-700/70"
        : "text-muted-foreground hover:bg-white/60 dark:hover:bg-gray-800/60 hover:text-foreground"
    );

  const articleLinkClass = (active: boolean) =>
    cn(
      "block rounded-lg px-2.5 py-1.5 text-xs transition-colors line-clamp-2",
      active
        ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/80 dark:bg-blue-950/30"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    );

  return (
    <nav className={cn(helpInnerCard, "p-3")} aria-label="Help categories">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Topics
      </p>
      <Link
        to={`/${rolePrefix}/help`}
        className={linkClass(
          !activeCategoryId && location.pathname === `/${rolePrefix}/help`
        )}
      >
        All topics
      </Link>
      {HELP_CATEGORIES.map((cat) => {
        const count = getArticlesByCategory(cat.id, roleFilter).length;
        if (count === 0) return null;

        return (
          <div key={cat.id} className="pt-2">
            <Link
              to={`/${rolePrefix}/help?category=${cat.id}`}
              className={linkClass(activeCategoryId === cat.id)}
            >
              {cat.title}
            </Link>
            <ul className="mt-1.5 space-y-0.5 pl-2 ml-2 border-l border-gray-200/80 dark:border-gray-700/80">
              {getArticlesByCategory(cat.id, roleFilter).map((article) => (
                <li key={article.id}>
                  <Link
                    to={`/${rolePrefix}/help/${article.id}`}
                    className={articleLinkClass(
                      location.pathname.endsWith(`/help/${article.id}`)
                    )}
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
