import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ENV } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

interface UserPhoneSelectorProps {
  onUserSelect: (user: User) => void;
  selectedUserId?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function UserPhoneSelector({
  onUserSelect,
  selectedUserId,
  placeholder = "Select a user...",
  className,
  disabled = false,
}: UserPhoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find((u) => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [selectedUserId, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${ENV.API_URL}/users/getAll.php`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      if (data.success) {
        // Filter users who have phone numbers
        const usersWithPhones = data.data.filter(
          (user: User) => user.phone && user.phone.trim() !== ""
        );

        if (usersWithPhones.length === 0) {
          console.warn("No users with phone numbers found");
        }

        setUsers(usersWithPhones);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setOpen(false);
    onUserSelect(user);
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove +91 prefix for display if present
    const cleanPhone = phone.replace(/^\+91/, "");
    return `+91 ${cleanPhone.substring(0, 5)} ${cleanPhone.substring(5)}`;
  };

  const formatUserName = (user: User) => {
    return `${user.name || user.username} (${user.role})`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedUser && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Loading users...</span>
            </div>
          ) : selectedUser ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="truncate">{formatUserName(selectedUser)}</span>
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatPhoneNumber(selectedUser.phone)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList className="max-h-60 custom-scrollbar">
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.username} ${user.phone} ${user.role}`}
                  onSelect={() => handleUserSelect(user)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatUserName(user)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{formatPhoneNumber(user.phone)}</span>
                      <span>•</span>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
