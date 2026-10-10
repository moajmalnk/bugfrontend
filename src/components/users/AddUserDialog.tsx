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
import { Checkbox } from "@/components/ui/checkbox";
import { OnboardingMode, StandardsMode, UserRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { permissionService } from "@/services/permissionService";
import {
  cn,
  isOnboardingConfigurable,
  isStandardsConfigurable,
  onboardingModeDefault,
  standardsModeDefault,
  type StandardsFeature,
} from "@/lib/utils";
import { TesterTypeField } from "@/components/users/TesterTypeField";
import { StandardsAccessField } from "@/components/users/StandardsAccessField";
import { OnboardingModeField } from "@/components/users/OnboardingModeField";

const userFormSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, { message: "Username must be at least 3 characters" })
      .max(50, { message: "Username must be 50 characters or fewer" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain letters, numbers, and underscores",
      }),
    email: z.string().trim().max(255).email({ message: "Invalid email address" }),
    role: z.string().min(1, {
      message: "Please select a role",
    }),
    tester_type: z.string().optional(),
    codo_rules_mode: z.enum(["required", "optional", "hidden"]).optional(),
    cursor_tips_mode: z.enum(["required", "optional", "hidden"]).optional(),
    onboarding_mode: z.enum(["required", "optional", "off"]).optional(),
    phone: z.string().optional(),
    joining_date: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
        message: "Joining date must be YYYY-MM-DD",
      }),
  })
  .superRefine((values, ctx) => {
    if (values.role === "tester" && values.tester_type !== "codo" && values.tester_type !== "client") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tester_type"],
        message: "Choose CODO Tester or Client Tester",
      });
    }
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
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [addAnother, setAddAnother] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const usernameRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    mode: "onTouched",
    defaultValues: {
      username: "",
      email: "",
      role: "",
      tester_type: "",
      phone: "",
      joining_date: "",
    },
  });

  const selectedRoleName = form.watch("role");
  const selectedTesterType = form.watch("tester_type");
  const isTesterRole = selectedRoleName === "tester";
  const testerTypeMissing =
    isTesterRole && selectedTesterType !== "codo" && selectedTesterType !== "client";
  const standardsConfigurable = isStandardsConfigurable(selectedRoleName, selectedTesterType);
  const standardsDefaults: Record<StandardsFeature, StandardsMode> = {
    codo: standardsModeDefault(selectedRoleName, selectedTesterType, "codo"),
    cursor_tips: standardsModeDefault(selectedRoleName, selectedTesterType, "cursor_tips"),
  };
  const codoMode = form.watch("codo_rules_mode") ?? standardsDefaults.codo;
  const cursorTipsMode = form.watch("cursor_tips_mode") ?? standardsDefaults.cursor_tips;
  const onboardingConfigurable = isOnboardingConfigurable(selectedRoleName);
  const onboardingDefault: OnboardingMode = onboardingModeDefault(selectedRoleName, selectedTesterType);
  const onboardingMode = form.watch("onboarding_mode") ?? onboardingDefault;

  // Why: modes follow the role — a role or tester type change re-applies that role's defaults.
  useEffect(() => {
    form.setValue("codo_rules_mode", undefined, { shouldDirty: false });
    form.setValue("cursor_tips_mode", undefined, { shouldDirty: false });
    form.setValue("onboarding_mode", undefined, { shouldDirty: false });
  }, [selectedRoleName, selectedTesterType, form]);

  useEffect(() => {
    if (!isTesterRole && form.getValues("tester_type")) {
      form.setValue("tester_type", "", { shouldValidate: false });
      form.clearErrors("tester_type");
    }
  }, [isTesterRole, form]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await permissionService.getRoles();
        setRoles(data);
        if (data.length > 0 && !form.getValues("role")) {
          form.setValue("role", data[data.length - 1].role_name.toLowerCase());
        }
      } catch {
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
        role: userData.role,
        role_id: selectedRole?.id,
        tester_type: userData.role === "tester" ? userData.tester_type : undefined,
        ...(isStandardsConfigurable(userData.role, userData.tester_type)
          ? {
              codo_rules_mode:
                userData.codo_rules_mode ??
                standardsModeDefault(userData.role, userData.tester_type, "codo"),
              cursor_tips_mode:
                userData.cursor_tips_mode ??
                standardsModeDefault(userData.role, userData.tester_type, "cursor_tips"),
            }
          : {}),
        ...(isOnboardingConfigurable(userData.role)
          ? {
              onboarding_mode:
                userData.onboarding_mode ?? onboardingModeDefault(userData.role, userData.tester_type),
            }
          : {}),
        phone: userData.phone && userData.phone.trim() ? "+91" + userData.phone.trim() : undefined,
        joining_date: userData.joining_date?.trim() || undefined,
      };
      return await onUserAdd(payload as UserFormValues);
    } catch {
      return false;
    }
  };

  const defaultRole = () =>
    roles.length > 0 ? roles[roles.length - 1].role_name.toLowerCase() : "";

  /**
   * Why: Batch onboarding — keep role, tester type and joining date (usually shared
   * across a hiring batch) and clear only the per-person fields.
   */
  const resetForNext = (prev: UserFormValues) => {
    form.reset({
      username: "",
      email: "",
      phone: "",
      role: prev.role,
      tester_type: prev.role === "tester" ? prev.tester_type : "",
      codo_rules_mode: prev.codo_rules_mode,
      cursor_tips_mode: prev.cursor_tips_mode,
      onboarding_mode: prev.onboarding_mode,
      joining_date: prev.joining_date || "",
    });
    requestAnimationFrame(() => usernameRef.current?.focus());
  };

  const onSubmit = async (data: UserFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await handleAddUser(data);
      if (result) {
        if (addAnother) {
          setAddedCount((n) => n + 1);
          resetForNext(data);
        } else {
          form.reset({ ...form.formState.defaultValues, role: defaultRole() });
          setAddedCount(0);
          setOpen(false);
        }
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
    if (!next) {
      if (isSubmitting) return;
      const { username, email, phone, codo_rules_mode, cursor_tips_mode, onboarding_mode } =
        form.getValues();
      const hasDraft = Boolean(
        username?.trim() ||
          email?.trim() ||
          phone?.trim() ||
          codo_rules_mode ||
          cursor_tips_mode ||
          onboarding_mode
      );
      if (hasDraft && !window.confirm("You have unsaved changes. Discard this user?")) return;
      form.reset({
        username: "",
        email: "",
        phone: "",
        tester_type: "",
        codo_rules_mode: undefined,
        cursor_tips_mode: undefined,
        onboarding_mode: undefined,
        joining_date: "",
        role: defaultRole(),
      });
      setAddedCount(0);
    }
    setOpen(next);
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
                Create a new account and decide whether they go through employee onboarding.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[min(70vh,520px)] overflow-y-auto px-6 py-5 grid grid-cols-12 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="col-span-12 space-y-2">
                    <FormLabelDot>Username</FormLabelDot>
                    <FormControl>
                      <Input
                        placeholder="Username"
                        autoComplete="off"
                        maxLength={50}
                        {...field}
                        ref={(el) => {
                          field.ref(el);
                          usernameRef.current = el;
                        }}
                        className={fieldInputClass}
                      />
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
                  <FormItem className="col-span-12 space-y-2">
                    <FormLabelDot color="bg-indigo-500">Email</FormLabelDot>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        autoComplete="off"
                        maxLength={255}
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
                  <FormItem className="col-span-12 md:col-span-6 space-y-2">
                    <FormLabelDot color="bg-orange-500">Phone</FormLabelDot>
                    <FormControl>
                      <PhoneInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isTesterRole && (
                <FormField
                  control={form.control}
                  name="tester_type"
                  render={({ field, fieldState }) => (
                    <FormItem className="col-span-12 space-y-2">
                      <FormLabelDot color="bg-yellow-500">Tester type</FormLabelDot>
                      <FormControl>
                        <TesterTypeField
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            form.clearErrors("tester_type");
                          }}
                          disabled={isSubmitting}
                          invalid={!!fieldState.error}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Only CODO Testers can use BugUpdate, check-in, weekly report and leave.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {standardsConfigurable && (
                <div className="col-span-12 space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                    CODO standards access
                  </p>
                  <StandardsAccessField
                    codoMode={codoMode}
                    cursorTipsMode={cursorTipsMode}
                    defaults={standardsDefaults}
                    disabled={isSubmitting}
                    onChange={(feature, mode) =>
                      form.setValue(feature === "codo" ? "codo_rules_mode" : "cursor_tips_mode", mode, {
                        shouldDirty: true,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Required asks them to acknowledge every item before the dashboard opens.
                  </p>
                </div>
              )}

              {onboardingConfigurable && (
                <div className="col-span-12 space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    Onboarding
                  </p>
                  <OnboardingModeField
                    value={onboardingMode}
                    defaultMode={onboardingDefault}
                    disabled={isSubmitting}
                    onChange={(mode) => form.setValue("onboarding_mode", mode, { shouldDirty: true })}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="joining_date"
                render={({ field }) => (
                  <FormItem className="col-span-12 space-y-2">
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

            <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-3 sm:items-center sm:justify-between">
              <label
                htmlFor="add-user-another"
                className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground sm:mr-auto"
              >
                <Checkbox
                  id="add-user-another"
                  checked={addAnother}
                  onCheckedChange={(v) => setAddAnother(v === true)}
                  disabled={isSubmitting}
                />
                <span>
                  Add another
                  {addedCount > 0 ? (
                    <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                      · {addedCount} added
                    </span>
                  ) : null}
                </span>
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
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
                disabled={isSubmitting || testerTypeMissing}
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
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
