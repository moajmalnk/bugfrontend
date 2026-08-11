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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { DatePicker } from "@/components/ui/DatePicker";
import { userService } from "@/services/userService";
import { permissionService } from "@/services/permissionService";
import { User, UserRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";

const optionalDate = z
  .string()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Date must be YYYY-MM-DD",
  });

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
  joining_date: optionalDate,
  employee_code: z.string().optional(),
  job_title: z.string().max(200).optional(),
  job_level: z.string().max(80).optional(),
  department: z.string().max(150).optional(),
  reports_to_user_id: z.string().optional(),
  contract_type: z.string().optional(),
  offer_letter_issued: z.boolean().optional(),
  offer_letter_shared_date: optionalDate,
  probation_end_date: optionalDate,
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

const CONTRACT_OPTIONS = [
  { value: "full_time", label: "Full-Time" },
  { value: "remote", label: "Remote" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "other", label: "Other" },
] as const;

const JOB_LEVEL_OPTIONS = [
  "Founder",
  "Head",
  "Senior",
  "Junior",
  "Intern",
  "Freelancer",
  "Contract",
] as const;

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

function toFormValues(user: User): UserFormValues {
  return {
    username: user.username || "",
    email: user.email,
    role: user.role || "tester",
    phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
    joining_date: user.joining_date || "",
    employee_code: user.employee_code || "",
    job_title: user.job_title || "",
    job_level: user.job_level || "",
    department: user.department || "",
    reports_to_user_id: user.reports_to_user_id || "",
    contract_type: user.contract_type || "",
    offer_letter_issued: Number(user.offer_letter_issued) === 1,
    offer_letter_shared_date: user.offer_letter_shared_date || "",
    probation_end_date: user.probation_end_date || "",
  };
}

