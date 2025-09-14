import { ActivityList } from "@/components/activities/ActivityList";
import { BugCard } from "@/components/bugs/BugCard";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { ENV } from "@/lib/env";
import { bugService, Bug as BugType } from "@/services/bugService";
import {
  Project,
  projectService,
  UpdateProjectData,
} from "@/services/projectService";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronLeft,
  Code,
  Loader2,
  Plus,
  Search,
  Shield,
  TestTube,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

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
  onRemove,
}: {
  member: ProjectUser;
  isAdmin?: boolean;
  onRemove?: (id: string) => void;
}) => {
  const { currentUser } = useAuth();
  const canRemove = currentUser?.role === "admin" && !isAdmin;

  // Determine icon based on role
  const RoleIcon = isAdmin
    ? Shield
    : member.role === "developer"
    ? Code
    : TestTube;

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
              <div
                className={`p-1.5 sm:p-2 rounded-full ${colorScheme} flex-shrink-0`}
              >
                <RoleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm sm:text-base truncate">
                  {member.username}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
                <span
                  className={`inline-block mt-1 sm:mt-1.5 px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${colorScheme} border`}
                >
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { logMemberActivity, logProjectActivity } = useActivityLogger();
  const [availableMembers, setAvailableMembers] = useState<ProjectUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [members, setMembers] = useState<ProjectUser[]>([]);
  const [admins, setAdmins] = useState<ProjectUser[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "developer" | "tester">(
    "all"
  );
  const [isAdding, setIsAdding] = useState(false);
  // Bugs tab filters and pagination (sync with URL)
  const [bugSearch, setBugSearch] = useState(searchParams.get("q") || "");
  const [bugStatus, setBugStatus] = useState<string>(searchParams.get("status") || "pending");
  const [bugPriority, setBugPriority] = useState<string>(searchParams.get("priority") || "all");
  const [bugSort, setBugSort] = useState<string>(searchParams.get("sort") || "newest");
  const [bugPage, setBugPage] = useState(Number(searchParams.get("page") || 1));
  const [bugPageSize, setBugPageSize] = useState(Number(searchParams.get("pageSize") || 10));

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchProjectBugs();
      fetchMembers();
    }
  }, [projectId]);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "overview";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Reset bug page when bug filters change or tab changes to bugs
  useEffect(() => {
    setBugPage(1);
  }, [bugSearch, bugStatus, bugPriority, activeTab]);

  // Sync bug filters to URL whenever they change (only when on bugs tab)
  useEffect(() => {
    if (activeTab !== "bugs") return;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", "bugs");
      if (bugSearch) p.set("q", bugSearch); else p.delete("q");
      if (bugStatus && bugStatus !== "all") p.set("status", bugStatus); else p.delete("status");
      if (bugPriority && bugPriority !== "all") p.set("priority", bugPriority); else p.delete("priority");
      if (bugSort && bugSort !== "newest") p.set("sort", bugSort); else p.delete("sort");
      if (bugPage > 1) p.set("page", String(bugPage)); else p.delete("page");
      if (bugPageSize !== 10) p.set("pageSize", String(bugPageSize)); else p.delete("pageSize");
      return p as any;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bugSearch, bugStatus, bugPriority, bugSort, bugPage, bugPageSize, activeTab]);

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
      const { bugs } = await bugService.getBugs({
        projectId,
        page: 1,
        limit: 1000,
      });
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
      const res = await fetch(
        `${ENV.API_URL}/projects/get_members.php?project_id=${projectId}`
      );

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
          variant: "destructive",
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
    if (!Array.isArray(availableMembers) || selectedUsers.length === 0) return;

    try {
      setIsAdding(true);
      const token = localStorage.getItem("token");
      const addRequests = selectedUsers.map(async (userId) => {
        const selectedMember = availableMembers.find((u) => u.id === userId);
        const role = selectedMember?.role;
        if (!role) {
          return {
            userId,
            ok: false,
            username: selectedMember?.username,
            message: "Missing role",
          };
        }
        const response = await fetch(`${ENV.API_URL}/projects/add_member.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: projectId,
            user_id: userId,
            role,
          }),
        });
        const data = await response.json();
        if (data.success) {
          if (selectedMember && projectId) {
            await logMemberActivity(
              projectId,
              selectedMember.username,
              "added",
              role
            );
          }
          return { userId, ok: true, username: selectedMember?.username };
        }
        return {
          userId,
          ok: false,
          username: selectedMember?.username,
          message: data.message,
        };
      });

      const results = await Promise.all(addRequests);
      const successes = results.filter((r) => r.ok);
      const failures = results.filter((r) => !r.ok);

      setSelectedUsers([]);
      await Promise.all([fetchAvailableMembers(), fetchMembers()]);

      if (successes.length > 0) {
        toast({
          title: "Members added",
          description: `${successes.length} member${
            successes.length > 1 ? "s" : ""
          } added successfully`,
        });
      }
      if (failures.length > 0) {
        toast({
          title: "Some adds failed",
          description: `${failures.length} failed. ${
            failures[0]?.message || "Please try again."
          }`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding members",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
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
      const memberToLog = [...members, ...admins].find(
        (m) => m.id === memberToRemove
      );

      const response = await fetch(
        `${ENV.API_URL}/projects/remove_member.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: projectId,
            user_id: memberToRemove,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchMembers();

        // Log the activity
        if (memberToLog && projectId) {
          await logMemberActivity(
            projectId,
            memberToLog.username,
            "removed",
            memberToLog.role
          );
        }

        toast({ title: "Success", description: "Member removed successfully" });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to remove member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      // Close the dialog
      setMemberToRemove(null);
    }
  };

  const handleUpdateProject = async (
    updateData: UpdateProjectData
  ): Promise<boolean> => {
    try {
      await projectService.updateProject(projectId!, updateData);

      // Update the local project state with the new data
      if (project) {
        setProject({
          ...project,
          ...updateData,
          updated_at: new Date().toISOString(),
        });
      }

      // Log the project update activity
      if (projectId) {
        await logProjectActivity(
          "project_updated",
          projectId,
          "updated project details",
          {
            updated_fields: Object.keys(updateData),
          }
        );
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
    ? members
        .filter(
          (member) =>
            member?.username
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            member?.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((member) =>
          roleFilter === "all" ? true : member?.role === roleFilter
        )
    : [];

  const filteredAdmins = Array.isArray(admins)
    ? admins.filter(
        (admin) =>
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
      <Link
        to={`/${currentUser?.role || "tester"}/projects`}
        className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Back to Projects
      </Link>
      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? They will lose access
              to this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Header - Gradient/Glass style */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
        <div className="relative p-5 sm:p-6 md:p-7">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                {project.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-2xl break-words">
                {project.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                {projectOwner && (
                  <span>Owner: <span className="text-foreground">{projectOwner.username}</span></span>
                )}
                <span>Created: <span className="text-foreground">{new Date(project.created_at).toLocaleDateString()}</span></span>
                <span>Status: <span className="capitalize inline-flex items-center px-1.5 py-0.5 rounded-full border bg-muted/40">{project.status}</span></span>
              </div>
              <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"></div>
            </div>
            {currentUser?.role === "admin" && (
              <EditProjectDialog project={project} onSubmit={handleUpdateProject} />
            )}
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.set("tab", val);
            return p as any;
          });
        }}
        className="w-full"
      >
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
          <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
            <TabsList className="flex flex-nowrap overflow-x-auto gap-2 md:gap-4 p-1 custom-scrollbar bg-transparent">
              <TabsTrigger value="overview" className="flex-1 min-w-[100px] font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300">
                Overview
              </TabsTrigger>
              <TabsTrigger value="bugs" className="flex-1 min-w-[100px] font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300">
                Bugs
              </TabsTrigger>
              <TabsTrigger value="members" className="flex-1 min-w-[100px] font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300">
                Members
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

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

        {/* Bugs Tab */}
        <TabsContent value="bugs">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg">Project Bugs</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={bugSort} onValueChange={setBugSort}>
                    <SelectTrigger className="w-[170px] h-9 text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="priority_high">Priority: High→Low</SelectItem>
                      <SelectItem value="priority_low">Priority: Low→High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBugSearch("");
                      setBugStatus("pending");
                      setBugPriority("all");
                      setBugSort("newest");
                      setBugPage(1);
                      setBugPageSize(10);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by title or description..."
                    value={bugSearch}
                    onChange={(e) => setBugSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                  />
                </div>
                <Select value={bugStatus} onValueChange={setBugStatus}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bugPriority} onValueChange={setBugPriority}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10 text-sm">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* List */}
              {(() => {
                // Filtering
                let filtered = bugs.filter((b) => {
                  const matchesSearch =
                    b.title.toLowerCase().includes(bugSearch.toLowerCase()) ||
                    b.description
                      .toLowerCase()
                      .includes(bugSearch.toLowerCase());
                  const matchesStatus =
                    bugStatus === "all" || b.status === bugStatus;
                  const matchesPriority =
                    bugPriority === "all" || b.priority === bugPriority;
                  return matchesSearch && matchesStatus && matchesPriority;
                });

                // Sorting
                const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
                filtered = filtered.slice().sort((a, b) => {
                  switch (bugSort) {
                    case "oldest":
                      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    case "priority_high":
                      return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
                    case "priority_low":
                      return (priorityRank[a.priority] || 0) - (priorityRank[b.priority] || 0);
                    case "newest":
                    default:
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  }
                });
                const total = filtered.length;
                const pageStart = (bugPage - 1) * bugPageSize;
                const pageEnd = bugPage * bugPageSize;
                const pageItems = filtered.slice(pageStart, pageEnd);

                return (
                  <>
                    {total === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No bugs match your filters.
                      </div>
                    ) : (
                      <div className="grid gap-4 grid-cols-1">
                        {pageItems.map((bug) => (
                          <BugCard key={bug.id} bug={bug} />
                        ))}
                      </div>
                    )}

                    {/* Pagination */}
                    {total > bugPageSize && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <div className="text-sm text-muted-foreground">
                          Showing {Math.min(pageStart + 1, total)}-
                          {Math.min(pageEnd, total)} of {total}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setBugPage((p) => Math.max(1, p - 1))
                            }
                            disabled={bugPage === 1}
                          >
                            Previous
                          </Button>
                          <Select
                            value={String(bugPageSize)}
                            onValueChange={(v) => setBugPageSize(Number(v))}
                          >
                            <SelectTrigger className="w-[110px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10 / page</SelectItem>
                              <SelectItem value="25">25 / page</SelectItem>
                              <SelectItem value="50">50 / page</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setBugPage((p) =>
                                Math.min(Math.ceil(total / bugPageSize), p + 1)
                              )
                            }
                            disabled={bugPage >= Math.ceil(total / bugPageSize)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4">
              {currentUser?.role === "admin" && (
                <div className="flex flex-col gap-3 w-full">
                  <div className="w-full border border-border/60 rounded-lg p-3 bg-muted/10">
                    {/* Selected users as chips */}
                    <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-auto">
                      {selectedUsers.map((id) => {
                        const u = availableMembers.find((m) => m.id === id);
                        if (!u) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border bg-background text-sm shadow-sm"
                          >
                            <span
                              aria-hidden
                              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold"
                            >
                              {u.username?.[0]?.toUpperCase() || "U"}
                            </span>
                            {u.username} ({u.role})
                            <button
                              type="button"
                              className="ml-1 rounded-full h-5 w-5 grid place-items-center hover:bg-muted"
                              onClick={() =>
                                setSelectedUsers((prev) =>
                                  prev.filter((x) => x !== id)
                                )
                              }
                              aria-label={`Remove ${u.username}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {selectedUsers.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          No members selected yet
                        </span>
                      )}
                    </div>

                    {/* Single-select to add more users */}
                    <div className="relative">
                      <select
                        className="appearance-none w-full border rounded-lg px-3 py-2 pr-10 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-all duration-200 text-sm"
                        value=""
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            setSelectedUsers((prev) =>
                              prev.includes(value) ? prev : [...prev, value]
                            );
                          }
                        }}
                        onClick={fetchAvailableMembers}
                        aria-label="Select member to add"
                      >
                        <option value="" disabled>
                          Select member to add...
                        </option>
                        {availableMembers
                          ?.slice()
                          .sort((a, b) =>
                            (a.username || "").localeCompare(b.username || "")
                          )
                          .filter(
                            (user) =>
                              user.id && !selectedUsers.includes(user.id)
                          )
                          .map((user) => (
                            <option
                              key={user.id}
                              value={user.id}
                              className="py-1"
                            >
                              {user.username} ({user.role})
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pick a user to add; they appear above. Remove with the
                        ×.
                      </p>
                    </div>
                  </div>

                  {/* Actions row under the selector */}
                  <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 sm:justify-between">
                    {/* Badges on the left */}
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm flex-1">
                      <span className="px-2 py-1 rounded-md border bg-muted/40">
                        Admins: <strong>{filteredAdmins.length}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-md border bg-muted/40">
                        Members: <strong>{filteredMembers.length}</strong>
                      </span>
                      {selectedUsers.length > 0 && (
                        <span className="px-2 py-1 rounded-md border bg-blue-500/10 text-blue-600 dark:text-blue-300">
                          Selected: <strong>{selectedUsers.length}</strong>
                        </span>
                      )}
                    </div>

                    {/* Buttons on the right */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-end">
                      <Button
                        size="default"
                        disabled={selectedUsers.length === 0 || isAdding}
                        onClick={handleAddMember}
                        className="shrink-0 shadow-sm hover:shadow transition-all duration-200 bg-primary font-medium w-full sm:w-auto inline-flex items-center justify-center gap-2"
                        aria-label="Add selected members"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            <span>
                              {selectedUsers.length > 0
                                ? `Add ${selectedUsers.length} Member${
                                    selectedUsers.length > 1 ? "s" : ""
                                  }`
                                : "Add Members"}
                            </span>
                          </>
                        )}
                      </Button>

                      {selectedUsers.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedUsers([])}
                          className="w-full sm:w-auto"
                          aria-label="Clear selected members"
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 w-full">
                <div className="relative flex-1 min-w-[240px]">
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
                <div className="relative w-full sm:w-[220px] sm:ml-auto">
                  <select
                    aria-label="Filter by role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="appearance-none w-full h-10 border rounded-md px-3 pr-8 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  >
                    <option value="all">All roles</option>
                    <option value="developer">Developers</option>
                    <option value="tester">Testers</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-600" />
                  Administrators
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                    {filteredAdmins.length}
                  </span>
                </h3>

                {filteredAdmins.length === 0 && (
                  <p className="text-muted-foreground text-xs sm:text-sm italic">
                    {searchQuery
                      ? "No administrators match your search."
                      : "No administrators assigned."}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mt-3">
                  {filteredAdmins.map((admin) => (
                    <MemberCard key={admin.id} member={admin} isAdmin={true} />
                  ))}
                </div>
              </div>

              <div>
                {filteredMembers.length === 0 && (
                  <p className="text-muted-foreground text-xs sm:text-sm italic">
                    {searchQuery
                      ? "No members match your search."
                      : "No members assigned to this project yet."}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mt-3">
                  {filteredMembers.map((member) => (
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
