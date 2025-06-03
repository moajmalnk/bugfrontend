import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
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
  role: z.enum(["admin", "developer", "tester"], {
    required_error: "Please select a role",
  }),
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
  const [formData, setFormData] = useState({
    ...user,
  });

  // Initialize the form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user.username || "",
      email: user.email,
      role: user.role,
    },
  });

  // Update form values when user prop changes
  useEffect(() => {
    form.reset({
      username: user.username || "",
      email: user.email,
      role: user.role,
    });
  }, [user, form]);

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      // Call the update service
      await userService.updateUser(user.id, {
        username: data.username,
        email: data.email,
        role: data.role,
      });

      // Manually create updated user object from form data
      const locallyUpdatedUser = {
        ...user, // Start with current user data
        username: data.username, // Apply updated values
        email: data.email,
        role: data.role,
        // Note: The 'name' property is often derived from 'username' or handled server-side.
        // Ensure your backend returns the updated 'name' in the response if necessary,
        // or handle its derivation client-side if possible.
        // For now, we assume username update is sufficient for avatar.
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || data.email)}&background=3b82f6&color=fff&size=128`
      };

      // Call the onUserUpdate callback with the locally constructed updated user object
      onUserUpdate(locallyUpdatedUser);

      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
      setOpen(false);
      // window.location.reload(); // Commented out to prevent reload
    } catch (error: any) {
      // console.error("Error updating user:", error);
      let errorMessage = "Failed to update the user. Please try again.";
      if (error.message && (error.message.includes("Username already taken") || error.message.includes("Email already in use"))) {
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
                    disabled={loggedInUserRole !== 'admin'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="tester">Tester</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
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
