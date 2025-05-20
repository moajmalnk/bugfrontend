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
import { toast, useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { bugService } from "@/services/bugService";
import { Project, projectService } from "@/services/projectService";
import { AlertCircle, CheckCircle2, FolderKanban, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    fetchProjects();
    fetchAndCountBugs();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndCountBugs = async () => {
    try {
      const bugs = await bugService.getBugs();
      const totalCounts: Record<string, number> = {};
      const openCounts: Record<string, number> = {};
      const fixedCounts: Record<string, number> = {};

      bugs.forEach((bug: any) => {
        if (bug.project_id) {
          const pid = String(bug.project_id);
          // Total bugs
          totalCounts[pid] = (totalCounts[pid] || 0) + 1;
          // Open bugs (pending or in_progress)
          if (bug.status === "pending" || bug.status === "in_progress") {
            openCounts[pid] = (openCounts[pid] || 0) + 1;
          }
          // Fixed bugs
          if (bug.status === "fixed") {
            fixedCounts[pid] = (fixedCounts[pid] || 0) + 1;
          }
        }
      });

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

  const handleDelete = async (projectId: string) => {
    setIsDeleteDialogOpen(false);
    setProjects((prevProjects) =>
      prevProjects.filter((p) => p.id !== projectId)
    );

    try {
      const response = await fetch(
        `${ENV.API_URL}/projects/delete.php?id=${projectId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Project deleted successfully",
        });
      } else {
        toast({
          title: "Success",
          description: data.message || "Failed to delete project",
          variant: "destructive",
        });
        fetchProjects();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the project",
        variant: "destructive",
      });
      fetchProjects();
    } finally {
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

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

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center bg-background/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find any projects matching your search criteria.
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
          className="
            grid gap-4
            grid-cols-1
            md:grid-cols-2
          "
        >
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="flex flex-col h-full rounded-xl shadow-sm border border-border bg-background/90 transition-transform hover:scale-[1.015] hover:shadow-lg"
            >
              <CardHeader className="pb-2">
                <CardTitle>
                  <Link
                    to={`/projects/${project.id}`}
                    className="hover:underline break-words text-base md:text-lg"
                  >
                    {project.name}
                  </Link>
                </CardTitle>
                <CardDescription className="break-words text-xs md:text-sm">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {project.status === "active" ? (
                    <Badge variant="default" className="text-xs px-2 py-1">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {project.status}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="ml-auto flex flex-col items-start gap-1 min-w-[110px] rounded-md"
                  >
                    <span className="flex items-center gap-1 text-sm">
                      🐞 {projectBugsCount[project.id] ?? 0} Total
                    </span>
                    <span className="flex items-center gap-1 text-xs text-yellow-500">
                      <AlertCircle className="h-3 w-3" />
                      {projectOpenBugsCount[project.id] ?? 0} Open
                    </span>
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      {projectFixedBugsCount[project.id] ?? 0} Fixed
                    </span>
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 sm:flex-row mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  asChild
                >
                  <Link to={`/projects/${project.id}`}>View Project</Link>
                </Button>
                {currentUser?.role === "admin" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setProjectToDelete(project.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && handleDelete(projectToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projects;
