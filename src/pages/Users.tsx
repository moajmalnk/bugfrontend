import { ItemsPerPageSelect } from "@/components/pagination/ItemsPerPageSelect";
import { Card, CardContent } from "@/components/ui/card";
import { BottomSheetTabs } from "@/components/ui/BottomSheetTabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { ActiveTodayWorkSummary } from "@/components/users/ActiveTodayWorkSummary";
import { UserAnalytics } from "@/components/users/UserAnalytics";
import { UserWorkStats } from "@/components/users/UserWorkStats";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { UndoDeleteNotificationPortal } from "@/components/ui/UndoDeleteNotification";
import { ENV } from "@/lib/env";
import { getEffectiveRole } from "@/lib/utils";
import { userService } from "@/services/userService";
import { User, UserRole } from "@/types";
import { BarChart3, Bug, Code2, Shield, UserCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  useUrlPagination,
  useClampUrlPage,
  useResetUrlPageOnChange,
  listReturnState,
} from "@/hooks/useUrlPagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

const parseCheckInToMinutes = (value?: string | null): number | null => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  // Handles "HH:mm:ss" or "HH:mm"
  const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const h = Number(timeMatch[1]);
    const m = Number(timeMatch[2]);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  }

  const dt = new Date(text);
  if (!Number.isNaN(dt.getTime())) {
    return dt.getHours() * 60 + dt.getMinutes();
  }
  return null;
};

const compareEarlyCheckInFirst = (a: User, b: User): number => {
  const aMinutes = parseCheckInToMinutes(a.check_in_time);
  const bMinutes = parseCheckInToMinutes(b.check_in_time);
  const aHas = a.checked_in_today && aMinutes !== null;
  const bHas = b.checked_in_today && bMinutes !== null;

  // Checked-in users first
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;

  // Earlier check-in time first
  if (aHas && bHas && aMinutes !== bMinutes) {
    return (aMinutes as number) - (bMinutes as number);
  }

  // Stable fallback by username
  return String(a.username || "").localeCompare(String(b.username || ""), undefined, {
    sensitivity: "base",
  });
};

