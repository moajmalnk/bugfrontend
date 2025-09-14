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
import { User } from "@/types";
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
  role: z.enum(["admin", "developer", "tester"], {
    required_error: "Please select a role",
  }),
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
      phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
    },
  });

  // Update form values when user prop changes
  useEffect(() => {
    form.reset({
      username: user.username || "",
      email: user.email,
      role: user.role,
      phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
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
        phone: data.phone ? "+91" + data.phone : "",
      });

      // Manually create updated user object from form data
      const locallyUpdatedUser = {
        ...user, // Start with current user data
        username: data.username, // Apply updated values
        email: data.email,
        role: data.role,
        phone: data.phone ? "+91" + data.phone : "",
        // Note: The 'name' property is often derived from 'username' or handled server-side.
        // Ensure your backend returns the updated 'name' in the response if necessary,
        // or handle its derivation client-side if possible.
        // For now, we assume username update is sufficient for avatar.
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          data.username || data.email
        )}&background=3b82f6&color=fff&size=128`,
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
