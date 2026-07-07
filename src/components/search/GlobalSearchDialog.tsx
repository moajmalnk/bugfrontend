import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useGlobalSearchModal } from "@/context/GlobalSearchContext";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { usePermissions } from "@/hooks/usePermissions";
import { getEffectiveRole } from "@/lib/utils";
import {
  getSearchCategoryOrder,
  getSearchEmptyHint,
  getSearchPlaceholder,
  SEARCH_GROUP_LABELS,
  type SearchCategory,
} from "@/lib/globalSearchIndex";
import {
  Bug,
  CheckCircle,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  LayoutGrid,
  LifeBuoy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<
  SearchCategory,
  React.ComponentType<{ className?: string }>
> = {
  pages: LayoutGrid,
  help: LifeBuoy,
  users: Users,
  bugs: Bug,
  fixes: CheckCircle,
  docs: FileText,
  sheets: FileSpreadsheet,
  other: FolderKanban,
};

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearchDialog() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { open, setOpen, toggle, onCloseSidebar } = useGlobalSearchModal();
  const { permissions } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const { results, loading } = useGlobalSearch({
    query: debouncedQuery,
    activeTab: "all",
    role,
    userId: currentUser?.id,
    permissions,
    enabled: open,
  });

  const groupedResults = useMemo(() => {
    const groups = new Map<SearchCategory, typeof results>();
    for (const result of results) {
      const existing = groups.get(result.category) ?? [];
      existing.push(result);
      groups.set(result.category, existing);
    }

    return getSearchCategoryOrder(role)
      .filter((category) => groups.has(category))
      .map((category) => ({
        category,
        label: SEARCH_GROUP_LABELS[category],
        items: groups.get(category)!,
      }));
  }, [results, role]);

  const hasQuery = Boolean(query.trim());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelect = (href: string, external?: boolean) => {
    setOpen(false);
    onCloseSidebar?.();

    if (external) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (import.meta.env.PROD && window.location.pathname.includes("/bugs/")) {
      window.location.href = href;
      return;
    }

    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 gap-0 shadow-2xl border-border/60",
          "max-w-2xl w-[95vw] rounded-2xl",
          "top-[18%] translate-y-0"
        )}
      >
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <Command
          shouldFilter={false}
          className="rounded-2xl [&_[cmdk-input-wrapper]]:flex-1 [&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:px-0"
        >
          <div className="flex items-center border-b px-3">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={getSearchPlaceholder(role)}
              className="h-12 border-0 focus:ring-0 shadow-none"
            />
            <kbd className="ml-2 hidden shrink-0 sm:inline-flex h-6 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>

          <CommandList className="max-h-[min(50vh,420px)]">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-0 py-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty className="py-10 px-3 text-left text-sm text-muted-foreground">
                {getSearchEmptyHint(role, hasQuery)}
              </CommandEmpty>
            ) : (
              groupedResults.map((group) => (
                <CommandGroup
                  key={group.category}
                  heading={hasQuery ? group.label : `${group.label} · Quick access`}
                  className="p-0 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground/80"
                >
                  {group.items.map((result) => {
                    const Icon = CATEGORY_ICONS[result.category];
                    return (
                      <CommandItem
                        key={result.id}
                        value={result.id}
                        onSelect={() =>
                          handleSelect(result.href, result.external)
                        }
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        {result.external && (
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
