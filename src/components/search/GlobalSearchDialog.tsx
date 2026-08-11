import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
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
import { UserAvatar } from "@/components/users/UserAvatar";
import {
  getSearchCategoryOrder,
  getSearchEmptyHint,
  getSearchHintChips,
  getSearchPlaceholder,
  SEARCH_GROUP_LABELS,
  type SearchCategory,
  type SearchResult,
} from "@/lib/globalSearchIndex";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bug,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  ClipboardCheck,
  ClipboardList,
  CornerDownLeft,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PlaneTakeoff,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Signal,
  Timer,
  User,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<
  SearchCategory,
  React.ComponentType<{ className?: string }>
> = {
  pages: FolderKanban,
  help: LifeBuoy,
  users: Users,
  clients: Building2,
  bugs: Bug,
  fixes: CheckCircle2,
  docs: FileText,
  sheets: FileSpreadsheet,
  other: FolderKanban,
};

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "page-projects": FolderKanban,
  "page-projects-new": Plus,
  "page-bugs": Bug,
  "page-bugs-new": Plus,
  "page-fixes": CheckCircle2,
  "page-updates": RefreshCw,
  "page-new-update": Plus,
  "page-profile": User,
  "page-notifications": Bell,
  "page-help": HelpCircle,
  "page-bugdocs": FileText,
  "page-bugsheets": FileSpreadsheet,
  "page-meet": Video,
  "page-tasks": ClipboardList,
  "page-daily-update": ClipboardList,
  "page-daily-work": CalendarClock,
  "page-leave": PlaneTakeoff,
  "page-leave-requests": PlaneTakeoff,
  "page-reports": FileSpreadsheet,
  "page-common-bugs": Bug,
  "page-common-codo": ClipboardCheck,
  "page-messages": MessageSquare,
  "page-admin-dashboard": LayoutDashboard,
  "page-developer-dashboard": LayoutDashboard,
  "page-tester-dashboard": LayoutDashboard,
  "page-users": Users,
  "page-attendance-exceptions": CalendarClock,
  "page-clients": Building2,
  "page-ot": Timer,
  "page-whatsapp": Phone,
  "page-feedback": MessageSquare,
  "page-activity": Activity,
  "page-push-coverage": Signal,
  "page-shorts": Clapperboard,
  "page-settings": Settings,
  "page-office-location": MapPin,
  "page-bugbackup": Shield,
};

const CHIP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Email: Mail,
  Phone: Phone,
  Leave: PlaneTakeoff,
  Attendance: CalendarClock,
  "Check-in": CalendarClock,
  CODO: ClipboardCheck,
  Bug: Bug,
  Help: HelpCircle,
  Project: FolderKanban,
  Client: Building2,
  Name: User,
  "Employee ID": Users,
};

function resolveResultIcon(result: SearchResult) {
  if (result.category === "pages" || result.category === "help") {
    return PAGE_ICONS[result.id] ?? CATEGORY_ICONS[result.category];
  }
  return CATEGORY_ICONS[result.category];
}

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

  const hintChips = useMemo(() => getSearchHintChips(role), [role]);

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
          "overflow-hidden p-0 gap-0",
          "max-w-xl w-[min(95vw,36rem)] rounded-xl",
          "border border-border/70 bg-popover shadow-2xl",
          "top-[16%] translate-y-0"
        )}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command
          shouldFilter={false}
          className={cn(
            "rounded-xl bg-transparent",
            "[&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:bg-transparent [&_[cmdk-input-wrapper]]:px-0"
          )}
        >
          <div className="border-b border-border/60 bg-transparent px-4 pt-3 pb-3">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={getSearchPlaceholder(role)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-10 border-0 bg-transparent px-0 text-[15px] shadow-none focus:ring-0 placeholder:text-muted-foreground/70"
            />
            {!hasQuery && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {hintChips.map((chip) => {
                  const ChipIcon = CHIP_ICONS[chip];
                  return (
                    <button
                      key={chip}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      onClick={() => setQuery(chip)}
                    >
                      {ChipIcon ? <ChipIcon className="h-3 w-3" /> : null}
                      {chip}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <CommandList className="max-h-[min(52vh,440px)] px-2 py-2">
            {loading ? (
              <div className="space-y-1 px-1 py-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {hasQuery ? "No results" : "Start searching"}
                </p>
                <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                  {getSearchEmptyHint(role, hasQuery)}
                </p>
              </div>
            ) : (
              groupedResults.map((group) => (
                <CommandGroup
                  key={group.category}
                  heading={hasQuery ? group.label : "Suggested"}
                  className={cn(
                    "mb-1 p-0",
                    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
                    "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium",
                    "[&_[cmdk-group-heading]]:normal-case [&_[cmdk-group-heading]]:tracking-normal",
                    "[&_[cmdk-group-heading]]:text-muted-foreground"
                  )}
                >
                  {group.items.map((result) => {
                    const Icon = resolveResultIcon(result);
                    const isPerson = result.category === "users";
                    return (
                      <CommandItem
                        key={result.id}
                        value={result.id}
                        onSelect={() =>
                          handleSelect(result.href, result.external)
                        }
                        className={cn(
                          "group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5",
                          "data-[selected=true]:bg-accent/80"
                        )}
                      >
                        {isPerson ? (
                          <UserAvatar
                            name={result.title}
                            avatar={result.avatar}
                            size="sm"
                            className="shrink-0"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/50">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium leading-tight">
                              {result.title}
                            </p>
                            {result.badge ? (
                              <span className="shrink-0 rounded-xl border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                                {result.badge}
                              </span>
                            ) : null}
                          </div>
                          {result.subtitle ? (
                            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                              {result.subtitle}
                            </p>
                          ) : null}
                        </div>
                        {result.external ? (
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        ) : (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 opacity-0 group-data-[selected=true]:opacity-100" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            )}
          </CommandList>

          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded-xl border border-border/70 bg-muted/40 px-1.5 py-0.5 font-medium">
                ↵
              </kbd>
              Open
              <span className="mx-1 text-border">·</span>
              <kbd className="rounded-xl border border-border/70 bg-muted/40 px-1.5 py-0.5 font-medium">
                esc
              </kbd>
              Close
            </span>
            <span className="hidden items-center gap-3 sm:inline-flex">
              {role === "admin" ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Employee ID
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Attendance
                  </span>
                </>
              )}
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
