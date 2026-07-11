import { AddShortDialog } from "@/components/shorts/AddShortDialog";
import { ShortCard } from "@/components/shorts/ShortCard";
import { ShortPlayerDialog } from "@/components/shorts/ShortPlayerDialog";
import { prefetchYouTubeApi } from "@/components/shorts/CustomShortPlayer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn, getEffectiveRole } from "@/lib/utils";
import { projectService } from "@/services/projectService";
import {
  SHORT_CATEGORIES,
  shortsService,
  type ShortItem,
} from "@/services/shortsService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bug,
  Check,
  ChevronDown,
  Clapperboard,
  Eye,
  EyeOff,
  Filter,
  FolderKanban,
  Layers,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";

const VALID_TABS = new Set(["all", ...SHORT_CATEGORIES.map((c) => c.value)]);

const TAB_ICONS: Record<string, typeof LayoutGrid> = {
  all: LayoutGrid,
  ui_ux: Palette,
  bug: Bug,
  project: FolderKanban,
  stack: Layers,
  other: MoreHorizontal,
};

function buildShortsPath(role: string, tab: string, shortId?: string | null) {
  const base = `/${role}/shorts${shortId ? `/${shortId}` : ""}`;
  if (!tab || tab === "all") return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

function categoryCount(shorts: ShortItem[], value: string) {
  if (value === "all") return shorts.length;
  return shorts.filter((s) => s.category === value).length;
}

export default function Shorts() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const navigate = useNavigate();
  const { shortId } = useParams<{ shortId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ShortItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShortItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishFilter, setPublishFilter] = useState<"all" | "published" | "draft">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [tabSheetOpen, setTabSheetOpen] = useState(false);

  useEffect(() => {
    prefetchYouTubeApi();
  }, []);

  const rawTab = searchParams.get("tab") || "all";
  const category = VALID_TABS.has(rawTab) ? rawTab : "all";

  const { data: shorts = [], isLoading, error } = useQuery({
    queryKey: ["shorts", "admin-all"],
    queryFn: () => shortsService.list(),
    enabled: role === "admin",
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-shorts"],
    queryFn: async () => {
      const list = await projectService.getProjects();
      return (list || []).map((p: any) => ({ id: String(p.id), name: String(p.name) }));
    },
    enabled: role === "admin",
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let list = category === "all" ? shorts : shorts.filter((s) => s.category === category);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          (s.project_name || "").toLowerCase().includes(q) ||
          s.source_type.toLowerCase().includes(q)
      );
    }
    if (publishFilter === "published") list = list.filter((s) => s.is_published);
    if (publishFilter === "draft") list = list.filter((s) => !s.is_published);
    if (sourceFilter !== "all") list = list.filter((s) => s.source_type === sourceFilter);
    return list;
  }, [shorts, category, searchQuery, publishFilter, sourceFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || publishFilter !== "all" || sourceFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setPublishFilter("all");
    setSourceFilter("all");
  };

  const playerShort = useMemo(() => {
    if (!shortId) return null;
    return shorts.find((s) => s.id === shortId) || null;
  }, [shorts, shortId]);

  const playlist = useMemo(() => shorts, [shorts]);

  const setTab = useCallback(
    (nextTab: string) => {
      const tab = VALID_TABS.has(nextTab) ? nextTab : "all";
      navigate(buildShortsPath(role, tab, shortId), { replace: true });
    },
    [navigate, role, shortId]
  );

  const openShort = useCallback(
    (item: ShortItem) => {
      // Every short has its own URL: /admin/shorts/:id?tab=...
      // Replace while the player is already open so scroll/next doesn't spam history.
      navigate(buildShortsPath(role, category, item.id), {
        replace: Boolean(shortId),
      });
    },
    [navigate, role, category, shortId]
  );

  const closePlayer = useCallback(() => {
    navigate(buildShortsPath(role, category), { replace: true });
  }, [navigate, role, category]);

  useEffect(() => {
    if (rawTab !== category) {
      const next = new URLSearchParams(searchParams);
      if (category === "all") next.delete("tab");
      else next.set("tab", category);
      setSearchParams(next, { replace: true });
    }
  }, [rawTab, category, searchParams, setSearchParams]);

  if (role !== "admin") {
    return <Navigate to={`/${role || "developer"}/projects`} replace />;
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shorts"] });

  const handleTogglePublish = async (short: ShortItem) => {
    try {
      await shortsService.update({ id: short.id, is_published: !short.is_published });
      toast({ title: short.is_published ? "Unpublished" : "Published" });
      invalidate();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (short: ShortItem) => {
    setDeleteTarget(short);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await shortsService.delete(deleteTarget.id);
      toast({ title: "Short deleted" });
      if (shortId === deleteTarget.id) closePlayer();
      setDeleteTarget(null);
      invalidate();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const tabItems = [
    { value: "all", label: "All", shortLabel: "All" },
    ...SHORT_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      shortLabel: c.label.split(" ")[0],
    })),
  ];
  const activeTabItem = tabItems.find((t) => t.value === category) || tabItems[0];
  const ActiveTabIcon = TAB_ICONS[activeTabItem.value] || LayoutGrid;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="mx-auto w-full min-w-0 max-w-7xl space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-transparent to-fuchsia-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-fuchsia-950/20" />
          <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 p-6 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80 sm:p-8">
            <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-2 shadow-lg">
                    <Clapperboard className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-white dark:via-gray-100 dark:to-gray-300 sm:text-4xl lg:text-5xl">
                      Shorts
                    </h1>
                    <div className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600" />
                  </div>
                </div>
                <p className="max-w-2xl break-words text-base font-medium text-gray-600 dark:text-gray-400 lg:text-lg">
                  Share UI/UX, bugs, projects, and stack walkthroughs as short videos
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-12 transform px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-xl"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Short
                </Button>
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-3 shadow-sm dark:border-violet-800 dark:from-violet-950/30 dark:to-fuchsia-950/30">
                  <div className="rounded-lg bg-violet-500 p-1.5">
                    <Clapperboard className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                    {shorts.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs — 12-col grid on desktop; bottom sheet on tablet/mobile */}
        <Tabs value={category} onValueChange={setTab} className="w-full">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-50/50 to-violet-50/50 dark:from-gray-800/50 dark:to-violet-900/50" />
            <div className="relative rounded-2xl border border-gray-200/50 bg-white/60 p-2 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/60">
              {/* Mobile / tablet: open category bottom sheet */}
              <div className="p-1 lg:hidden">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-between rounded-2xl border-gray-200/70 bg-white/70 dark:border-gray-700/70 dark:bg-gray-800/70"
                  onClick={() => setTabSheetOpen(true)}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ActiveTabIcon className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                    {activeTabItem.label}
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      {categoryCount(shorts, activeTabItem.value)}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </div>

              {/* Desktop: equal 12-column grid (6 tabs × 2 cols) */}
              <TabsList className="hidden h-14 w-full grid-cols-12 gap-1 bg-transparent p-1 lg:grid">
                {tabItems.map((tab) => {
                  const Icon = TAB_ICONS[tab.value] || LayoutGrid;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="col-span-2 flex h-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-sm font-semibold transition-all duration-300 data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:border-gray-700 dark:data-[state=active]:bg-gray-800"
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="truncate">{tab.label}</span>
                      <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        {categoryCount(shorts, tab.value)}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          <Drawer open={tabSheetOpen} onOpenChange={setTabSheetOpen}>
            <DrawerContent className="rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95 lg:hidden">
              <DrawerHeader className="pb-2 text-left">
                <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select category
                </DrawerTitle>
                <DrawerDescription>
                  Filter shorts by UI/UX, bugs, projects, stack, or other
                </DrawerDescription>
              </DrawerHeader>
              <div className="max-h-[65vh] space-y-3 overflow-y-auto px-4 pb-6">
                {tabItems.map((tab) => {
                  const isActive = category === tab.value;
                  const Icon = TAB_ICONS[tab.value] || LayoutGrid;
                  const count = categoryCount(shorts, tab.value);
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setTab(tab.value);
                        setTabSheetOpen(false);
                      }}
                      className={cn(
                        "flex min-h-20 w-full items-center justify-between rounded-3xl px-4 py-4 transition-colors",
                        isActive
                          ? "bg-violet-500 text-white"
                          : "bg-gray-100/80 text-gray-900 dark:bg-gray-800/80 dark:text-gray-100"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-full",
                            isActive ? "bg-violet-400/80" : "bg-gray-200 dark:bg-gray-700"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-semibold">{tab.label}</span>
                      </span>
                      <span
                        className={cn(
                          "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-2",
                          isActive ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700"
                        )}
                      >
                        {isActive ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-bold tabular-nums">{count}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>

          {/* Search & Filter */}
          <div className="relative mt-6 sm:mt-8">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-50/30 to-violet-50/30 dark:from-gray-800/30 dark:to-violet-900/30" />
            <div className="relative rounded-2xl border border-gray-200/50 bg-white/70 p-6 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-violet-500 p-1.5">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Search & Filter
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative sm:col-span-2 lg:col-span-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, project, or source…"
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/50 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-violet-500"
                  />
                </div>
                <Select
                  value={publishFilter}
                  onValueChange={(v) => setPublishFilter(v as typeof publishFilter)}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Unpublished</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-11 flex-1 rounded-xl">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 shrink-0 rounded-xl px-3"
                      onClick={clearFilters}
                      title="Clear filters"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 dark:border-gray-700">
                      <Filter className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-6 sm:mt-8 sm:space-y-8">
            {isLoading ? (
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white/70 p-12 text-center backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Loading shorts…
                </p>
              </div>
            ) : error ? (
              <div className="relative overflow-hidden rounded-2xl border border-red-200/50 bg-white/70 p-8 text-center backdrop-blur-sm dark:border-red-900/50 dark:bg-gray-900/70">
                <p className="text-sm font-medium text-destructive">
                  {error instanceof Error ? error.message : "Failed to load shorts"}
                </p>
              </div>
            ) : shorts.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-50/40 to-fuchsia-50/40 dark:from-violet-950/20 dark:to-fuchsia-950/20" />
                <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 px-6 py-16 text-center backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-2xl">
                    <Clapperboard className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                    No shorts yet
                  </h3>
                  <p className="mx-auto mb-8 max-w-md text-lg text-gray-600 dark:text-gray-400">
                    Add a YouTube / Instagram / Facebook link or upload a short video to get
                    started.
                  </p>
                  <Button
                    size="lg"
                    className="h-12 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold text-white shadow-lg hover:from-violet-700 hover:to-fuchsia-700"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Short
                  </Button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-50/40 to-red-50/40 dark:from-orange-950/20 dark:to-red-950/20" />
                <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 px-6 py-16 text-center backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl">
                    <Search className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                    No Results Found
                  </h3>
                  <p className="mx-auto mb-8 max-w-md text-lg text-gray-600 dark:text-gray-400">
                    No shorts match your current filters. Try adjusting search or clearing filters.
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-6 rounded-xl font-semibold"
                    onClick={clearFilters}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-50/20 to-violet-50/20 dark:from-gray-800/20 dark:to-violet-900/20" />
                <div className="relative rounded-2xl border border-gray-200/50 bg-white/60 p-4 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/60 sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Showing{" "}
                      <span className="font-bold text-violet-700 dark:text-violet-300">
                        {filtered.length}
                      </span>{" "}
                      short{filtered.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {filtered.map((short) => (
                      <ShortCard
                        key={short.id}
                        short={short}
                        onClick={() => openShort(short)}
                        className="!w-full"
                        footer={
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              aria-label="Edit"
                              title="Edit"
                              onClick={() => setEditTarget(short)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              aria-label={short.is_published ? "Unpublish" : "Publish"}
                              title={short.is_published ? "Unpublish" : "Publish"}
                              onClick={() => void handleTogglePublish(short)}
                            >
                              {short.is_published ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                              aria-label="Delete"
                              title="Delete"
                              onClick={() => handleDelete(short)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Tabs>

        <AddShortDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          projects={projects}
          onCreated={(created) => {
            invalidate();
            openShort(created);
          }}
        />

        <AddShortDialog
          open={!!editTarget}
          initial={editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          projects={projects}
          onSaved={() => {
            invalidate();
            setEditTarget(null);
          }}
        />

        <ShortPlayerDialog
          short={playerShort}
          open={!!shortId && (!!playerShort || isLoading)}
        playlist={playlist}
        shortPath={(item) => buildShortsPath(role, category, item.id)}
        onNavigate={openShort}
          onOpenChange={(open) => {
            if (!open) closePlayer();
          }}
        />

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && !deleting) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent className="mx-auto w-[calc(100%-1.5rem)] max-w-lg rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete short?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes{" "}
                <span className="font-semibold text-foreground">{deleteTarget?.title}</span>
                . This can’t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" disabled={deleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDelete();
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!isLoading && shortId && !playerShort ? (
          <p className="text-sm text-muted-foreground">Short not found or unavailable.</p>
        ) : null}
      </section>
    </main>
  );
}
