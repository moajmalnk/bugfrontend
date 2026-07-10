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
  FormDescription,
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
import { UserRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { permissionService } from "@/services/permissionService";
import { cn } from "@/lib/utils";

const userFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores",
    }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  role: z.string().min(1, {
    message: "Please select a role",
  }),
  phone: z.string().optional(),
  joining_date: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Joining date must be YYYY-MM-DD",
    }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type AddUserDialogProps = {
  onUserAdd: (userData: UserFormValues) => Promise<boolean>;
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

export function AddUserDialog({ onUserAdd }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "",
      phone: "",
      joining_date: "",
    },
  });

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await permissionService.getRoles();
        setRoles(data);
        if (data.length > 0 && !form.getValues("role")) {
          form.setValue("role", data[data.length - 1].role_name.toLowerCase());
        }
      } catch (error) {
        console.error("Failed to load roles:", error);
        const fallbackRoles = [
          { id: 1, role_name: "Admin" },
          { id: 2, role_name: "Developer" },
          { id: 3, role_name: "Tester" },
        ];
        setRoles(fallbackRoles);
        if (!form.getValues("role")) {
          form.setValue("role", fallbackRoles[fallbackRoles.length - 1].role_name.toLowerCase());
        }
      }
    };
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddUser = async (userData: UserFormValues): Promise<boolean> => {
    try {
      const selectedRole = roles.find(
        (r) => r.role_name.toLowerCase() === userData.role.toLowerCase()
      );

      const payload = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        role_id: selectedRole?.id,
        phone: userData.phone && userData.phone.trim() ? "+91" + userData.phone.trim() : undefined,
        joining_date: userData.joining_date?.trim() || undefined,
      };
      return await onUserAdd(payload as UserFormValues);
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await handleAddUser(data);
      if (result) {
        form.reset();
        setOpen(false);
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset();
      setShowPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="h-11 sm:h-12 text-sm sm:text-base shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
          aria-label="Add a new user"
        >
          <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,520px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Add New User
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create a new user account. Fill in all required information below.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[min(70vh,520px)] overflow-y-auto px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabelDot>Username</FormLabelDot>
                    <FormControl>
                      <Input placeholder="Username" {...field} className={fieldInputClass} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Letters, numbers, and underscores only
                    </FormDescription>
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
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabelDot color="bg-violet-500">Password</FormLabelDot>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          {...field}
                          className={cn(fieldInputClass, "pr-11")}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((v) => !v)}
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">At least 6 characters</FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormDescription className="text-xs">
                      Attendance is blocked before this date (admins only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
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
                    Adding...
                  </>
                ) : (
                  "Add User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
