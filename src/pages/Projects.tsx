import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bug, FolderKanban, Search, Plus, Trash2 } from 'lucide-react';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { projectService, Project } from '@/services/projectService';
import { bugService } from '@/services/bugService';
import { toast } from '@/components/ui/use-toast';
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
import { useToast } from '@/components/ui/use-toast';
import { ENV } from '@/lib/env';

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const { toast: useToastToast } = useToast();
  const [projectBugsCount, setProjectBugsCount] = useState<Record<string, number>>({});

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
      const counts: Record<string, number> = {};
      bugs.forEach((bug: any) => {
        if (bug.project_id) {
          counts[bug.project_id] = (counts[bug.project_id] || 0) + 1;
        }
      });
      setProjectBugsCount(counts);
    } catch (error) {
      // Fallback: do nothing
    }
  };

  const handleCreateProject = async (projectData: { name: string; description: string }) => {
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
    setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
    
    try {
      const response = await fetch(`${ENV.API_URL}/projects/delete.php?id=${projectId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Project deleted successfully"
        });
      } else {
        toast({
          title: "Success",
          description: data.message || "Failed to delete project",
          variant: "destructive"
        });
        fetchProjects();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the project",
        variant: "destructive"
      });
      fetchProjects();
    } finally {
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects.filter(project => 
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and track bugs</p>
        </div>
        {currentUser?.role === 'admin' && <NewProjectDialog onSubmit={handleCreateProject} />}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find any projects matching your search criteria.
          </p>
          {currentUser?.role === 'admin' && (
            <Button className="mt-4" onClick={() => document.querySelector<HTMLButtonElement>('[data-dialog-trigger="new-project"]')?.click()}>
              Create New Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>
                  <Link to={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {project.status === 'active' ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="outline">{project.status}</Badge>
                  )}
                  <Badge variant="secondary" className="ml-auto">
                    🐞 {projectBugsCount[project.id] ?? 0} Bugs
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to={`/projects/${project.id}`}>View Project</Link>
                </Button>
                {currentUser?.role === 'admin' && (
                  <Button 
                    variant="destructive" 
                    size="sm"
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all its associated data.
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
