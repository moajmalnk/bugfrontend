import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { UserDetailDialog } from "@/components/users/UserDetailDialog";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { userService } from "@/services/userService";
import { User, UserRole } from "@/types";
import { Bug, Code2, Shield } from "lucide-react";
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
}

const Users = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
      const url = `${ENV.API_URL}/users/delete.php?id=${userId}${force ? '&force=true' : ''}`;
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
          throw new Error(data.message || "User has associated data that must be removed first.");
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
      if (!error.message.includes("associated data") && !error.message.includes("Cannot delete user")) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete user. Please try again.",
          variant: "destructive",
        });
      } else {
        // Re-throw dependency errors for dialog to handle
        throw error;
      }
    }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight break-words">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1 break-words max-w-xl">
            Manage your team members and their access levels
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <AddUserDialog onUserAdd={handleAddUser} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="break-words">BugRacer Users</CardTitle>
          {isLoading ? (
            <Skeleton className="h-5 w-24 inline-block mt-1" />
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">
              Total users: {users.length}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-20rem)]">
            <div className="space-y-4">
              {isLoading
                ? // Show multiple skeleton cards while loading
                  Array(5)
                    .fill(0)
                    .map((_, index) => <UserCardSkeleton key={index} />)
                : users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4 cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={user.avatar}
                          alt={`${user.username}'s avatar`}
                          className="h-10 w-10 rounded-full shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {user.username}
                          </p>
                          <div className="flex flex-col sm:flex-row text-sm text-muted-foreground sm:space-x-2">
                            <p className="font-medium truncate">
                              @{user.username}
                            </p>
                            <span className="hidden sm:inline">•</span>
                            <p className="truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                        <div className="flex items-center bg-accent/50 px-3 py-1 rounded-full shrink-0">
                          {getRoleIcon(user.role)}
                          <span className="ml-2 text-sm capitalize">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </ScrollArea>
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
