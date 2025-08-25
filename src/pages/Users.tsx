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
import { toast } from "@/components/ui/use-toast";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { UserDetailDialog } from "@/components/users/UserDetailDialog";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { userService } from "@/services/userService";
import { User, UserRole } from "@/types";
import { Bug, Code2, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

// Enhanced User Card Skeleton component for loading state
const UserCardSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border rounded-lg gap-4 hover:shadow-md transition-all duration-200">
    <div className="flex items-center gap-4 min-w-0">
      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 mb-2" />
        <div className="flex flex-col sm:flex-row text-sm sm:space-x-2">
          <Skeleton className="h-4 w-24 mb-1 sm:mb-0" />
          <span className="hidden sm:inline text-transparent">•</span>
          <Skeleton className="h-4 w-40 sm:w-48" />
        </div>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
      <Skeleton className="h-8 sm:h-10 w-24 sm:w-28 rounded-full" />
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Reset current page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 space-y-6 sm:space-y-8 max-w-7xl">
      {/* Enhanced Header row with title, description, add user button, and badge */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6">
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words">
            User Management
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mt-1 sm:mt-2 break-words max-w-xl">
            Manage your team members and their access levels
          </p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center md:items-center gap-3 w-full md:w-auto mt-2 sm:mt-0">
          <AddUserDialog onUserAdd={handleAddUser} />
          <div className="inline-flex items-center border rounded-lg px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ml-0 sm:ml-2">
            <UserRound className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
            <span className="text-sm sm:text-base font-medium text-blue-700 dark:text-blue-300">
              {filteredUsers.length}{" "}
              <span className="hidden lg:inline">Users</span>
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Controls */}
      {!isLoading && (
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm sm:text-base transition-all duration-200"
            />
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
            <div className="flex items-center justify-around gap-2 w-full sm:w-auto md:w-auto">
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
      <Card>
        <CardContent>
          {/* Enhanced Desktop Table View */}
          <div className="hidden lg:block w-full overflow-x-auto">
            <Table className="w-full min-w-[600px]">
              <TableHeader className="bg-muted/30">
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[200px] lg:w-[250px] font-semibold text-sm sm:text-base">
                    Username
                  </TableHead>
                  <TableHead className="font-semibold text-sm sm:text-base">
                    Email
                  </TableHead>
                  <TableHead className="font-semibold text-sm sm:text-base">
                    Phone
                  </TableHead>
                  <TableHead className="font-semibold text-sm sm:text-base">
                    Role
                  </TableHead>
                  <TableHead className="text-right font-semibold text-sm sm:text-base">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={5}>
                            <UserCardSkeleton />
                          </TableCell>
                        </TableRow>
                      ))
                  : paginatedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-muted/20 transition-colors duration-200"
                      >
                        <TableCell className="font-medium max-w-[200px] lg:max-w-[250px] truncate text-sm sm:text-base">
                          {user.username}
                        </TableCell>
                        <TableCell className="truncate text-sm sm:text-base">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-sm sm:text-base">
                          {user.phone || "BugRicer"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <span className="capitalize text-sm sm:text-base">
                              {user.role}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            className="px-3 py-2 rounded-lg border text-sm bg-background hover:bg-accent hover:border-primary/50 transition-all duration-200 h-9 sm:h-10"
                            onClick={() => setSelectedUser(user)}
                          >
                            View Details
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
          {/* Enhanced Mobile & Tablet Card View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 w-full lg:hidden">
            {isLoading
              ? Array(5)
                  .fill(0)
                  .map((_, index) => <UserCardSkeleton key={index} />)
              : paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col gap-3 w-full border border-border/50"
                  >
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
                      className="w-full px-3 py-2 rounded-lg border text-sm bg-background hover:bg-accent hover:border-primary/50 transition-all duration-200 h-10 sm:h-11"
                      onClick={() => setSelectedUser(user)}
                    >
                      View Details
                    </button>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default Users;
