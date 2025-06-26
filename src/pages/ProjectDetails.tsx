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
import { ActivityList } from "@/components/activities/ActivityList";
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
import { useActivityLogger } from "@/hooks/useActivityLogger";

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

function isValidUUID(uuid: string): boolean {
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
      <Card className="shadow-sm hover:shadow transition-shadow duration-200 border h-full">
        <CardContent className="p-3 sm:p-4 lg:p-5 h-full">
          <div className="flex justify-between items-start h-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className={`p-1.5 sm:p-2 rounded-full ${colorScheme} flex-shrink-0`}>
                <RoleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm sm:text-base truncate">{member.username}</h4>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                <span className={`inline-block mt-1 sm:mt-1.5 px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${colorScheme} border`}>
                  {isAdmin ? "Admin" : member.role}
                </span>
              </div>
            </div>
            
            {canRemove && onRemove && (
              <Button 
                size="sm" 
                variant="ghost"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive rounded-full flex-shrink-0 ml-2"
                onClick={() => onRemove(member.id)}
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
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
  const { logMemberActivity, logProjectActivity } = useActivityLogger();
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
      const { bugs } = await bugService.getBugs(projectId, 1, 1000);
      const totalBugs = bugs.length;
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
    try {
      const res = await fetch(
        `${ENV.API_URL}/projects/get_available_members.php?project_id=${projectId}`
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        setAvailableMembers(data.data?.users || []);
      } else {
        //.error("Failed to fetch available members:", data.message);
        setAvailableMembers([]);
      }
    } catch (error) {
      //.error("Error fetching available members:", error);
      setAvailableMembers([]);
      toast({
        title: "Error",
        description: "Failed to load available members. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${ENV.API_URL}/projects/get_members.php?project_id=${projectId}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        // Handle both old and new API response formats
        const responseData = data.data || data;
        setMembers(responseData.members || []);
        setAdmins(responseData.admins || []);
      } else {
        //.error("Failed to fetch members:", data.message);
        setMembers([]);
        setAdmins([]);
        toast({
          title: "Error", 
          description: data.message || "Failed to load project members",
          variant: "destructive"
        });
      }
    } catch (error) {
      //.error("Error fetching members:", error);
      setMembers([]);
      setAdmins([]);
      toast({
        title: "Error",
        description: "Failed to load project members. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser || !Array.isArray(availableMembers)) return;
    
    try {
      const token = localStorage.getItem("token");
      const selectedMember = availableMembers.find(u => u.id === selectedUser);
      const role = selectedMember?.role;
      
      if (!selectedUser || !role) {
        toast({
          title: "Error",
          description: "Please select a valid user and role",
          variant: "destructive",
        });
        return;
      }
      
      const response = await fetch(`${ENV.API_URL}/projects/add_member.php`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          project_id: projectId, 
          user_id: selectedUser, 
          role 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedUser(null);
        await Promise.all([fetchAvailableMembers(), fetchMembers()]);
        
        // Log the activity
        if (selectedMember && projectId) {
          await logMemberActivity(projectId, selectedMember.username, 'added', role);
        }
        
        toast({ 
          title: "Success", 
          description: "Member added successfully!" 
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add member",
          variant: "destructive",
        });
      }
    } catch (error) {
      //.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    // Open confirmation dialog by setting memberToRemove
    setMemberToRemove(userId);
  };
  
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      const token = localStorage.getItem("token");
      
      // Find the member to get their username for activity logging
      const memberToLog = [...members, ...admins].find(m => m.id === memberToRemove);
      
      const response = await fetch(`${ENV.API_URL}/projects/remove_member.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project_id: projectId, user_id: memberToRemove }),
      });
      
      const data = await response.json();
      if (data.success) {
        fetchMembers();
        
        // Log the activity
        if (memberToLog && projectId) {
          await logMemberActivity(projectId, memberToLog.username, 'removed', memberToLog.role);
        }
        
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
      
      // Log the project update activity
      if (projectId) {
        await logProjectActivity('project_updated', projectId, 'updated project details', {
          updated_fields: Object.keys(updateData)
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

  // Filter members based on search query - with safe array handling
  const filteredMembers = Array.isArray(members) 
    ? members.filter(member => 
        member?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  const filteredAdmins = Array.isArray(admins)
    ? admins.filter(admin => 
        admin?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

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
            <ActivityList 
              projectId={projectId}
              limit={8}
              showPagination={false}
              autoRefresh={true}
              refreshInterval={30000}
            />
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
                <Link to={currentUser?.role ? `/${currentUser.role}/bugs/new?projectId=${projectId}` : `/bugs/new?projectId=${projectId}`}>
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
                    <Link to={currentUser?.role ? `/${currentUser.role}/bugs?project_id=${projectId}&status=pending,in_progress` : `/bugs?project_id=${projectId}&status=pending,in_progress`}>
                      <Wrench className="mr-2 h-4 w-4" /> Fix Bugs
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {bugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg h-full">
                  <Bug className="w-12 h-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No Pending Bugs
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This project is all clear for now!
                  </p>
                  <Button asChild className="mt-4">
                    <Link to={currentUser?.role ? `/${currentUser.role}/bugs/new?projectId=${projectId}` : `/bugs/new?projectId=${projectId}`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Report a New Bug
                    </Link>
                  </Button>
                </div>
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
            <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-xl">Project Members</CardTitle>
                <CardDescription>
                  People with access to this project
                </CardDescription>
              </div>
              
              {currentUser?.role === "admin" && (
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  <div className="relative w-full sm:w-[280px] lg:w-[320px] xl:w-[280px]">
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
                    className="shrink-0 shadow-sm hover:shadow transition-all duration-200 bg-primary font-medium w-full sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Member
                  </Button>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 sm:h-10 border border-border rounded-md pl-9 sm:pl-10 pr-10 sm:pr-12 py-2 
                  focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none 
                  shadow-sm hover:border-primary/50 transition-all duration-200 
                  bg-background/50 backdrop-blur-sm text-sm sm:text-base"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none text-muted-foreground">
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                {searchQuery && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3">
                    <Button
                      size="sm"
                      variant="ghost" 
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 rounded-full opacity-70 hover:opacity-100"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Clear search</span>
                    </Button>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-600" /> 
                  Administrators
                </h3>
                
                {filteredAdmins.length === 0 && (
                  <p className="text-muted-foreground text-xs sm:text-sm italic">
                    {searchQuery ? "No administrators match your search." : "No administrators assigned."}
                  </p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mt-3">
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
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center">
                  <UserRound className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-purple-600" /> 
                  Project Members
                </h3>
                
                {filteredMembers.length === 0 && (
                  <p className="text-muted-foreground text-xs sm:text-sm italic">
                    {searchQuery 
                      ? "No members match your search." 
                      : "No members assigned to this project yet."}
                  </p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mt-3">
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
