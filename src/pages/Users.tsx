import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { UserDetailDialog } from "@/components/users/UserDetailDialog";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { userService } from "@/services/userService";
import { User, UserRole } from "@/types";
import { Bug, Code2, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Enhanced User Card Skeleton component for loading state
const UserCardSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border rounded-lg gap-4 hover:shadow-md transition-all duration-200 w-full">
    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 sm:h-6 w-3/4 sm:w-1/2 mb-2" />
        <div className="flex flex-col sm:flex-row text-sm sm:space-x-2">
          <Skeleton className="h-4 w-1/2 mb-1 sm:mb-0" />
          <span className="hidden sm:inline text-transparent">•</span>
          <Skeleton className="h-4 w-2/3 sm:w-1/2" />
        </div>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
      <Skeleton className="h-8 sm:h-10 w-full sm:w-28 rounded-full" />
    </div>
  </div>
);

interface NewUser {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

const Users = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "admins";

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${ENV.API_URL}/users/get.php`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      if (data.success) {
        setUsers(
          data.data.map((user: any) => ({
            ...user,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.username
            )}&background=3b82f6&color=fff`,
          }))
        );
      } else {
        throw new Error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      // console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
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
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tabFromUrl]);

  // Apply all filters (search and role)
  const applyFilters = () => {
    if (users.length === 0) {
      setFilteredUsers([]);
      return;
    }

    let filtered = users;

    // Filter by search query
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role for admin tabs
    if (tabFromUrl === "developers") {
      filtered = filtered.filter(user => user.role === "developer");
    } else if (tabFromUrl === "testers") {
      filtered = filtered.filter(user => user.role === "tester");
    } else if (tabFromUrl === "admins") {
      filtered = filtered.filter(user => user.role === "admin");
    }

    setFilteredUsers(filtered);
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
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

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      await userService.updateUser(updatedUser.id, updatedUser);
      setUsers(
        users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      // Update selectedUser if it's the same user being updated
      if (selectedUser && selectedUser.id === updatedUser.id) {
        setSelectedUser(updatedUser);
      }
      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, force = false) => {
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

  const totalFiltered = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  // Only admin should access this page
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">
          Only administrators can access the user management page.
        </p>
      </div>
    );
  }

  return (
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
                Manage your team members and their access levels
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

      {/* Professional Tabs */}
      <Tabs
        value={tabFromUrl}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
          <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent p-1">
            {/* Admins tab with Shield icon and blue styling */}
<TabsTrigger
  value="admins"
  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
>
  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
  <span className="hidden sm:inline">Admins</span>
  <span className="sm:hidden">Admins</span>
  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
    {users.filter(u => u.role === "admin").length}
  </span>
</TabsTrigger>
              <TabsTrigger
                value="developers"
                className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
              >
                <Code2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Developers</span>
                <span className="sm:hidden">Devs</span>
                <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                  {users.filter(u => u.role === "developer").length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="testers"
                className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
              >
                <Bug className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">Testers</span>
                <span className="sm:hidden">Testers</span>
                <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-bold">
                  {users.filter(u => u.role === "tester").length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="developers" className="space-y-6 sm:space-y-8">
          {renderUsersContent()}
        </TabsContent>
        <TabsContent value="testers" className="space-y-6 sm:space-y-8">
          {renderUsersContent()}
        </TabsContent>
        <TabsContent value="admins" className="space-y-6 sm:space-y-8">
          {renderUsersContent()}
        </TabsContent>
      </Tabs>
    </section>
  </main>
  );

  function renderUsersContent() {
    return (
      <>
        {/* Professional Search and Filter Controls */}
        {!isLoading && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <UserRound className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search Users</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  placeholder="Search users by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Professional Responsive Pagination Controls - Only show if there are multiple pages */}
        {!isLoading && totalFiltered > 0 && totalPages > 1 && (
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
                users
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
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
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
                    currentPage === 1
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background/80 hover:bg-background/90"
                  }`}
                >
                  1
                </button>

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
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg ${
                        currentPage === page
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background/80 hover:bg-background/90"
                      }`}
                    >
                      {page}
                    </button>
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
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`h-10 w-10 p-0 hidden md:flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg ${
                      currentPage === totalPages
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
                disabled={currentPage === totalPages}
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

        {/* User list */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            {/* Enhanced Desktop Table View */}
            <div className="hidden xl:block w-full overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                  <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                    <TableHead className="w-[30%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Username
                    </TableHead>
                    <TableHead className="w-[40%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Email
                    </TableHead>
                    <TableHead className="w-[20%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Phone
                    </TableHead>
                    <TableHead className="w-[10%] pr-4 text-right font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <TableRow key={index} className="animate-pulse">
                            <TableCell className="w-[30%] px-4">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-5 w-3/4" />
                              </div>
                            </TableCell>
                            <TableCell className="w-[40%] px-4">
                              <Skeleton className="h-5 w-5/6" />
                            </TableCell>
                            <TableCell className="w-[20%] px-4">
                              <Skeleton className="h-5 w-2/3" />
                            </TableCell>
                            <TableCell className="w-[10%] pr-4 text-right">
                              <Skeleton className="h-9 w-20 ml-auto rounded-md" />
                            </TableCell>
                          </TableRow>
                        ))
                    : paginatedUsers.map((user, index) => (
                        <TableRow
                          key={user.id}
                          className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-emerald-50/50 dark:hover:from-blue-900/20 dark:hover:to-emerald-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50 ${
                            index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
                          }`}
                        >
                          <TableCell className="w-[30%] px-4 font-semibold text-sm sm:text-base text-gray-900 dark:text-white py-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {user.username}
                            </div>
                          </TableCell>
                          <TableCell className="w-[40%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                            {user.email}
                          </TableCell>
                          <TableCell className="w-[20%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                            {user.phone || "BugRicer"}
                          </TableCell>
                          <TableCell className="w-[10%] pr-4 text-right py-4">
                            <button
                              className="h-9 sm:h-10 px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 font-semibold shadow-sm hover:shadow-md"
                              onClick={() => setSelectedUser(user)}
                            >
                              View
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
            {/* Enhanced Mobile & Tablet Card View */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:hidden gap-4 w-full p-6">
            {isLoading
              ? Array(5)
                  .fill(0)
                  .map((_, index) => <UserCardSkeleton key={index} />)
              : paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 flex flex-col gap-3 w-full"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-emerald-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={user.avatar}
                        alt={`${user.username}'s avatar`}
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm sm:text-base">
                          {user.username}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {getRoleIcon(user.role)}
                      <span className="capitalize text-sm sm:text-base">
                        {user.role}
                      </span>
                    </div>
                    <button
                      className="w-full h-11 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 shadow-sm hover:shadow-md"
                      onClick={() => setSelectedUser(user)}
                    >
                      View
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          onUserUpdate={handleUpdateUser}
          onUserDelete={handleDeleteUser}
          onPasswordChange={async (userId: string, newPassword: string) => {
            // You may want to implement this or pass a real handler
            // For now, just show a toast or do nothing
            toast({
              title: "Password Change",
              description: "Password change handler not implemented.",
              variant: "destructive",
            });
          }}
          loggedInUserRole={currentUser.role}
        />
        )}
      </>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
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
                  Manage your team members and their access levels
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
                        {filteredUsers.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Tabs */}
        <Tabs
          value={tabFromUrl}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="developers"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Code2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Developers</span>
                  <span className="sm:hidden">Devs</span>
                  <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                    {users.filter(u => u.role === "developer").length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="testers"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Bug className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Testers</span>
                  <span className="sm:hidden">Testers</span>
                  <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-bold">
                    {users.filter(u => u.role === "tester").length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="admins"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Admins</span>
                  <span className="sm:hidden">Admins</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                    {users.filter(u => u.role === "admin").length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="developers" className="space-y-6 sm:space-y-8">
            {renderUsersContent()}
          </TabsContent>
          <TabsContent value="testers" className="space-y-6 sm:space-y-8">
            {renderUsersContent()}
          </TabsContent>
          <TabsContent value="admins" className="space-y-6 sm:space-y-8">
            {renderUsersContent()}
          </TabsContent>
        </Tabs>
      </section>

      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          onUserUpdate={handleUpdateUser}
          onUserDelete={handleDeleteUser}
          onPasswordChange={async (userId: string, newPassword: string) => {
            // You may want to implement this or pass a real handler
            // For now, just show a toast or do nothing
            toast({
              title: "Password Change",
              description: "Password change handler not implemented.",
              variant: "destructive",
            });
          }}
          loggedInUserRole={currentUser.role}
        />
      )}
    </main>
  );
};

export default Users;