export function EditUserDialog({
  user,
  onUserUpdate,
  trigger,
  loggedInUserRole,
}: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [managerOptions, setManagerOptions] = useState<User[]>([]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await permissionService.getRoles();
        setRoles(data);
      } catch {
        setRoles([
          { id: 1, role_name: "Admin" },
          { id: 2, role_name: "Developer" },
          { id: 3, role_name: "Tester" },
        ]);
      }
    };
    void loadRoles();
  }, []);

  useEffect(() => {
    if (!open) return;
    const loadManagers = async () => {
      try {
        const list = await userService.getUsers();
        setManagerOptions(list.filter((u) => u.id !== user.id));
      } catch {
        setManagerOptions([]);
      }
    };
    void loadManagers();
  }, [open, user.id]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: toFormValues(user),
  });

  useEffect(() => {
    form.reset(toFormValues(user));
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
        payload.employee_code = data.employee_code?.trim() || null;
        payload.job_title = data.job_title?.trim() || null;
        payload.job_level = data.job_level?.trim() || null;
        payload.department = data.department?.trim() || null;
        payload.reports_to_user_id = data.reports_to_user_id?.trim() || null;
        payload.contract_type = data.contract_type?.trim() || null;
        payload.offer_letter_issued = !!data.offer_letter_issued;
        payload.offer_letter_shared_date =
          data.offer_letter_shared_date?.trim() || null;
        payload.probation_end_date = data.probation_end_date?.trim() || null;
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
        avatar: updatedUser.avatar || user.avatar,
      };

      onUserUpdate(finalUpdatedUser);

      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
      setOpen(false);
    } catch (error: unknown) {
      let errorMessage = "Failed to update the user. Please try again.";
      if (error instanceof Error && error.message) {
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

  const handleRegenerateCode = async () => {
    if (!isAdminEditor || regenerating || isSubmitting) return;
    const join = (form.getValues("joining_date") || "").trim();
    if (!join) {
      toast({
        title: "Cannot create Employee ID",
        description: "Missing: Join date. Set Join date first, then regenerate. Date of birth must also exist from onboarding.",
        variant: "destructive",
      });
      return;
    }
    setRegenerating(true);
    try {
      const updatedUser = await userService.updateUser(user.id, {
        joining_date: join,
        regenerate_employee_code: true,
      });
      form.setValue("employee_code", updatedUser.employee_code || "");
      onUserUpdate({ ...user, ...updatedUser });
      toast({
        title: "Employee ID regenerated",
        description: updatedUser.employee_code || "Code updated",
      });
    } catch (error: unknown) {
      toast({
        title: "Cannot create Employee ID",
        description:
          error instanceof Error
            ? error.message
            : "Join date and date of birth are required",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
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
      <DialogContent className="w-[min(96vw,600px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden">
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
                Update account and employment details for {user.username || user.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[min(70vh,560px)] overflow-y-auto px-6 py-5 grid grid-cols-12 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="col-span-12 space-y-2">
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
                  <FormItem className="col-span-12 space-y-2">
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
                  <FormItem className="col-span-12 md:col-span-6 space-y-2">
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
                  <FormItem className="col-span-12 md:col-span-6 space-y-2">
                    <FormLabelDot color="bg-orange-500">Phone</FormLabelDot>
                    <FormControl>
                      <PhoneInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdminEditor ? (
                <>
                  <div className="col-span-12 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Employment (HR)
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="joining_date"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot color="bg-teal-500">Join date</FormLabelDot>
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

                  <FormField
                    control={form.control}
                    name="employee_code"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot color="bg-sky-500">Employee ID</FormLabelDot>
                        <div className="flex gap-2 min-w-0">
                          <FormControl>
                            <Input
                              placeholder="CODO-XXXX-XXXX"
                              {...field}
                              className={cn(fieldInputClass, "font-mono text-sm")}
                              maxLength={32}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl shrink-0"
                            disabled={regenerating || isSubmitting}
                            onClick={() => void handleRegenerateCode()}
                            title="Regenerate from join date + DOB"
                          >
                            {regenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Needs Join date + Date of birth (from onboarding). Refresh regenerates the
                          cipher ID.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="job_title"
                    render={({ field }) => (
                      <FormItem className="col-span-12 space-y-2">
                        <FormLabelDot>Job title</FormLabelDot>
                        <FormControl>
                          <Input
                            placeholder="e.g. Full Stack Developer"
                            {...field}
                            className={fieldInputClass}
                            maxLength={200}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="job_level"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot>Job level</FormLabelDot>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger className={fieldInputClass}>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" className="z-[70]">
                            {JOB_LEVEL_OPTIONS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
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
                    name="department"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot>Department</FormLabelDot>
                        <FormControl>
                          <Input
                            placeholder="e.g. CODO Agency - Development"
                            {...field}
                            className={fieldInputClass}
                            maxLength={150}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reports_to_user_id"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot>Reports to</FormLabelDot>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v === "__none__" ? "" : v)
                          }
                          value={field.value ? field.value : "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger className={fieldInputClass}>
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent
                            position="popper"
                            className="z-[70] max-h-64"
                            searchPlaceholder="Search manager..."
                          >
                            <SelectItem value="__none__">N/A</SelectItem>
                            {managerOptions.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.username || m.name || m.email}
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
                    name="contract_type"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot>Contract type</FormLabelDot>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v === "__none__" ? "" : v)
                          }
                          value={field.value ? field.value : "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger className={fieldInputClass}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" className="z-[70]">
                            <SelectItem value="__none__">Not set</SelectItem>
                            {CONTRACT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
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
                    name="probation_end_date"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot>Probation end date</FormLabelDot>
                        <FormControl>
                          <DatePicker
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Optional / NILL"
                            className={fieldInputClass}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="offer_letter_issued"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
                        <div className="min-w-0">
                          <FormLabelDot color="bg-violet-500">Offer letter</FormLabelDot>
                          <p className="text-xs text-muted-foreground mt-1">
                            Mark when the offer letter has been issued
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked && !form.getValues("offer_letter_shared_date")) {
                                form.setValue(
                                  "offer_letter_shared_date",
                                  new Date().toISOString().slice(0, 10),
                                  { shouldDirty: true }
                                );
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="offer_letter_shared_date"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot color="bg-violet-500">Offer letter shared</FormLabelDot>
                        <FormControl>
                          <DatePicker
                            value={field.value || ""}
                            onChange={(v) => {
                              field.onChange(v);
                              if (v) {
                                form.setValue("offer_letter_issued", true, {
                                  shouldDirty: true,
                                });
                              }
                            }}
                            placeholder="When shared"
                            className={fieldInputClass}
                            disableFuture
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-12 pt-1" />
                </>
              ) : null}
            </div>

            <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="h-11 px-6 border-gray-200 dark:border-gray-700 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
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
