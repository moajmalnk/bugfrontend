import { Link } from "react-router-dom";
import {
  Bug,
  ListTodo,
  Plug,
  Rocket,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { HelpCategory } from "@/lib/help/types";
import { getArticlesByCategory } from "@/lib/help";
import type { HelpRole } from "@/lib/help/types";
import { helpGlassCard } from "./HelpPageShell";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  Bug,
  Users,
  ListTodo,
  Plug,
  Shield,
};

interface HelpCategoryGridProps {
  categories: HelpCategory[];
  rolePrefix: string;
  roleFilter: HelpRole | "all";
}

export function HelpCategoryGrid({ categories, rolePrefix, roleFilter }: HelpCategoryGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const Icon = ICON_MAP[category.icon] ?? Rocket;
        const count = getArticlesByCategory(category.id, roleFilter).length;
        if (count === 0) return null;

        return (
          <Link key={category.id} to={`/${rolePrefix}/help?category=${category.id}`}>
            <div
              className={cn(
                helpGlassCard,
                "h-full p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-300/50 dark:hover:border-blue-700/50 hover:-translate-y-0.5 group"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/10 to-emerald-600/10 group-hover:from-blue-600/20 group-hover:to-emerald-600/20 transition-colors">
                  <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {category.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {category.description}
                  </p>
                  <p className="mt-3 text-xs font-medium text-blue-600/80 dark:text-blue-400/80">
                    {count} article{count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
