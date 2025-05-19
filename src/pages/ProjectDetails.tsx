import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, ChevronLeft, Plus, User, Calendar, Clock, Pencil, AlertCircle, CheckCircle2 } from 'lucide-react';
import { projectService, Project } from '@/services/projectService';
import { bugService, Bug as BugType } from '@/services/bugService';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from '@/components/ui/empty-state';
import { BugCard } from '@/components/ui/bug-card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { ENV } from '@/lib/env';

interface ProjectUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  project_id: string;
  created_at: string;
}

function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwner, setProjectOwner] = useState<ProjectUser | null>(null);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchProjectBugs();
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const projectData = await projectService.getProject(projectId!);
      setProject(projectData);
      
      // Only fetch project owner if created_by is present and valid
      if (projectData.created_by && isValidUUID(projectData.created_by)) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${ENV.API_URL}/users/get.php?id=${projectData.created_by}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch user details');
        }

        const userData = await response.json();
        setProjectOwner(userData.data);
      } else {
        setProjectOwner(null); // or handle as "Unknown"
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectBugs = async () => {
    try {
      const bugs = await bugService.getBugs(projectId);
      setBugs(bugs);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project bugs. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        {currentUser?.role === 'admin' && (
          <Button 
            onClick={() => {
              toast({
                title: "Coming Soon",
                description: "Project editing functionality will be available soon.",
                variant: "default"
              });
            }}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit Project
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bugs">Bugs</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bugs</CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bugs.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Bugs</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bugs.filter(bug => bug.status === 'pending' || bug.status === 'in_progress').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fixed Bugs</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bugs.filter(bug => bug.status === 'fixed').length}
                </div>
              </CardContent>
            </Card>
          </div>
            
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates in this project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">Feature Coming Soon</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We're working hard to bring you project activity tracking.
                    Check back soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
          
        <TabsContent value="bugs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Bugs</CardTitle>
              <CardDescription>
                  All bugs reported in this project
              </CardDescription>
              </div>
              <Button asChild>
                <Link to={`/bugs/new?projectId=${projectId}`}>
                  <Plus className="mr-2 h-4 w-4" /> Report Bug
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {bugs.length === 0 ? (
                <EmptyState
                  title="No bugs reported"
                  description="This project doesn't have any bugs reported yet."
                  action={
                    <Button asChild>
                      <Link to={`/bugs/new?projectId=${projectId}`}>
                        Report First Bug
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {bugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} onDelete={() => {}} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Members</CardTitle>
                <CardDescription>
                  People with access to this project
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Member management functionality will be available soon.",
                    variant: "default"
                  });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Member
              </Button>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="Member Management Coming Soon"
                description="The ability to manage project members will be available in a future update."
                action={
                  <Button
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Member management functionality will be available soon.",
                        variant: "default"
                      });
                    }}
                  >
                    Add Members
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetails;