// Enhanced Status Badge Component with professional tooltips
const StatusBadge = ({ status, lastSeen }: { status: string; lastSeen?: string }) => {
  const config = {
    active: { 
      color: 'bg-green-500', 
      text: 'Active', 
      icon: '●',
      tooltip: 'User is currently online and active',
      description: 'Actively using the system right now'
    },
    idle: { 
      color: 'bg-yellow-500', 
      text: 'Idle', 
      icon: '●',
      tooltip: 'User is online but inactive',
      description: 'Away from keyboard or inactive for a while'
    },
    offline: { 
      color: 'bg-gray-400', 
      text: 'Offline', 
      icon: '●',
      tooltip: 'User is currently offline',
      description: lastSeen ? `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}` : 'Last seen a while ago'
    }
  };
  
  const { color, text, icon, tooltip, description } = config[status as keyof typeof config] || config.offline;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color} text-white cursor-help transition-all duration-200 hover:scale-105 hover:shadow-md ${status === 'active' ? 'animate-pulse' : ''}`}>
          <span className={status === 'active' ? 'animate-pulse' : ''}>{icon}</span>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs z-50">
        <div className="space-y-1">
          <div className="font-medium text-sm">{tooltip}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Enhanced User Card Skeleton component for loading state
const UserCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm p-4 sm:p-5 flex flex-col gap-4 w-full">
    {/* User Header Skeleton */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>

    {/* Work Stats Skeleton */}
    <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-12 rounded-md" />
        <Skeleton className="h-6 w-12 rounded-md" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>

    {/* Contact Info Skeleton */}
    <div className="space-y-1">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>

    {/* Action Button Skeleton */}
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
);

interface NewUser {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  joining_date?: string;
}

const Users = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions(null);
  const effectiveRole = getEffectiveRole(currentUser || {});
  const navigate = useNavigate();
  const location = useLocation();
  const listFromState = listReturnState(location.pathname, location.search);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // User detail is now a dedicated page route; no modal state here.
  const [searchTerm, setSearchTerm] = useState("");
  const {
    page: currentPage,
    pageSize: itemsPerPage,
    setPage: setCurrentPage,
    setPageSize: setItemsPerPage,
    clampToTotalPages,
  } = useUrlPagination({ defaultPageSize: 10 });
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "active";
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Undo delete hook
  const undoDelete = useUndoDelete({
    duration: 10,
    onConfirm: async () => {
      if (userToDelete) {
        try {
          await performActualDelete(userToDelete.id, false);
          setUserToDelete(null);
        } catch (error: any) {
          // If deletion fails due to dependencies, show error and keep user in state
          if (
            error.message?.includes("associated data") ||
            error.message?.includes("Cannot delete user")
          ) {
            toast({
              title: "Cannot Delete User",
              description: error.message || "This user has associated data that must be removed first.",
              variant: "destructive",
              duration: 5000,
            });
            // Reset the undo state since deletion failed
            undoDelete.cancelCountdown();
            setUserToDelete(null);
          } else {
            // Other errors
            toast({
              title: "Deletion Failed",
              description: error.message || "Failed to delete user. Please try again.",
              variant: "destructive",
            });
            undoDelete.cancelCountdown();
        setUserToDelete(null);
          }
        }
      }
    },
    onUndo: () => {
      setUserToDelete(null);
      toast({
        title: "Deletion Cancelled",
        description: "User deletion has been cancelled.",
      });
    },
  });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Please log in to view users.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const response = await fetch(`${ENV.API_URL}/users/get.php`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || `Request failed (${response.status})`);
      }
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || "Invalid response from server");
      }
      setUsers(
        data.data.map((user: any) => ({
          ...user,
          checked_in_today: Boolean(user.checked_in_today),
          check_in_time: user.check_in_time || null,
          today_hours_worked: Number(user.today_hours_worked || 0),
          today_break_minutes: Number(user.today_break_minutes || 0),
          checkout_time: user.checkout_time || null,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.username || user.name || "?"
          )}&background=3b82f6&color=fff`,
        }))
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load users. Please try again.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filtering whenever search term or tab changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, users, tabFromUrl]);

  // Reset current page when filters change
  useResetUrlPageOnChange(setCurrentPage, [searchTerm, tabFromUrl]);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
  };

  // Apply all filters (search and role)
  const applyFilters = () => {
    if (users.length === 0) {
      setFilteredUsers([]);
      return;
    }

    let filtered = users;

    // Filter by search query
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Role tabs apply only when not searching (search spans all users)
    if (!query && tabFromUrl !== "analytics") {
      if (tabFromUrl === "active") {
        filtered = filtered.filter((user) => user.checked_in_today);
      } else if (tabFromUrl === "developers") {
        filtered = filtered.filter(user => user.role === "developer");
      } else if (tabFromUrl === "testers") {
        filtered = filtered.filter(user => user.role === "tester");
      } else if (tabFromUrl === "admins") {
        filtered = filtered.filter(user => user.role === "admin");
      } else if (tabFromUrl === "others") {
        // Show users with custom roles (role_id not 1, 2, or 3)
        filtered = filtered.filter(user => {
          const hasCustomRole = user.role_id && ![1, 2, 3].includes(user.role_id);
          return hasCustomRole;
        });
      }
    }

    // Requirement: show earliest check-in users first.
    setFilteredUsers([...filtered].sort(compareEarlyCheckInFirst));
  };

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    if (params.get("tab") === tab && !params.has("page")) {
      return;
    }
    params.set("tab", tab);
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />;
      case "developer":
        return <Code2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />;
      case "tester":
        return <Bug className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />;
      default:
        return null;
    }
  };

  const handleAddUser = async (userData: NewUser): Promise<boolean> => {
    try {
      const payload = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        phone: userData.phone,
        joining_date: userData.joining_date || undefined,
      };
      const result = await userService.addUser(payload);
      toast({
        title: "Success",
        description: result.message,
      });
      fetchUsers(); // Refresh user list after adding
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add user.",
        variant: "destructive",
      });
      return false;
    }
  };

  /** Merge user into list after EditUserDialog already persisted via API */
  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
    );
    // User detail is now a dedicated page; keep list state only.
  };

  const performActualDelete = async (userId: string, force = false) => {
    try {
      const url = `${ENV.API_URL}/users/delete.php?id=${userId}${
        force ? "&force=true" : ""
      }`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          // Conflict - user has dependencies, throw error for dialog to handle
          throw new Error(
            data.message ||
              "User has associated data that must be removed first."
          );
        } else if (response.status === 404) {
          toast({
            title: "User Not Found",
            description: "The user you're trying to delete no longer exists.",
            variant: "destructive",
          });
          return;
        } else {
          throw new Error(data.message || "Failed to delete user");
        }
      }

      if (data.success) {
        setUsers(users.filter((user) => user.id !== userId));
        toast({
          title: "Success",
          description: data.message || "User has been deleted successfully.",
        });
      } else {
        throw new Error(data.message || "Failed to delete user");
      }
    } catch (error: any) {
      // Don't show toast for dependency errors - let the dialog handle them
      if (
        !error.message.includes("associated data") &&
        !error.message.includes("Cannot delete user")
      ) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description:
            error.message || "Failed to delete user. Please try again.",
          variant: "destructive",
        });
      } else {
        // Re-throw dependency errors for dialog to handle
        throw error;
      }
    }
  };

  const handleDeleteUser = async (userId: string, force = false) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setUserToDelete(user);
    undoDelete.startCountdown();
  };

  // Calculate user counts for each role
  const adminCount = users.filter(u => u.role === "admin").length;
  const developerCount = users.filter(u => u.role === "developer").length;
  const testerCount = users.filter(u => u.role === "tester").length;
  const othersCount = users.filter(u => u.role_id && ![1, 2, 3].includes(u.role_id)).length;
  const activeTodayCount = users.filter((u) => u.checked_in_today).length;

  // Always keep role tabs mounted (even at 0) so URL tab + Radix Tabs don't
  // snap back to "active" while users are still loading after Back.
  const knownTabs = ["active", "admins", "developers", "testers", "others", "analytics"] as const;
  const isKnownTab = (knownTabs as readonly string[]).includes(tabFromUrl);
  const isValidTab =
    tabFromUrl === "active" ||
    tabFromUrl === "analytics" ||
    tabFromUrl === "admins" ||
    tabFromUrl === "developers" ||
    tabFromUrl === "testers" ||
    (tabFromUrl === "others" && (isLoading || othersCount > 0));
  const defaultTab = "active";
  const activeTab = isValidTab ? tabFromUrl : defaultTab;

  const roleTabs = [
    {
      value: "active",
      label: "Active",
      shortLabel: "Active",
      icon: UserCheck,
      count: activeTodayCount,
      countClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    },
    {
      value: "admins",
      label: "Admins",
      shortLabel: "Admins",
      icon: Shield,
      count: adminCount,
      countClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    },
    {
      value: "developers",
      label: "Developers",
      shortLabel: "Devs",
      icon: Code2,
      count: developerCount,
      countClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    },
    {
      value: "testers",
      label: "Testers",
      shortLabel: "Testers",
      icon: Bug,
      count: testerCount,
      countClass: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    },
    ...(othersCount > 0 || tabFromUrl === "others"
      ? [{
          value: "others",
          label: "Others",
          shortLabel: "Others",
          icon: UserRound,
          count: othersCount,
          countClass: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
        }]
      : []),
    {
      value: "analytics",
      label: "Analytics",
      shortLabel: "Stats",
      icon: BarChart3,
      count: adminCount + developerCount + testerCount,
      countClass: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
    },
  ];
  // Only rewrite an unknown tab after data is ready — never wipe developers/page on load
  useEffect(() => {
    if (isLoading) return;
    if (!isValidTab && !isKnownTab && tabFromUrl !== defaultTab) {
      const params = new URLSearchParams(searchParams);
      params.set("tab", defaultTab);
      params.delete("page");
      if (params.toString() === searchParams.toString()) return;
      setSearchParams(params, { replace: true });
    }
  }, [
    isLoading,
    isValidTab,
    isKnownTab,
    defaultTab,
    tabFromUrl,
    searchParams,
    setSearchParams,
  ]);

  const totalFiltered = filteredUsers.length;
  const totalPages =
    totalFiltered > 0 ? Math.max(1, Math.ceil(totalFiltered / itemsPerPage)) : 1;
  useClampUrlPage(clampToTotalPages, totalPages);
  const activePage =
    totalFiltered > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;
  const paginatedUsers = filteredUsers.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  // Check for USERS_VIEW permission OR admin role
  if (isLoadingPermissions) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        <p className="text-muted-foreground">
          Verifying your access permissions...
        </p>
      </div>
    );
  }

  // Only admins can access Users page
  if (effectiveRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">
          Only administrators can access the user management page.
        </p>
      </div>
    );
  }

  if (!hasPermission('USERS_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access the user management page.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Professional Header (matches Bugs/Fixes style) */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                  <UserRound className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                    Users
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                Manage team members and their roles
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="shrink-0 group">
                <AddUserDialog onUserAdd={handleAddUser} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-600 rounded-lg">
                    <UserRound className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {users.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — full row on xl+; bottom sheet on tablet/mobile (sidebar layouts) */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <BottomSheetTabs
          items={roleTabs.map((tab) => ({
            value: tab.value,
            label: tab.label,
            shortLabel: tab.shortLabel,
            icon: tab.icon,
            count: tab.count,
            countClassName: tab.countClass,
          }))}
          value={activeTab}
          onValueChange={handleTabChange}
          title="Select Section"
          description="Navigate between active check-ins and user roles"
          desktopBreakpoint="xl"
        />

        {/* Keep all tab panels mounted so Back to ?tab=developers does not reset */}
        <TabsContent value="active" className="space-y-6 sm:space-y-8">
          {renderUsersContent()}
        </TabsContent>
        <TabsContent value="developers" className="space-y-6 sm:space-y-8">
          {renderUsersContent()}
        </TabsContent>
        <TabsContent value="testers" className="space-y-6 sm:space-y-8">
          {renderUsersContent()}
        </TabsContent>
        <TabsContent value="admins" className="space-y-6 sm:space-y-8">
          {renderUsersContent()}
        </TabsContent>
        {(othersCount > 0 || tabFromUrl === "others") && (
          <TabsContent value="others" className="space-y-6 sm:space-y-8">
            {renderUsersContent()}
          </TabsContent>
        )}
        <TabsContent value="analytics" className="space-y-6 sm:space-y-8">
          <UserAnalytics rolePath={effectiveRole} />
        </TabsContent>
      </Tabs>
    </section>
  </main>
      <UndoDeleteNotificationPortal
        open={undoDelete.isCountingDown && !!userToDelete}
        title="User Deleted"
        itemName={userToDelete?.username ?? ""}
        timeLeft={undoDelete.timeLeft}
        duration={10}
        onUndo={undoDelete.cancelCountdown}
        onConfirmNow={undoDelete.confirmDelete}
      />
    </TooltipProvider>
  );

  function renderUserWorkSection(user: User) {
    if (activeTab === "active") {
      return (
        <ActiveTodayWorkSummary
          checkInTime={user.check_in_time}
          breakMinutes={user.today_break_minutes}
          hoursWorked={user.today_hours_worked}
          checkoutTime={user.checkout_time}
        />
      );
    }

    return <UserWorkStats userId={user.id} compact={true} />;
  }

  function renderUsersContent() {
    return (
      <>
        {/* Professional Search and Filter Controls */}
        {!isLoading && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 w-full">
              <div className="p-2 bg-blue-600 rounded-lg">
                <UserRound className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search Users</h3>
              {searchTerm.trim() ? (
                <span className="text-xs text-muted-foreground ml-auto">
                  Searching all roles
                </span>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search all users by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Professional Responsive Pagination Controls - Only show if there are multiple pages */}
        {!isLoading && totalFiltered > 0 && totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full min-w-0 overflow-x-hidden bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
          {/* Top Row - Results Info and Items Per Page */}
          <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
              <span className="text-sm sm:text-base text-foreground font-semibold">
                Showing{" "}
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {(activePage - 1) * itemsPerPage + 1}
                </span>
                -
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {Math.min(activePage * itemsPerPage, totalFiltered)}
                </span>{" "}
                of{" "}
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalFiltered}
                </span>{" "}
                users
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                Items per page:
              </span>
              <ItemsPerPageSelect
                id="items-per-page"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              />
            </div>
          </div>

          {/* Bottom Row - Pagination Navigation */}
          <div className="flex flex-col sm:flex-row md:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 sm:pt-0 md:pt-0 border-t border-border/30">
            {/* Page Info for Mobile */}
            <div className="sm:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
              Page{" "}
              <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {activePage}
              </span>{" "}
              of{" "}
              <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {totalPages}
              </span>
            </div>

            {/* Enhanced Pagination Controls */}
            <div className="flex items-center justify-center gap-2 w-full sm:w-auto md:w-auto">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg bg-background/80 hover:bg-background/90 disabled:cursor-not-allowed"
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
              </button>

              {/* Page Numbers - Responsive Display */}
              <div className="flex items-center justify-center gap-1.5">
                {/* Always show first page on larger screens */}
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg ${
                    activePage === 1
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background/80 hover:bg-background/90"
                  }`}
                >
                  1
                </button>

                {/* Show ellipsis if needed on larger screens */}
                {activePage > 4 && (
                  <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                    •••
                  </span>
                )}

                {/* Dynamic page numbers based on current page - show more on larger screens */}
                {(() => {
                  const pages = [];
                  const start = Math.max(2, activePage - 1);
                  const end = Math.min(totalPages - 1, activePage + 1);

                  for (let i = start; i <= end; i++) {
                    if (i > 1 && i < totalPages) {
                      pages.push(i);
                    }
                  }

                  return pages.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg ${
                        activePage === page
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background/80 hover:bg-background/90"
                      }`}
                    >
                      {page}
                    </button>
                  ));
                })()}

                {/* Show ellipsis if needed on larger screens */}
                {activePage < totalPages - 3 && (
                  <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                    •••
                  </span>
                )}

                {/* Always show last page if more than 1 page on larger screens */}
                {totalPages > 1 && (
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg ${
                      activePage === totalPages
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background/80 hover:bg-background/90"
                    }`}
                  >
                    {totalPages}
                  </button>
                )}

                {/* Mobile-friendly page selector */}
                <div className="md:hidden flex items-center gap-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 transition-all duration-200">
                  <select
                    value={activePage}
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
                    <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      {totalPages}
                    </span>
                  </span>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={activePage === totalPages}
                className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg bg-background/80 hover:bg-background/90 disabled:cursor-not-allowed"
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
              </button>
            </div>

            {/* Page Info for Desktop */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
              Page{" "}
              <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {activePage}
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
        {!isLoading && totalFiltered > 0 && totalPages <= 1 && (
        <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
            <span className="text-sm sm:text-base text-foreground font-semibold">
              Showing{" "}
              <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {totalFiltered}
              </span>{" "}
              users
            </span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-3">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Items per page:
            </span>
            <ItemsPerPageSelect
              id="items-per-page-simple"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            />
          </div>
        </div>
        )}

        {!isLoading && totalFiltered === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300/80 bg-gray-50/40 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/20">
            <UserCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {activeTab === "active" && !searchTerm.trim()
                ? "No team members have checked in for work today yet."
                : "No users match your current filters."}
            </p>
          </div>
        )}

        {/* User list */}
        {totalFiltered > 0 && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            {/* Enhanced Desktop Table View */}
            <div className="hidden 2xl:block w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:to-blue-900/80 backdrop-blur-sm">
                  <TableRow className="border-b border-gray-200/60 dark:border-gray-700/60 hover:bg-transparent">
                    <TableHead className="w-[20%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      User
                    </TableHead>
                    <TableHead className="w-[25%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Contact
                    </TableHead>
                    <TableHead className="w-[15%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Status
                    </TableHead>
                    <TableHead className="w-[20%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Work Stats
                    </TableHead>
                    <TableHead className="w-[20%] px-6 text-right font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <TableRow key={index} className="animate-pulse border-b border-gray-100/50 dark:border-gray-800/50">
                            <TableCell className="w-[20%] px-6 py-5">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-3 w-16" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="w-[25%] px-6 py-5">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                            </TableCell>
                            <TableCell className="w-[15%] px-6 py-5">
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </TableCell>
                            <TableCell className="w-[20%] px-6 py-5">
                              <div className="flex gap-2">
                                <Skeleton className="h-6 w-12 rounded-md" />
                                <Skeleton className="h-6 w-12 rounded-md" />
                              </div>
                            </TableCell>
                            <TableCell className="w-[20%] px-6 py-5 text-right">
                              <Skeleton className="h-9 w-20 ml-auto rounded-lg" />
                            </TableCell>
                          </TableRow>
                        ))
                    : paginatedUsers.map((user, index) => (
                        <TableRow
                          key={user.id}
                          className={`group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-emerald-50/30 dark:hover:from-blue-900/10 dark:hover:to-emerald-900/10 transition-all duration-200 border-b border-gray-100/50 dark:border-gray-800/50 ${
                            index % 2 === 0 ? 'bg-white/30 dark:bg-gray-900/30' : 'bg-gray-50/20 dark:bg-gray-800/20'
                          }`}
                        >
                          <TableCell className="w-[20%] px-6 py-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={user.avatar}
                                alt={`${user.username}'s avatar`}
                                className="h-10 w-10 rounded-full border-2 border-gray-200 dark:border-gray-700"
                              />
                              <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                  {user.username}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  ID: {user.id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[25%] px-6 py-5">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {user.email}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {user.phone || "No phone"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="w-[15%] px-6 py-5">
                            <StatusBadge status={user.status || 'offline'} lastSeen={user.last_active_at} />
                          </TableCell>
                          <TableCell className="w-[20%] px-6 py-5">
                            {renderUserWorkSection(user)}
                          </TableCell>
                          <TableCell className="w-[20%] px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="h-9 px-4 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                                onClick={() => navigate(`/${effectiveRole}/users/${user.id}`, { state: listFromState })}
                              >
                                View
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
            {/* Enhanced Mobile & Tablet Card View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:hidden gap-4 sm:gap-6 p-4 sm:p-6">
            {isLoading
              ? Array(6)
                  .fill(0)
                  .map((_, index) => <UserCardSkeleton key={index} />)
              : paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-200 p-4 sm:p-5 flex flex-col gap-4 w-full"
                  >
                    {/* User Header */}
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={`${user.username}'s avatar`}
                        className="h-12 w-12 rounded-full border-2 border-gray-200 dark:border-gray-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            {getRoleIcon(user.role)}
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                              {user.role}
                            </span>
                          </div>
                          <StatusBadge status={user.status || 'offline'} lastSeen={user.last_active_at} />
                        </div>
                      </div>
                    </div>

                    {/* Work Stats */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-3">
                      {renderUserWorkSection(user)}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Phone: {user.phone || "Not provided"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {user.id}
                      </p>
                    </div>

                    {/* Action Button */}
                    <button
                      className="w-full h-10 px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={() => navigate(`/${effectiveRole}/users/${user.id}`, { state: listFromState })}
                    >
                      View
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
        )}

        {/* User details now use route: /:role/users/:userId */}
      </>
    );
  }
};

export default Users;
