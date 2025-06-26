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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast, useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { bugService } from "@/services/bugService";
import { Project, projectService } from "@/services/projectService";
import { Bug } from "@/types";
import { 
  AlertCircle, 
  CheckCircle2, 
  FolderKanban, 
  Search, 
  Clock, 
  UserRound, 
  Users, 
  Shield,
  Code,
  TestTube,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs } from "@/components/ui/tabs";

// Project Card Skeleton component for loading state
const ProjectCardSkeleton = () => (
  <Card className="flex flex-col h-full rounded-xl shadow-sm border border-border bg-background/90">
    <CardHeader className="pb-2">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="flex-1 flex flex-col justify-end">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Skeleton className="h-5 w-16" />
        <div className="ml-auto flex flex-col items-start gap-1 min-w-[110px] rounded-md">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </CardContent>
    <CardFooter className="flex flex-col gap-2 sm:flex-row mt-auto">
      <Skeleton className="h-8 w-full sm:w-24" />
      <Skeleton className="h-8 w-full sm:w-24" />
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
  const [userProjectMemberships, setUserProjectMemberships] = useState<Record<string, boolean>>({});
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "overview";

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
      // Once projects are loaded, fetch bug counts and member info
      fetchAndCountBugs();
      fetchProjectMembers();
      // Check user membership for all projects
      checkUserMembership();
      
      // Keep skeleton loading on until membership data is properly loaded
      // We'll turn it off after membership filtering is complete
    }
  }, [projects]);
  
  // Apply filtering whenever search query or memberships change
  useEffect(() => {
    if (projects.length > 0) {
      applyFilters();
    }
  }, [searchQuery, userProjectMemberships, projects]);
  
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
        projects.forEach(project => {
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
            const isMember = members.some(member => String(member.id) === String(currentUser.id));
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
    if (projects.length === 0 || Object.keys(userProjectMemberships).length === 0) {
      setFilteredProjects([]);
      return;
    }

    let filtered = projects;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        project =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Admins see all, others see only assigned projects
    if (currentUser?.role !== "admin") {
      filtered = filtered.filter(project => userProjectMemberships[project.id]);
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
            const devCount = members.filter(m => m.role === 'developer').length;
            const testerCount = members.filter(m => m.role === 'tester').length;
            
            memberCounts[project.id] = {
              total: members.length,
              developers: devCount,
              testers: testerCount
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
        const { bugs } = await bugService.getBugs(project.id, 1, 1000);
        const totalBugs = bugs.length;

        totalCounts[project.id] = totalBugs;

        const openBugs = bugs.filter(bug => bug.status === "pending" || bug.status === "in_progress");
        openCounts[project.id] = openBugs.length;

        const fixedBugs = bugs.filter(bug => bug.status === "fixed");
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
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await response.json();

      if (data.success) {
        // Update both project arrays
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        setFilteredProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        
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
        if (data.message?.includes('team members') || 
            data.message?.includes('bugs') || 
            data.message?.includes('constraint')) {
          
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

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-8 py-4 sm:py-6 w-full max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">
            Projects
          </h1>
          <p className="text-muted-foreground mt-1 break-words max-w-xl">
            Manage your projects and track bugs
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <div className="w-full md:w-auto">
            <NewProjectDialog onSubmit={handleCreateProject} />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8 w-full rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Grid with Loading Skeletons */}
      {skeletonLoading || isLoading || filteredProjects.length === 0 && projects.length > 0 && Object.keys(userProjectMemberships).length === 0 ? (
        <div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading projects"
        >
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center bg-background/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery 
              ? "We couldn't find any projects matching your search criteria."
              : "You are not a member of any projects yet."
            }
          </p>
          {currentUser?.role === "admin" && (
            <Button
              className="mt-4"
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
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Project list"
        >
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card
                className="flex flex-col h-full rounded-xl shadow-sm border border-border bg-background/90 transition-all duration-200 hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={project.status === "active" ? "default" : "outline"} 
                      className="text-xs px-2 py-0.5 mb-2"
                    >
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <CardTitle>
                    <Link
                      to={currentUser?.role ? `/${currentUser.role}/projects/${project.id}` : `/projects/${project.id}`}
                      className="hover:underline break-words text-base md:text-lg hover:text-primary transition-colors"
                    >
                      {project.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="break-words text-xs md:text-sm mt-1">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end py-2">
                  <div className="flex flex-col gap-3">
                    {/* Bug Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="font-semibold text-lg">{projectBugsCount[project.id] ?? 0}</span>
                        <span className="text-[10px] text-muted-foreground">Bugs</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <span className="text-xs text-muted-foreground">Open</span>
                        <span className="font-semibold text-lg text-yellow-600 dark:text-yellow-400">
                          {projectOpenBugsCount[project.id] ?? 0}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Bugs</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <span className="text-xs text-muted-foreground">Fixed</span>
                        <span className="font-semibold text-lg text-green-600 dark:text-green-400">
                          {projectFixedBugsCount[project.id] ?? 0}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Bugs</span>
                      </div>
                    </div>
                    
                    {/* Team Stats */}
                    <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/20">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm font-medium">Team</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1" title="Developers">
                          <Code className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs">{projectMemberCounts[project.id]?.developers ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Testers">
                          <TestTube className="h-3.5 w-3.5 text-purple-600" />
                          <span className="text-xs">{projectMemberCounts[project.id]?.testers ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Admins">
                          <Shield className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs">
                            {/* Assume all admins have access */}
                            {currentUser?.role === "admin" ? "1+" : "1"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 sm:flex-row pt-2 mt-auto">
                  <Button
                    asChild
                    variant="default"
                    className="w-full sm:w-auto shadow-sm hover:shadow transition-all duration-200"
                  >
                    <Link to={currentUser?.role ? `/${currentUser.role}/projects/${project.id}` : `/projects/${project.id}`}>View Project</Link>
                  </Button>
                  {currentUser?.role === "admin" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto shadow-sm hover:shadow transition-all duration-200"
                            onClick={() => {
                              setProjectToDelete(project.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>You can only delete projects that have no team members or bugs</p>
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
              onClick={() => projectToDelete && handleDelete(projectToDelete, false)}
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
                  <div className="font-medium mb-2">Before deleting a project:</div>
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
                    You can also force delete this project, which will automatically delete:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-yellow-700 dark:text-yellow-300">
                    <li>All team member associations</li>
                    <li>All bugs and their fixes associated with this project</li>
                  </ul>
                  <div className="mt-2 text-yellow-700 dark:text-yellow-300 font-medium">
                    Warning: This action cannot be undone!
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="sm:mr-auto">
              Cancel
            </AlertDialogCancel>
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

      <Tabs value={tabFromUrl} onValueChange={handleTabChange} className="w-full">
        {/* ... */}
      </Tabs>
    </div>
  );
};

export default Projects;
