import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

// User Card Skeleton component for loading state
const UserCardSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
    <div className="flex items-center gap-4 min-w-0">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-32 mb-2" />
        <div className="flex flex-col sm:flex-row text-sm sm:space-x-2">
          <Skeleton className="h-4 w-24 mb-1 sm:mb-0" />
          <span className="hidden sm:inline text-transparent">•</span>
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
      <Skeleton className="h-8 w-24 rounded-full" />
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
        return <Shield className="h-5 w-5 text-blue-500" />;
      case "developer":
        return <Code2 className="h-5 w-5 text-green-500" />;
      case "tester":
        return <Bug className="h-5 w-5 text-yellow-500" />;
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
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6 max-w-7xl">
      {/* Header row with title, description, add user button, and badge */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1 break-words max-w-xl">
            Manage your team members and their access levels
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <AddUserDialog onUserAdd={handleAddUser} />
          <div className="inline-flex items-center border rounded-md px-3 py-2 bg-blue-50 ml-0 sm:ml-2">
            <UserRound className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-blue-700">
              {filteredUsers.length}{" "}
              <span className="hidden lg:inline">Users</span>
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      {!isLoading && (
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalFiltered > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 w-full bg-background rounded-lg shadow-sm p-3 border border-border">
          <div>
            <span className="text-sm text-muted-foreground font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalFiltered)} of{" "}
              {totalFiltered} users
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-border rounded-md px-3 py-2 text-sm w-full sm:w-auto bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Items per page"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={currentPage === i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    aria-disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      {/* User list */}
      <Card>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden lg:block w-full overflow-x-auto">
            <Table className="w-full min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={4}>
                            <UserCardSkeleton />
                          </TableCell>
                        </TableRow>
                      ))
                  : paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {user.username}
                        </TableCell>
                        <TableCell className="truncate">{user.email}</TableCell>
                        <TableCell>{user.phone || "BugRacer"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <span className="capitalize text-sm">
                              {user.role}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            className="px-3 py-1 rounded border text-sm bg-background hover:bg-accent transition-colors"
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
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 w-full lg:hidden">
            {isLoading
              ? Array(5)
                  .fill(0)
                  .map((_, index) => <UserCardSkeleton key={index} />)
              : paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg bg-card text-card-foreground shadow p-4 flex flex-col gap-2 w-full"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={user.avatar}
                        alt={`${user.username}'s avatar`}
                        className="h-10 w-10 rounded-full shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {getRoleIcon(user.role)}
                      <span className="capitalize text-sm">{user.role}</span>
                    </div>
                    <button
                      className="w-full px-3 py-2 rounded border text-sm bg-background hover:bg-accent transition-colors"
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
