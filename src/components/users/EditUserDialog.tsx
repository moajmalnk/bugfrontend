import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { userService } from "@/services/userService";
import { permissionService } from "@/services/permissionService";
import { User, UserRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define the form schema
const userFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores",
    }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
  phone: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type EditUserDialogProps = {
  user: User;
  onUserUpdate: (user: User) => void;
  trigger?: React.ReactNode;
  loggedInUserRole: string;
};

export function EditUserDialog({
  user,
  onUserUpdate,
  trigger,
  loggedInUserRole,
}: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [formData, setFormData] = useState({
    ...user,
  });

  // Load roles on mount
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await permissionService.getRoles();
        setRoles(data);
      } catch (error) {
        console.error("Failed to load roles:", error);
        // Fallback to default roles
        const fallbackRoles = [
          { id: 1, role_name: "Admin" },
          { id: 2, role_name: "Developer" },
          { id: 3, role_name: "Tester" },
        ];
        setRoles(fallbackRoles);
      }
    };
    loadRoles();
  }, []);

  // Initialize the form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user.username || "",
      email: user.email,
      role: user.role || "tester",
      phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
    },
  });

  // Update form values when user prop changes
  useEffect(() => {
    form.reset({
      username: user.username || "",
      email: user.email,
      role: user.role || "tester",
      phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
    });
  }, [user, form]);

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      // Find the selected role to get role_id
      const selectedRole = roles.find(
        (r) => r.role_name.toLowerCase() === data.role.toLowerCase()
      );

      // Call the update service and get the updated user from backend
      const updatedUser = await userService.updateUser(user.id, {
        username: data.username,
        email: data.email,
        role: data.role as UserRole,
        role_id: selectedRole?.id,
        phone: data.phone ? "+91" + data.phone : "",
      });

      // Use the updated user from backend response, ensuring all fields are properly set
      const updatedRole = (updatedUser.role || data.role) as UserRole;
      const finalUpdatedUser: User = {
        ...user, // Start with current user data to preserve any fields not returned
        ...updatedUser, // Override with backend response (includes role, role_id, etc.)
        username: updatedUser.username || data.username,
        email: updatedUser.email || data.email,
        role: updatedRole,
        phone: updatedUser.phone || (data.phone ? "+91" + data.phone : ""),
        name: updatedUser.name || updatedUser.username || data.username,
        // Generate avatar based on updated role
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          updatedUser.name || updatedUser.username || data.username
        )}&background=${
          updatedRole === 'admin' ? '3b82f6' :
          updatedRole === 'developer' ? '10b981' :
          updatedRole === 'tester' ? 'f59e0b' : '6b7280'
        }&color=fff&size=128`,
      };

      // Call the onUserUpdate callback with the updated user from backend
      onUserUpdate(finalUpdatedUser);

      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
      setOpen(false);
    } catch (error: any) {
      // console.error("Error updating user:", error);
      let errorMessage = "Failed to update the user. Please try again.";
      if (
        error.message &&
        (error.message.includes("Username already taken") ||
          error.message.includes("Email already in use"))
      ) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Make changes to the user's information below.
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-4"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loggedInUserRole !== "admin"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="z-[70]">
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.role_name.toLowerCase()}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-2 border border-input rounded-l-md text-sm bg-input"
                        style={{ borderRight: 0 }}
                      >
                        +91
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={
                          field.value ? field.value.replace(/^\+91/, "") : ""
                        }
                        onChange={(e) => {
                          // Only allow 10 digits
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          field.onChange(val);
                        }}
                        className="h-9 text-sm flex-1 border border-input rounded-r-md px-3 bg-input text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ borderLeft: 0 }}
                        maxLength={10}
                        pattern="\d{10}"
                        inputMode="numeric"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
