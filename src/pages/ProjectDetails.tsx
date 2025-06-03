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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { formatBugDate } from "@/lib/dateUtils";
import { bugService, Bug as BugType } from "@/services/bugService";
import { Project, projectService, UpdateProjectData } from "@/services/projectService";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  UserRound,
  X,
  Search,
  Shield,
  Code,
  TestTube,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { motion } from "framer-motion";

// Skeleton components for loading state
const ProjectHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
    <div className="w-full md:w-auto">
      <Skeleton className="h-8 w-64 md:w-80 mb-2" />
      <Skeleton className="h-5 w-full md:w-96 max-w-xl" />
    </div>
    <Skeleton className="h-10 w-full md:w-32 mt-4 md:mt-0" />
  </div>
);

const StatsCardSkeleton = () => (
  <Card className="flex-1 min-w-[150px]">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-12" />
    </CardContent>
  </Card>
);

const RecentActivitySkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40 mb-2" />
      <Skeleton className="h-4 w-60" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
      </div>
    </CardContent>
  </Card>
);

const BugCardSkeleton = () => (
  <div className="border border-border rounded-lg p-4">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40 sm:w-60" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
    <Skeleton className="h-16 w-full mb-3" />
    <div className="flex justify-between items-center">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

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

// Member card component for cleaner JSX
const MemberCard = ({ 
  member, 
  isAdmin = false, 
  onRemove 
}: { 
  member: ProjectUser; 
  isAdmin?: boolean; 
  onRemove?: (id: string) => void 
}) => {
  const { currentUser } = useAuth();
  const canRemove = currentUser?.role === "admin" && !isAdmin;
  
  // Determine icon based on role
  const RoleIcon = isAdmin ? Shield : member.role === "developer" ? Code : TestTube;
  
  // Determine color scheme based on role
  const colorScheme = isAdmin 
    ? "bg-blue-50 text-blue-700 border-blue-200" 
    : member.role === "developer" 
      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
      : "bg-purple-50 text-purple-700 border-purple-200";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-sm hover:shadow transition-shadow duration-200 border">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${colorScheme}`}>
                <RoleIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-base">{member.username}</h4>
                <p className="text-xs text-muted-foreground">{member.email}</p>
                <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs rounded-full ${colorScheme} border`}>
                  {isAdmin ? "Admin" : member.role}
                </span>
              </div>
            </div>
            
            {canRemove && onRemove && (
              <Button 
                size="sm" 
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-full"
                onClick={() => onRemove(member.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwner, setProjectOwner] = useState<ProjectUser | null>(null);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [availableMembers, setAvailableMembers] = useState<ProjectUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectUser[]>([]);
  const [admins, setAdmins] = useState<ProjectUser[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchProjectBugs();
      fetchMembers();
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

  const fetchAvailableMembers = async () => {
    const res = await fetch(
      `${ENV.API_URL}/projects/get_available_members.php?project_id=${projectId}`
    );
    const data = await res.json();
    setAvailableMembers(data.users);
  };

  const fetchMembers = async () => {
    const res = await fetch(`${ENV.API_URL}/projects/get_members.php?project_id=${projectId}`);
    const data = await res.json();
    setMembers(data.members || []);
    setAdmins(data.admins || []);
  };

  const handleAddMember = async () => {
    const token = localStorage.getItem("token");
    const selectedMember = availableMembers.find(u => u.id === selectedUser);
    const role = selectedMember?.role;
    if (!selectedUser || !role) return;
    await fetch(`${ENV.API_URL}/projects/add_member.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project_id: projectId, user_id: selectedUser, role }),
    });
    setSelectedUser(null);
    fetchAvailableMembers();
    fetchMembers();
    toast({ title: "Success", description: "Member added!" });
  };

  const handleRemoveMember = async (userId: string) => {
    // Open confirmation dialog by setting memberToRemove
    setMemberToRemove(userId);
  };
  
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${ENV.API_URL}/projects/remove_member.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project_id: projectId, user_id: memberToRemove }),
      });
      
      const data = await response.json();
      if (data.success) {
        fetchMembers();
        toast({ title: "Success", description: "Member removed successfully" });
      } else {
        toast({ 
          title: "Error", 
          description: data.message || "Failed to remove member", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      // Close the dialog
      setMemberToRemove(null);
    }
  };

  const handleUpdateProject = async (updateData: UpdateProjectData): Promise<boolean> => {
    try {
      await projectService.updateProject(projectId!, updateData);
      
      // Update the local project state with the new data
      if (project) {
        setProject({
          ...project,
          ...updateData,
          updated_at: new Date().toISOString()
        });
      }
      
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Filter members based on search query
  const filteredMembers = members.filter(member => 
    member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredAdmins = admins.filter(admin => 
    admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render skeleton loading UI
  if (isLoading) {
    return (
      <div
        className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto"
        aria-busy="true"
        aria-label="Loading project details"
      >
        <ProjectHeaderSkeleton />

        <div className="flex flex-nowrap overflow-x-auto gap-2 md:gap-4 pb-1 mb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <Skeleton className="h-10 w-28 flex-shrink-0" />
          <Skeleton className="h-10 w-28 flex-shrink-0" />
          <Skeleton className="h-10 w-28 flex-shrink-0" />
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        <div className="mt-6">
          <RecentActivitySkeleton />
        </div>
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
    <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? They will lose access to this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Header - Responsive Layout */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <div className="w-full md:w-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words max-w-full">
            {project.name}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base break-words max-w-xl">
            {project.description}
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <EditProjectDialog 
            project={project}
            onSubmit={handleUpdateProject}
          />
        )}
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="flex flex-nowrap overflow-x-auto gap-2 md:gap-4 pb-1 mb-4 custom-scrollbar">
          <TabsTrigger value="overview" className="flex-1 min-w-[100px]">
            Overview
          </TabsTrigger>
          <TabsTrigger value="bugs" className="flex-1 min-w-[100px]">
            Bugs
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-1 min-w-[100px]">
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Stats Cards - Responsive grid that works on all screen sizes */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="flex-1 min-w-0">
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

            <Card className="flex-1 min-w-0">
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

            <Card className="flex-1 min-w-0 xs:col-span-2 lg:col-span-1">
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
                <div className="text-center py-6 sm:py-8">
                  <Clock className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium">
                    Feature Coming Soon
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
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
              
              {/* Role-based action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {/* Report Bug button - for testers and admins */}
                {(currentUser?.role === "tester" || currentUser?.role === "admin") && (
              <Button
                asChild
                    className="w-full sm:w-auto"
                size="sm"
              >
                <Link to={`/bugs/new?projectId=${projectId}`}>
                  <Plus className="mr-2 h-4 w-4" /> Report Bug
                </Link>
              </Button>
                )}
                
                {/* Fix Bug button - for developers and admins */}
                {(currentUser?.role === "developer" || currentUser?.role === "admin") && (
                  <Button
                    asChild
                    className="w-full sm:w-auto"
                    size="sm"
                    variant="outline"
                  >
                    <Link to={`/bugs?project_id=${projectId}&status=pending,in_progress`}>
                      <Wrench className="mr-2 h-4 w-4" /> Fix Bugs
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {bugs.length === 0 ? (
                <EmptyState
                  title="No bugs reported"
                  description="This project doesn't have any bugs reported yet."
                  action={
                    (currentUser?.role === "tester" || currentUser?.role === "admin") ? (
                    <Button asChild size="sm">
                      <Link to={`/bugs/new?projectId=${projectId}`}>
                        Report First Bug
                      </Link>
                    </Button>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No bugs to fix yet
                      </div>
                    )
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
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pb-2">
              <div>
                <CardTitle className="text-xl">Project Members</CardTitle>
                <CardDescription>
                  People with access to this project
                </CardDescription>
              </div>
              
              {currentUser?.role === "admin" && (
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-[260px]">
                    <select
                      className="appearance-none w-full border rounded-lg px-3 py-2 pr-10 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-all duration-200 text-sm"
                      value={selectedUser ?? ""}
                      onChange={e => setSelectedUser(e.target.value)}
                      onClick={fetchAvailableMembers}
                    >
                      <option value="" className="text-muted-foreground">Select member to add...</option>
                      {availableMembers.length === 0 ? (
                        <option value="" disabled className="text-muted-foreground">Loading members...</option>
                      ) : (
                        availableMembers
                          .filter(user => user.id)
                          .map(user => (
                            <option key={user.id} value={user.id} className="py-1">
                              {user.username} ({user.role})
                            </option>
                          ))
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                      <UserRound className="h-4 w-4" />
                    </div>
                  </div>
                  
              <Button
                    size="default"
                    disabled={!selectedUser}
                    onClick={handleAddMember}
                    className="shrink-0 shadow-sm hover:shadow transition-all duration-200 bg-primary font-medium"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Member
              </Button>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="relative w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 border border-border rounded-md pl-10 pr-12 py-2 
                  focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none 
                  shadow-sm hover:border-primary/50 transition-all duration-200 
                  bg-background/50 backdrop-blur-sm"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                {searchQuery && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Button
                  size="sm"
                      variant="ghost" 
                      className="h-6 w-6 p-0 rounded-full opacity-70 hover:opacity-100"
                      onClick={() => setSearchQuery("")}
                >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Clear search</span>
                </Button>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-blue-600" /> 
                  Administrators
                </h3>
                
                {filteredAdmins.length === 0 && (
                  <p className="text-muted-foreground text-sm italic">
                    {searchQuery ? "No administrators match your search." : "No administrators assigned."}
                  </p>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  {filteredAdmins.map(admin => (
                    <MemberCard 
                      key={admin.id} 
                      member={admin} 
                      isAdmin={true} 
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <UserRound className="h-5 w-5 mr-2 text-purple-600" /> 
                  Project Members
                </h3>
                
                {filteredMembers.length === 0 && (
                  <p className="text-muted-foreground text-sm italic">
                    {searchQuery 
                      ? "No members match your search." 
                      : "No members assigned to this project yet."}
                  </p>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  {filteredMembers.map(member => (
                    <MemberCard 
                      key={member.id} 
                      member={member} 
                      onRemove={handleRemoveMember} 
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetails;
