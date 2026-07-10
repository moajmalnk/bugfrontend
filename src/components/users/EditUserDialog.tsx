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
import { DatePicker } from "@/components/ui/DatePicker";
import { userService } from "@/services/userService";
import { permissionService } from "@/services/permissionService";
import { User, UserRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";

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
  joining_date: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Joining date must be YYYY-MM-DD",
    }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type EditUserDialogProps = {
  user: User;
  onUserUpdate: (user: User) => void;
  trigger?: React.ReactNode;
  loggedInUserRole: string;
};

const fieldInputClass =
  "h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl shadow-sm";

function FormLabelDot({
  children,
  color = "bg-blue-500",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
      <span className={cn("h-2 w-2 rounded-full shrink-0", color)} />
      {children}
    </FormLabel>
  );
}

function PhoneInput({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-11 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <span className="flex items-center px-3 text-sm font-medium text-muted-foreground border-r border-gray-200 dark:border-gray-700 bg-muted/30 shrink-0">
        +91
      </span>
      <input
        type="tel"
        placeholder="Enter 10-digit number"
        value={value ? value.replace(/^\+91/, "") : ""}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
          onChange(val);
        }}
        className="flex-1 min-w-0 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        maxLength={10}
        pattern="\d{10}"
        inputMode="numeric"
      />
    </div>
  );
}

export function EditUserDialog({
  user,
  onUserUpdate,
  trigger,
  loggedInUserRole,
}: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await permissionService.getRoles();
        setRoles(data);
      } catch (error) {
        console.error("Failed to load roles:", error);
        setRoles([
          { id: 1, role_name: "Admin" },
          { id: 2, role_name: "Developer" },
          { id: 3, role_name: "Tester" },
        ]);
      }
    };
    loadRoles();
  }, []);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user.username || "",
      email: user.email,
      role: user.role || "tester",
      phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
      joining_date: user.joining_date || "",
    },
  });

  useEffect(() => {
    form.reset({
      username: user.username || "",
      email: user.email,
      role: user.role || "tester",
      phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
      joining_date: user.joining_date || "",
    });
  }, [user, form]);

  const isAdminEditor = String(loggedInUserRole || "").toLowerCase() === "admin";

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const selectedRole = roles.find(
        (r) => r.role_name.toLowerCase() === data.role.toLowerCase()
      );

      const payload: Parameters<typeof userService.updateUser>[1] = {
        username: data.username,
        email: data.email,
        role: data.role as UserRole,
        role_id: selectedRole?.id,
        phone: data.phone ? "+91" + data.phone : "",
      };
      if (isAdminEditor) {
        payload.joining_date = data.joining_date?.trim() || null;
      }

      const updatedUser = await userService.updateUser(user.id, payload);

      const updatedRole = (updatedUser.role || data.role) as UserRole;
      const finalUpdatedUser: User = {
        ...user,
        ...updatedUser,
        username: updatedUser.username || data.username,
        email: updatedUser.email || data.email,
        role: updatedRole,
        phone: updatedUser.phone || (data.phone ? "+91" + data.phone : ""),
        name: updatedUser.name || updatedUser.username || data.username,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          updatedUser.name || updatedUser.username || data.username
        )}&background=${
          updatedRole === "admin"
            ? "3b82f6"
            : updatedRole === "developer"
              ? "10b981"
              : updatedRole === "tester"
                ? "f59e0b"
                : "6b7280"
        }&color=fff&size=128`,
      };

      onUserUpdate(finalUpdatedUser);

      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
      setOpen(false);
    } catch (error: unknown) {
      let errorMessage = "Failed to update the user. Please try again.";
      if (
        error instanceof Error &&
        (error.message.includes("Username already taken") ||
          error.message.includes("Email already in use"))
      ) {
        errorMessage = error.message;
      } else if (error instanceof Error && error.message) {
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
      <DialogContent className="w-[min(96vw,520px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <Pencil className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Edit User
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update account details for {user.username || user.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[min(70vh,480px)] overflow-y-auto px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabelDot>Username</FormLabelDot>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} className={fieldInputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabelDot color="bg-indigo-500">Email</FormLabelDot>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                        className={fieldInputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabelDot color="bg-emerald-500">Role</FormLabelDot>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loggedInUserRole !== "admin"}
                    >
                      <FormControl>
                        <SelectTrigger className={fieldInputClass}>
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
                  <FormItem className="space-y-2">
                    <FormLabelDot color="bg-orange-500">Phone</FormLabelDot>
                    <FormControl>
                      <PhoneInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdminEditor ? (
                <FormField
                  control={form.control}
                  name="joining_date"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabelDot color="bg-teal-500">Joining date</FormLabelDot>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Pick joining date"
                          className={fieldInputClass}
                          disableFuture
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="h-11 px-6 border-gray-200 dark:border-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
