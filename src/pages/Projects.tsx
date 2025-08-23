import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast, useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { bugService } from "@/services/bugService";
import { Project, projectService } from "@/services/projectService";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Clock,
  Code,
  FolderKanban,
  Shield,
  TestTube,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Enhanced Project Card Skeleton component for loading state
const ProjectCardSkeleton = () => (
  <Card className="flex flex-col h-full rounded-xl shadow-sm border border-border bg-background/90 hover:shadow-md transition-all duration-200">
    <CardHeader className="pb-2 p-4 sm:p-5">
      <Skeleton className="h-6 sm:h-7 w-3/4 mb-2" />
      <Skeleton className="h-4 sm:h-5 w-1/2" />
    </CardHeader>
    <CardContent className="flex-1 flex flex-col justify-end px-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
        <div className="ml-auto flex flex-col items-start gap-1 min-w-[110px] sm:min-w-[130px] rounded-md">
          <Skeleton className="h-4 sm:h-5 w-24 sm:w-28 mb-1" />
          <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 mb-1" />
          <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
        </div>
      </div>
    </CardContent>
    <CardFooter className="flex flex-col gap-2 sm:gap-3 sm:flex-row mt-auto p-4 sm:p-5">
      <Skeleton className="h-8 sm:h-10 w-full sm:w-24" />
      <Skeleton className="h-8 sm:h-10 w-full sm:w-24" />
    </CardFooter>
  </Card>
);

