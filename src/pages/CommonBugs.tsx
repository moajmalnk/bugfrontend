import {
  BugCardGridSkeletonAnimated,
  CommonBugCard,
} from "@/components/bugs/BugCard";
import { ItemsPerPageSelect } from "@/components/pagination/ItemsPerPageSelect";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { downloadBugReportPdf } from "@/lib/utils/bugPdfReport";
import { commonBugsService } from "@/services/commonBugsService";
import { projectService } from "@/services/projectService";
import { CommonBug, Project } from "@/types";
import {
  Bug as BugIcon,
  Copy,
  Check,
  ChevronDown,
  Download,
  FolderOpen,
  Lock,
  Loader2,
  Repeat,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const CommonBugs = () => {
  const { currentUser } = useAuth();
  const [bugs, setBugs] = useState<CommonBug[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [skeletonLoading, setSkeletonLoading] = useState(true);

  const [filters, setFilter, clearFilters] = usePersistedFilters("common-bugs", {
    searchTerm: "",
    statusFilter: "all",
    projectFilter: "all",
  });
  const searchTerm = filters.searchTerm || "";
  const statusFilter = filters.statusFilter || "all";
  const projectFilter = filters.projectFilter || "all";

  const setSearchTerm = (value: string) => setFilter("searchTerm", value);
  const setStatusFilter = (value: string) => setFilter("statusFilter", value);
  const setProjectFilter = (value: string) => setFilter("projectFilter", value);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-common";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCommonCount, setTotalCommonCount] = useState(0);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchBugs();
      fetchProjects();
    }
  }, [currentUser?.role]);

  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-common";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter, projectFilter, bugs.length]);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      setSkeletonLoading(true);
      const data = await commonBugsService.getCommonBugs({
        page: 1,
        limit: 1000,
        reason: "all",
      });
      setBugs(data.bugs);
      setTotalCommonCount(data.summary.total);
      setSkeletonLoading(false);
    } catch (error) {
      console.error("Error fetching common bugs:", error);
      toast({
        title: "Error",
        description: "Failed to load common bugs. Please try again.",
        variant: "destructive",
      });
      setBugs([]);
      setSkeletonLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-common":
        return bugs.length;
      case "already-raised":
        return bugs.filter((b) =>
          b.common_reasons?.includes("already_raised")
        ).length;
      case "duplicates":
        return bugs.filter((b) => b.common_reasons?.includes("duplicate"))
          .length;
      default:
        return 0;
    }
  };

  const summary = useMemo(
    () => ({
      total: bugs.length,
      already_raised_count: bugs.filter((b) =>
        b.common_reasons?.includes("already_raised")
      ).length,
      duplicate_count: bugs.filter((b) =>
        b.common_reasons?.includes("duplicate")
      ).length,
    }),
    [bugs]
  );

  const getFilteredBugs = () => {
    let filteredByTab = bugs;

    switch (activeTab) {
      case "already-raised":
        filteredByTab = bugs.filter((b) =>
          b.common_reasons?.includes("already_raised")
        );
        break;
      case "duplicates":
        filteredByTab = bugs.filter((b) =>
          b.common_reasons?.includes("duplicate")
        );
        break;
      default:
        filteredByTab = bugs;
    }

    return filteredByTab.filter((bug) => {
      const matchesSearch =
        bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || bug.status === statusFilter;
      const matchesProject =
        projectFilter === "all" || bug.project_id === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });
  };

  const filteredBugs = getFilteredBugs();
  const commonTabs = [
    {
      value: "all-common",
      label: "All Common",
      shortLabel: "All",
      icon: Repeat,
      count: getTabCount("all-common"),
      countClass:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    },
    {
      value: "already-raised",
      label: "Already Raised",
      shortLabel: "Raised",
      icon: BugIcon,
      count: getTabCount("already-raised"),
      countClass:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    },
    {
      value: "duplicates",
      label: "Duplicates",
      shortLabel: "Dupes",
      icon: Copy,
      count: getTabCount("duplicates"),
      countClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    },
  ];
  const activeCommonTab =
    commonTabs.find((tab) => tab.value === activeTab) ?? commonTabs[0];
  const totalFiltered = filteredBugs.length;
  const paginatedBugs = filteredBugs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(totalFiltered / itemsPerPage) || 1;

  const handleDownloadPdfReport = async () => {
    try {
      setIsDownloadingReport(true);
      await downloadBugReportPdf({
        reportTitle: "Common Bugs Report",
        subtitle: "Already raised and duplicate bugs in projects",
        generatedBy: currentUser?.username || currentUser?.name || "System",
        generatedByRole: currentUser?.role,
        filePrefix: "codo-common-bugs-report",
        summary: [
          { label: "Filtered Common Bugs", value: filteredBugs.length },
          { label: "Already Raised", value: summary.already_raised_count },
          { label: "Duplicates", value: summary.duplicate_count },
          { label: "Total Common", value: summary.total },
        ],
        bugs: filteredBugs.map((bug) => {
          const projectName =
            bug.project_name ||
            projects.find((p) => String(p.id) === String(bug.project_id))?.name ||
            "-";
          return {
            id: bug.id,
            title: bug.title,
            projectName,
            status: bug.status,
            priority: bug.priority,
            reporterName: bug.reporter_name,
            createdAt: bug.created_at,
          };
        }),
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to generate common bugs PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const renderPagination = () => {
    if (skeletonLoading || loading || filteredBugs.length === 0) return null;

    const paginationBlock = (
      <>
        <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
            <span className="text-sm sm:text-base text-foreground font-semibold">
              Showing{" "}
              <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {totalFiltered === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>
              -
              <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {Math.min(currentPage * itemsPerPage, totalFiltered)}
              </span>{" "}
              of{" "}
              <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {totalFiltered}
              </span>{" "}
              common bugs
            </span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-3">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Items per page:
            </span>
            <ItemsPerPageSelect
              id="common-bugs-items-per-page"
              value={itemsPerPage}
              onChange={setItemsPerPage}
            />
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 sm:pt-0 border-t border-border/30">
            <div className="sm:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
              Page{" "}
              <span className="text-primary font-semibold">{currentPage}</span> of{" "}
              <span className="text-primary font-semibold">{totalPages}</span>
            </div>
            <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-10 px-4 min-w-[90px] font-medium"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden text-lg">‹</span>
              </Button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-medium">
                Page{" "}
                <span className="text-primary font-semibold">{currentPage}</span> of{" "}
                <span className="text-primary font-semibold">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="h-10 px-4 min-w-[90px] font-medium"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden text-lg">›</span>
              </Button>
            </div>
          </div>
        )}
      </>
    );

    return (
      <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
        {paginationBlock}
      </div>
    );
  };

  if (currentUser?.role !== "admin") {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Access Denied
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Common Bugs is available to administrators only.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header — same structure as Bugs page */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                    <Repeat className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Common Bugs
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Bugs marked as already raised or reported multiple times with
                  the same title in a project
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDownloadPdfReport}
                  disabled={isDownloadingReport || filteredBugs.length === 0}
                  className="h-12 px-6 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-semibold"
                >
                  {isDownloadingReport ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Download PDF
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-orange-500 rounded-lg">
                    <Repeat className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {totalCommonCount || summary.total}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", val);
              return p as URLSearchParams;
            });
          }}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-orange-50/50 dark:from-gray-800/50 dark:to-orange-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              {commonTabs.length > 2 ? (
                <>
                  <div className="md:hidden p-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                      onClick={() => setIsMobileTabSelectorOpen(true)}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {activeCommonTab?.icon && (
                          <activeCommonTab.icon className="h-4 w-4" />
                        )}
                        {activeCommonTab?.label}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </div>

                  <TabsList className="hidden md:grid w-full grid-cols-3 h-14 bg-transparent p-1">
                    {commonTabs.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                      >
                        <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.shortLabel}</span>
                        <span
                          className={`ml-1 sm:ml-2 px-2 py-1 rounded-full text-xs font-bold ${tab.countClass}`}
                        >
                          {tab.count}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </>
              ) : (
                <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent p-1">
                  {commonTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                    >
                      <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                      <span
                        className={`ml-1 sm:ml-2 px-2 py-1 rounded-full text-xs font-bold ${tab.countClass}`}
                      >
                        {tab.count}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}
            </div>
          </div>

          {commonTabs.length > 2 && (
            <Drawer
              open={isMobileTabSelectorOpen}
              onOpenChange={setIsMobileTabSelectorOpen}
            >
              <DrawerContent className="md:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                <DrawerHeader className="text-left pb-2">
                  <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Select Section
                  </DrawerTitle>
                  <DrawerDescription>
                    Navigate to different common bug types
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-6 space-y-3 max-h-[65vh] overflow-y-auto">
                  {commonTabs.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                      <Button
                        key={tab.value}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setActiveTab(tab.value);
                          setSearchParams((prev) => {
                            const p = new URLSearchParams(prev);
                            p.set("tab", tab.value);
                            return p as URLSearchParams;
                          });
                          setIsMobileTabSelectorOpen(false);
                        }}
                        className={`w-full h-auto min-h-20 rounded-3xl px-4 py-4 flex items-center justify-between ${
                          isActive
                            ? "bg-lime-400 text-gray-950 hover:bg-lime-400"
                            : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                              isActive
                                ? "bg-lime-500/80 text-gray-950"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            <tab.icon className="h-5 w-5" />
                          </span>
                          <span className="text-lg font-semibold">{tab.label}</span>
                        </span>
                        <span
                          className={`inline-flex h-10 min-w-10 px-2 items-center justify-center rounded-full ${
                            isActive
                              ? "bg-gray-950 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                          }`}
                        >
                          {isActive ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">{tab.count}</span>
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </DrawerContent>
            </Drawer>
          )}

          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
            {!skeletonLoading && !loading && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl"></div>
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-orange-500 rounded-lg">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Search & Filter
                      </h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search bugs by title, description, or bug ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                            <BugIcon className="h-4 w-4 text-white" />
                          </div>
                          <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[60]">
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
                            <FolderOpen className="h-4 w-4 text-white" />
                          </div>
                          <Select
                            value={projectFilter}
                            onValueChange={setProjectFilter}
                          >
                            <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                              <SelectValue placeholder="Project" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[60]">
                              <SelectItem value="all">All Projects</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {(searchTerm ||
                          statusFilter !== "all" ||
                          projectFilter !== "all") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => clearFilters()}
                            className="h-11 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {renderPagination()}

            {skeletonLoading ? (
              <BugCardGridSkeletonAnimated count={3} />
            ) : loading ? (
              <BugCardGridSkeletonAnimated count={2} />
            ) : filteredBugs.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <Repeat className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    No Common Bugs Found
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {searchTerm ||
                    projectFilter !== "all" ||
                    statusFilter !== "all"
                      ? "No bugs match your search criteria. Try adjusting your filters."
                      : "No common bugs have been reported yet."}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="grid gap-4 mt-4 grid-cols-1"
                style={{ minHeight: 200 }}
                aria-label="Common bug list"
              >
                {paginatedBugs.map((bug) => (
                  <CommonBugCard key={bug.id} bug={bug} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
};

export default CommonBugs;
