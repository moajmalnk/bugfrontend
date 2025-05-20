import { BugCard } from "@/components/ui/bug-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { bugService, Bug as BugType } from "@/services/bugService";
import { Project, projectService } from "@/services/projectService";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwner, setProjectOwner] = useState<ProjectUser | null>(null);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
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
        const token = localStorage.getItem("token");
        try {
          const response = await fetch(
            `${ENV.API_URL}/users/get.php?id=${projectData.created_by}`,
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const userData = await response.json();
            setProjectOwner(userData.data);
          } else {
            // Ignore user fetch errors, just don't set owner
            setProjectOwner(null);
          }
        } catch {
          setProjectOwner(null);
        }
      } else {
        setProjectOwner(null);
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
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-lg font-semibold text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words max-w-full">
            {project.name}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base break-words max-w-xl">
            {project.description}
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <Button
            onClick={() => {
              toast({
                title: "Coming Soon",
                description:
                  "Project editing functionality will be available soon.",
                variant: "default",
              });
            }}
            className="w-full md:w-auto mt-4 md:mt-0"
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit Project
          </Button>
        )}
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="flex flex-nowrap overflow-x-auto gap-2 md:gap-4 mb-4">
          <TabsTrigger value="overview" className="flex-1 min-w-[120px]">
            Overview
          </TabsTrigger>
          <TabsTrigger value="bugs" className="flex-1 min-w-[120px]">
            Bugs
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-1 min-w-[120px]">
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bugs
                </CardTitle>
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
                  {
                    bugs.filter(
                      (bug) =>
                        bug.status === "pending" || bug.status === "in_progress"
                    ).length
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Fixed Bugs
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bugs.filter((bug) => bug.status === "fixed").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates in this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">
                    Feature Coming Soon
                  </h3>
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
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div>
                <CardTitle>Project Bugs</CardTitle>
                <CardDescription>
                  All bugs reported in this project
                </CardDescription>
              </div>
              <Button asChild className="w-full sm:w-auto mt-2 sm:mt-0">
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
                    <div key={bug.id} className="w-full max-w-full">
                      <BugCard bug={bug} onDelete={() => fetchProjectBugs()} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
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
                    description:
                      "Member management functionality will be available soon.",
                    variant: "default",
                  });
                }}
                className="w-full sm:w-auto mt-2 sm:mt-0"
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
                        description:
                          "Member management functionality will be available soon.",
                        variant: "default",
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