interface ProjectMemberCounts {
  total: number;
  developers: number;
  testers: number;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentUser } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const { toast: useToastToast } = useToast();
  const [projectBugsCount, setProjectBugsCount] = useState<
    Record<string, number>
  >({});
  const [projectOpenBugsCount, setProjectOpenBugsCount] = useState<
    Record<string, number>
  >({});
  const [projectFixedBugsCount, setProjectFixedBugsCount] = useState<
    Record<string, number>
  >({});
  const [projectMemberCounts, setProjectMemberCounts] = useState<
    Record<string, ProjectMemberCounts>
  >({});
  const [userProjectMemberships, setUserProjectMemberships] = useState<
    Record<string, boolean>
  >({});
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "overview";
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    // Fetch projects when component mounts
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setSkeletonLoading(true); // Ensure skeleton is showing while fetching

      const data = await projectService.getProjects();
      setProjects(data);

      // Initialize filteredProjects with the fetched data to avoid showing "No projects found"
      // But we won't display them until membership is checked
      setFilteredProjects(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
      // On error, turn off skeleton loading since membership check won't run
      setSkeletonLoading(false);
    } finally {
      setIsLoading(false);
      // We'll keep skeleton loading active until membership check completes
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      // Check user membership first, then fetch bugs
      checkUserMembership().then(() => {
        fetchAndCountBugs();
        fetchProjectMembers();
      });
    }
  }, [projects]);

  // Apply filtering whenever search query or memberships change
  useEffect(() => {
    if (projects.length > 0) {
      applyFilters();
    }
  }, [searchQuery, userProjectMemberships, projects]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, userProjectMemberships, projects.length]);

  // Check if the current user is a member of each project
  const checkUserMembership = async () => {
    if (!currentUser) {
      setSkeletonLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setSkeletonLoading(false);
        return;
      }

      const memberships: Record<string, boolean> = {};

      // Admins have access to all projects
      if (currentUser.role === "admin") {
        projects.forEach((project) => {
          memberships[project.id] = true;
        });
        setUserProjectMemberships(memberships);
        //.log("Memberships:", memberships);
        setSkeletonLoading(false);
        return;
      }

      // For developers and testers, check each project
      for (const project of projects) {
        const response = await fetch(
          `${ENV.API_URL}/projects/get_members.php?project_id=${project.id}`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Check if current user is in the members list
            const members = data.data?.members || [];
            const isMember = members.some(
              (member) => String(member.id) === String(currentUser.id)
            );
            memberships[project.id] = isMember;
            //.log("API members for project", project.id, data.members);
          }
        }
      }

      setUserProjectMemberships(memberships);
      //.log("Memberships:", memberships);

      // Turn off skeleton loading only after membership check is complete
      setSkeletonLoading(false);
    } catch (error) {
      // Even on error, turn off skeleton loading
      setSkeletonLoading(false);
    }
  };

  // Apply all filters (search and membership)
  const applyFilters = () => {
    if (
      projects.length === 0 ||
      Object.keys(userProjectMemberships).length === 0
    ) {
      setFilteredProjects([]);
      return;
    }

    let filtered = projects;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Admins see all, others see only assigned projects
    if (currentUser?.role !== "admin") {
      filtered = filtered.filter(
        (project) => userProjectMemberships[project.id]
      );
    }

    setFilteredProjects(filtered);
  };

  const fetchProjectMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // For each project, fetch its members
      const memberCounts: Record<string, ProjectMemberCounts> = {};

      for (const project of projects) {
        const response = await fetch(
          `${ENV.API_URL}/projects/get_members.php?project_id=${project.id}`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const members = data.data?.members || [];
            const devCount = members.filter(
              (m) => m.role === "developer"
            ).length;
            const testerCount = members.filter(
              (m) => m.role === "tester"
            ).length;

            memberCounts[project.id] = {
              total: members.length,
              developers: devCount,
              testers: testerCount,
            };
          }
        }
      }

      setProjectMemberCounts(memberCounts);
    } catch (error) {
      // Silent fail
    }
  };

  const fetchAndCountBugs = async () => {
    try {
      const totalCounts: Record<string, number> = {};
      const openCounts: Record<string, number> = {};
      const fixedCounts: Record<string, number> = {};

      for (const project of projects) {
        if (!userProjectMemberships[project.id]) continue;
        const { bugs } = await bugService.getBugs({
          projectId: project.id,
          page: 1,
          limit: 1000,
          status: "pending",
          userId: currentUser?.id,
        });
        const totalBugs = bugs.length;

        totalCounts[project.id] = totalBugs;

        const openBugs = bugs.filter(
          (bug) => bug.status === "pending" || bug.status === "in_progress"
        );
        openCounts[project.id] = openBugs.length;

        const fixedBugs = bugs.filter((bug) => bug.status === "fixed");
        fixedCounts[project.id] = fixedBugs.length;
      }

      setProjectBugsCount(totalCounts);
      setProjectOpenBugsCount(openCounts);
      setProjectFixedBugsCount(fixedCounts);
    } catch (error) {
      // Fallback: do nothing
    }
  };

  const handleCreateProject = async (projectData: {
    name: string;
    description: string;
  }) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects([...projects, newProject]);
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      await checkUserMembership();
      applyFilters();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDelete = async (projectId: string, force: boolean = false) => {
    if (!projectId) return;

    // Close the delete dialog if it's open
    if (isDeleteDialogOpen) {
      setIsDeleteDialogOpen(false);
    }

    // Close the error dialog if it's open and we're force deleting
    if (force && isErrorDialogOpen) {
      setIsErrorDialogOpen(false);
    }

    try {
      // Use direct URL construction to match what works in Postman
      // Force parameter is only added if true
      const baseUrl = `${ENV.API_URL}/projects/delete.php?id=${projectId}`;
      const url = force ? `${baseUrl}&force_delete=true` : baseUrl;

      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Update both project arrays
        setProjects((prevProjects) =>
          prevProjects.filter((p) => p.id !== projectId)
        );
        setFilteredProjects((prevProjects) =>
          prevProjects.filter((p) => p.id !== projectId)
        );

        // Clear the project to delete state
        setProjectToDelete(null);

        toast({
          title: "Success",
          description: force
            ? "Project and all related data deleted successfully"
            : "Project deleted successfully",
        });
      } else {
        // Check for constraint errors
        if (
          data.message?.includes("team members") ||
          data.message?.includes("bugs") ||
          data.message?.includes("constraint")
        ) {
          setDeleteErrorMessage(data.message);
          setIsErrorDialogOpen(true);
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to delete project",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (projects.length > 0 && Object.keys(userProjectMemberships).length > 0) {
      fetchAndCountBugs();
      fetchProjectMembers();
    }
  }, [projects, userProjectMemberships]);

  const totalFiltered = filteredProjects.length;
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  return (
    <div className="space-y-6 sm:space-y-8 px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 w-full max-w-[1800px] mx-auto">
      {/* Enhanced Header row with title, description, new project button, and badge */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6">
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words">
            Projects
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mt-1 sm:mt-2 break-words max-w-xl">
            Manage your projects and track bugs
          </p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center md:items-center gap-3 w-full md:w-auto mt-2 sm:mt-0">
          {currentUser?.role === "admin" && (
            <NewProjectDialog onSubmit={handleCreateProject} />
          )}
          <div className="inline-flex items-center border rounded-lg px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ml-0 sm:ml-2">
            <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
            <span className="text-sm sm:text-base font-medium text-blue-700 dark:text-blue-300">
              {filteredProjects.length}{" "}
              <span className="hidden lg:inline">Projects</span>
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Controls */}
      {!skeletonLoading && !isLoading && (
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm sm:text-base transition-all duration-200"
            />
          </div>
        </div>
      )}

      {/* Professional Responsive Pagination Controls - Only show if there are multiple pages */}
      {!skeletonLoading &&
        !isLoading &&
        totalFiltered > 0 &&
        totalPages > 1 && (
          <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
            {/* Top Row - Results Info and Items Per Page */}
            <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                <span className="text-sm sm:text-base text-foreground font-semibold">
                  Showing{" "}
                  <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  -
                  <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {Math.min(currentPage * itemsPerPage, totalFiltered)}
                  </span>{" "}
                  of{" "}
                  <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {totalFiltered}
                  </span>{" "}
                  projects
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-3">
                <label
                  htmlFor="items-per-page"
                  className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                >
                  Items per page:
                </label>
                <div className="relative group">
                  <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="appearance-none border border-border/60 rounded-lg px-4 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 min-w-[90px] font-medium group-hover:border-primary/40 group-hover:bg-background/90"
                    aria-label="Items per page"
                  >
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110">
                    <svg
                      className="w-4 h-4 text-muted-foreground group-hover:text-primary/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row - Pagination Navigation */}
            <div className="flex flex-col sm:flex-row md:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 sm:pt-0 md:pt-0 border-t border-border/30">
              {/* Page Info for Mobile */}
              <div className="sm:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
                <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
                Page{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalPages}
                </span>
              </div>

              {/* Enhanced Pagination Controls */}
              <div className="flex items-center justify-center gap-2 w-full sm:w-auto md:w-auto">
                {/* Previous Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                >
                  <svg
                    className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline transition-transform duration-200 group-hover:-translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden text-lg">‹</span>
                </Button>

                {/* Page Numbers - Responsive Display */}
                <div className="flex items-center justify-center gap-1.5">
                  {/* Always show first page on larger screens */}
                  <Button
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    className="h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                  >
                    1
                  </Button>

                  {/* Show ellipsis if needed on larger screens */}
                  {currentPage > 4 && (
                    <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                      •••
                    </span>
                  )}

                  {/* Dynamic page numbers based on current page - show more on larger screens */}
                  {(() => {
                    const pages = [];
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);

                    for (let i = start; i <= end; i++) {
                      if (i > 1 && i < totalPages) {
                        pages.push(i);
                      }
                    }

                    return pages.map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        {page}
                      </Button>
                    ));
                  })()}

                  {/* Show ellipsis if needed on larger screens */}
                  {currentPage < totalPages - 3 && (
                    <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                      •••
                    </span>
                  )}

                  {/* Always show last page if more than 1 page on larger screens */}
                  {totalPages > 1 && (
                    <Button
                      variant={
                        currentPage === totalPages ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    >
                      {totalPages}
                    </Button>
                  )}

                  {/* Mobile-friendly page selector */}
                  <div className="md:hidden flex items-center gap-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 transition-all duration-200">
                    <select
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      className="border-0 bg-transparent text-sm font-semibold text-primary focus:outline-none focus:ring-0 min-w-[50px] cursor-pointer hover:text-primary/80 transition-colors duration-200"
                      aria-label="Go to page"
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-muted-foreground font-medium">
                      {" "}
                      <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalPages}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Next Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden text-lg">›</span>
                  <svg
                    className="w-4 h-4 ml-1 sm:ml-2 hidden sm:inline transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </div>

              {/* Page Info for Desktop */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
                Page{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalPages}
                </span>
              </div>
            </div>
          </div>
        )}

      {/* Simple results info when no pagination needed */}
      {!skeletonLoading &&
        !isLoading &&
        totalFiltered > 0 &&
        totalPages <= 1 && (
          <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
              <span className="text-sm sm:text-base text-foreground font-semibold">
                Showing{" "}
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalFiltered}
                </span>{" "}
                projects
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <label
                htmlFor="items-per-page-simple"
                className="text-sm text-muted-foreground font-medium whitespace-nowrap"
              >
                Items per page:
              </label>
              <div className="relative group">
                <select
                  id="items-per-page-simple"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="appearance-none border border-border/60 rounded-lg px-4 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 min-w-[90px] font-medium group-hover:border-primary/40 group-hover:bg-background/90"
                  aria-label="Items per page"
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110">
                  <svg
                    className="w-4 h-4 text-muted-foreground group-hover:text-primary/70"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Projects Grid with Loading Skeletons */}
      {skeletonLoading ||
      isLoading ||
      (totalFiltered === 0 &&
        projects.length > 0 &&
        Object.keys(userProjectMemberships).length === 0) ? (
        <div
          className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-busy="true"
          aria-label="Loading projects"
        >
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
        </div>
      ) : totalFiltered === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 sm:p-8 text-center bg-background/80">
          <div className="mx-auto flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg sm:text-xl font-semibold">
            No projects found
          </h3>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md">
            {searchQuery
              ? "We couldn't find any projects matching your search criteria."
              : "You are not a member of any projects yet."}
          </p>
          {currentUser?.role === "admin" && (
            <Button
              className="mt-4 sm:mt-6 h-10 sm:h-11 px-6 sm:px-8"
              onClick={() =>
                document
                  .querySelector<HTMLButtonElement>(
                    '[data-dialog-trigger="new-project"]'
                  )
                  ?.click()
              }
            >
              Create New Project
            </Button>
          )}
        </div>
      ) : (
        <div
          className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Project list"
        >
          {paginatedProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="flex flex-col h-full rounded-xl shadow-sm border border-border bg-background/90 transition-all duration-200 hover:shadow-md hover:border-primary/20">
                <CardHeader className="pb-2 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        project.status === "active" ? "default" : "outline"
                      }
                      className="text-xs sm:text-sm px-2 py-1 mb-2"
                    >
                      {project.status.charAt(0).toUpperCase() +
                        project.status.slice(1)}
                    </Badge>
                    <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <CardTitle>
                    <Link
                      to={
                        currentUser?.role
                          ? `/${currentUser.role}/projects/${project.id}`
                          : `/projects/${project.id}`
                      }
                      className="hover:underline break-words text-base sm:text-lg lg:text-xl hover:text-primary transition-colors"
                    >
                      {project.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="break-words text-xs sm:text-sm lg:text-base mt-1 sm:mt-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end py-2 px-4 sm:px-5">
                  <div className="flex flex-col gap-3">
                    {/* Enhanced Bug Stats */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
                      <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Total
                        </span>
                        <span className="font-semibold text-lg sm:text-xl">
                          {projectBugsCount[project.id] ?? 0}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          Bugs
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors duration-200">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Open
                        </span>
                        <span className="font-semibold text-lg sm:text-xl text-yellow-600 dark:text-yellow-400">
                          {projectOpenBugsCount[project.id] ?? 0}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          Bugs
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Fixed
                        </span>
                        <span className="font-semibold text-lg sm:text-xl text-green-600 dark:text-green-400">
                          {projectFixedBugsCount[project.id] ?? 0}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          Bugs
                        </span>
                      </div>
                    </div>

                    {/* Enhanced Team Stats */}
                    <div className="flex items-center justify-between mt-1 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors duration-200">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                        <span className="text-sm sm:text-base font-medium">
                          Team
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div
                          className="flex items-center gap-1"
                          title="Developers"
                        >
                          <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                          <span className="text-xs sm:text-sm">
                            {projectMemberCounts[project.id]?.developers ?? 0}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1"
                          title="Testers"
                        >
                          <TestTube className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                          <span className="text-xs sm:text-sm">
                            {projectMemberCounts[project.id]?.testers ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title="Admins">
                          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                          <span className="text-xs sm:text-sm">
                            {/* Assume all admins have access */}
                            {currentUser?.role === "admin" ? "1+" : "1"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 sm:gap-3 sm:flex-row pt-2 mt-auto p-4 sm:p-5">
                  <Button
                    asChild
                    variant="default"
                    className="w-full sm:w-auto shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 h-10 sm:h-11"
                  >
                    <Link
                      to={
                        currentUser?.role
                          ? `/${currentUser.role}/projects/${project.id}`
                          : `/projects/${project.id}`
                      }
                    >
                      View Project
                    </Link>
                  </Button>
                  {currentUser?.role === "admin" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 h-10 sm:h-11"
                            onClick={() => {
                              setProjectToDelete(project.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            You can only delete projects that have no team
                            members or bugs
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                This action cannot be undone. This will permanently delete the
                project.
                <div className="mt-4 bg-muted p-3 rounded-md text-sm">
                  <div className="font-medium mb-2">Note:</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Projects with team members or bugs cannot be deleted
                      directly.
                    </li>
                    <li>
                      You will be given the option to force delete if
                      constraints are detected.
                    </li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                projectToDelete && handleDelete(projectToDelete, false)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog for Delete Constraints */}
      <AlertDialog
        open={isErrorDialogOpen}
        onOpenChange={(open) => {
          setIsErrorDialogOpen(open);
          if (!open) {
            setDeleteErrorMessage("");
            if (!open && projectToDelete) setProjectToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cannot Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left">
                {deleteErrorMessage}

                <div className="mt-4 bg-muted p-3 rounded-md text-sm">
                  <div className="font-medium mb-2">
                    Before deleting a project:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Remove all team members from the project</li>
                    <li>Resolve or reassign all bugs in the project</li>
                  </ul>
                </div>

                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-sm border border-yellow-200 dark:border-yellow-800">
                  <div className="font-medium mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                    Alternative: Force Delete
                  </div>
                  <div className="mb-2">
                    You can also force delete this project, which will
                    automatically delete:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-yellow-700 dark:text-yellow-300">
                    <li>All team member associations</li>
                    <li>
                      All bugs and their fixes associated with this project
                    </li>
                  </ul>
                  <div className="mt-2 text-yellow-700 dark:text-yellow-300 font-medium">
                    Warning: This action cannot be undone!
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="sm:mr-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  handleDelete(projectToDelete, true);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" /> Force Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs
        value={tabFromUrl}
        onValueChange={handleTabChange}
        className="w-full"
      >
        {/* ... */}
      </Tabs>
    </div>
  );
};

export default Projects;
