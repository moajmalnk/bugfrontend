import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/context/AuthContext";
import { isSuperAdminUser } from "@/lib/roleBadge";
import { OnboardingMode, StandardsMode, TesterType, User, UserRole } from "@/types";
import { TesterTypeField } from "@/components/users/TesterTypeField";
import { StandardsAccessField } from "@/components/users/StandardsAccessField";
import { OnboardingModeField } from "@/components/users/OnboardingModeField";
import { BrandAvatar } from "@/components/brand/BrandAvatar";
import { ProfilePhotoResizeModal } from "@/components/onboarding/ProfilePhotoResizeModal";
import { hasUploadedAvatar, resolveAvatarUrl } from "@/lib/avatarUrl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Pencil, RefreshCw } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  cn,
  getOnboardingMode,
  getStandardsMode,
  isOnboardingConfigurable,
  isStandardsConfigurable,
  onboardingModeDefault,
  standardsModeDefault,
  type StandardsFeature,
} from "@/lib/utils";

const optionalDate = z
  .string()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Date must be YYYY-MM-DD",
  });

/** Why: Same age band as onboarding (14–100) so admin Edit User matches Employee ID rules. */
function dobAgeError(value: string): string | null {
  const v = value.trim().slice(0, 10);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Enter a valid date of birth";
  const [year, month, day] = v.split("-").map(Number);
  const dob = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return "Enter a valid date of birth";
  }
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 14 || age > 100) {
    return "Date of birth must be a real past date (age 14–100)";
  }
  return null;
}

const userFormSchema = z
  .object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores",
    }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
  tester_type: z.string().optional(),
  codo_rules_mode: z.enum(["required", "optional", "hidden"]).optional(),
  cursor_tips_mode: z.enum(["required", "optional", "hidden"]).optional(),
  onboarding_mode: z.enum(["required", "optional", "off"]).optional(),
  phone: z.string().optional(),
  joining_date: optionalDate,
  date_of_birth: optionalDate,
  employee_code: z.string().optional(),
  job_title: z.string().max(200).optional(),
  job_level: z.string().max(80).optional(),
  department: z.string().max(150).optional(),
  reports_to_user_id: z.string().optional(),
  contract_type: z.string().optional(),
  offer_letter_issued: z.boolean().optional(),
  offer_letter_shared_date: optionalDate,
  probation_end_date: optionalDate,
}).superRefine((values, ctx) => {
  if (values.role === "tester" && values.tester_type !== "codo" && values.tester_type !== "client") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tester_type"],
      message: "Choose CODO Tester or Client Tester",
    });
  }
  const dobErr = dobAgeError(values.date_of_birth || "");
  if (dobErr) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date_of_birth"],
      message: dobErr,
    });
  }
});

type UserFormValues = z.infer<typeof userFormSchema>;

type EditUserDialogProps = {
  user: User;
  onUserUpdate: (user: User) => void;
  trigger?: React.ReactNode;
  loggedInUserRole: string;
  /** Prefill when DOB is loaded from onboarding details (User Details page). */
  dateOfBirth?: string | null;
};

const fieldInputClass =
  "h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl shadow-sm";

const CONTRACT_OPTIONS = [
  { value: "full_time", label: "Full-Time" },
  { value: "remote", label: "Remote" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "probation", label: "Probation" },
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

function toFormValues(user: User, dateOfBirth?: string | null): UserFormValues {
  const dob = (dateOfBirth || user.date_of_birth || "").toString().slice(0, 10);
  return {
    username: user.username || "",
    email: user.email,
    role: user.role || "tester",
    tester_type:
      user.role === "tester" ? (user.tester_type === "codo" ? "codo" : "client") : "",
    codo_rules_mode: getStandardsMode(user, "codo"),
    cursor_tips_mode: getStandardsMode(user, "cursor_tips"),
    onboarding_mode: getOnboardingMode(user),
    phone: user.phone ? user.phone.replace(/^\+91/, "") : "",
    joining_date: user.joining_date || "",
    date_of_birth: dob,
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
  dateOfBirth,
}: EditUserDialogProps) {
  const { currentUser } = useAuth();
  const { isSuper } = usePermissions();
  const actorIsSuper = isSuperAdminUser(currentUser) || isSuper();
  const targetIsSuper = isSuperAdminUser(user);
  const [open, setOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [managerOptions, setManagerOptions] = useState<User[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const displayName = user.username || user.name || "User";
  const existingAvatarSrc = hasUploadedAvatar(user.avatar)
    ? resolveAvatarUrl(user.avatar, displayName)
    : null;
  const previewSrc = photoPreviewUrl || existingAvatarSrc;
  const showingLogo = !photoPreviewUrl && !hasUploadedAvatar(user.avatar);

  useEffect(() => {
    const loadRoles = async () => {
      const filterRoles = (list: { id: number; role_name: string }[]) =>
        list.filter(
          (r) => actorIsSuper || r.role_name.toLowerCase() !== "admin"
        );
      try {
        setRoles(filterRoles(await permissionService.getRoles()));
      } catch {
        setRoles(
          filterRoles([
            { id: 1, role_name: "Admin" },
            { id: 2, role_name: "Developer" },
            { id: 3, role_name: "Tester" },
            { id: 4, role_name: "Creator" },
          ])
        );
      }
    };
    void loadRoles();
  }, [actorIsSuper]);

  const selectableRoles = useMemo(() => {
    // Keep current Admin role visible when editing an Admin even if actor cannot assign Admin.
    if (
      String(user.role || "").toLowerCase() === "admin" &&
      !roles.some((r) => r.role_name.toLowerCase() === "admin")
    ) {
      return [{ id: 1, role_name: "Admin" }, ...roles];
    }
    return roles;
  }, [roles, user.role]);

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
    defaultValues: toFormValues(user, dateOfBirth),
  });

  const roleKeyRef = useRef("");
  useEffect(() => {
    const initial = toFormValues(user, dateOfBirth);
    roleKeyRef.current = `${initial.role}:${initial.tester_type}`;
    form.reset(initial);
  }, [user, dateOfBirth, form]);

  // Why: Users list may omit DOB — hydrate from getUser when admin opens Edit User.
  useEffect(() => {
    if (!open || String(loggedInUserRole || "").toLowerCase() !== "admin") return;
    const existing = (dateOfBirth || user.date_of_birth || "").toString().slice(0, 10);
    if (existing) return;
    let cancelled = false;
    void (async () => {
      try {
        const fresh = await userService.getUser(user.id);
        const dob = (fresh.date_of_birth || "").toString().slice(0, 10);
        if (!cancelled && dob && !form.getValues("date_of_birth")) {
          form.setValue("date_of_birth", dob, { shouldDirty: false });
        }
      } catch {
        // Optional hydrate — leave field empty if fetch fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loggedInUserRole, user.id, user.date_of_birth, dateOfBirth, form]);

  const isAdminEditor = String(loggedInUserRole || "").toLowerCase() === "admin";
  const selectedRoleName = form.watch("role");
  const selectedTesterType = form.watch("tester_type");
  const selectedJobLevel = form.watch("job_level");
  // Why: Founders / admins are not standard employees — hide manager, contract,
  // department, probation, offer-letter (and similar HR / pay-onboarding fields).
  const isOrgLeaderProfile =
    String(selectedRoleName || "").toLowerCase() === "admin" ||
    String(selectedJobLevel || "").trim().toLowerCase() === "founder";
  const isTesterRole = selectedRoleName === "tester";
  const testerTypeMissing =
    isTesterRole && selectedTesterType !== "codo" && selectedTesterType !== "client";

  useEffect(() => {
    if (!isTesterRole && form.getValues("tester_type")) {
      form.setValue("tester_type", "");
      form.clearErrors("tester_type");
    }
  }, [isTesterRole, form]);

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
  const savedOnboardingMode = getOnboardingMode(user);
  const onboardingSubmitted =
    !!user.onboarding_completed_at ||
    (savedOnboardingMode === "required" && Number(user.onboarding_completed ?? 0) === 1);

  // Why: modes follow the role — switching role or tester type re-applies that role's defaults.
  useEffect(() => {
    const key = `${selectedRoleName}:${selectedTesterType}`;
    if (roleKeyRef.current === key) return;
    roleKeyRef.current = key;
    form.setValue("codo_rules_mode", standardsModeDefault(selectedRoleName, selectedTesterType, "codo"), {
      shouldDirty: true,
    });
    form.setValue(
      "cursor_tips_mode",
      standardsModeDefault(selectedRoleName, selectedTesterType, "cursor_tips"),
      { shouldDirty: true }
    );
    form.setValue("onboarding_mode", onboardingModeDefault(selectedRoleName, selectedTesterType), {
      shouldDirty: true,
    });
  }, [selectedRoleName, selectedTesterType, form]);

  useEffect(() => {
    if (!profilePhoto) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(profilePhoto);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhoto]);

  const resetPhotoState = () => {
    setProfilePhoto(null);
    setPhotoPreviewUrl(null);
    setCropOpen(false);
    setCropSrc(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const discardAndClose = () => {
    const initial = toFormValues(user, dateOfBirth);
    roleKeyRef.current = `${initial.role}:${initial.tester_type}`;
    form.reset(initial);
    resetPhotoState();
    setDiscardConfirmOpen(false);
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (isSubmitting) return;
      const dirty = form.formState.isDirty || !!profilePhoto;
      if (dirty) {
        setDiscardConfirmOpen(true);
        return;
      }
      discardAndClose();
      return;
    }
    setOpen(true);
  };

  const handlePhotoPick = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      toast({
        title: "Invalid image",
        description: "Use JPG, PNG, or WebP.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Max size is 8MB before resize.",
        variant: "destructive",
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      if (
        data.role === "admin" &&
        !actorIsSuper &&
        String(user.role || "").toLowerCase() !== "admin"
      ) {
        toast({
          title: "Not allowed",
          description: "Only a Super Admin can assign the Admin role.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      const selectedRole = selectableRoles.find(
        (r) => r.role_name.toLowerCase() === data.role.toLowerCase()
      );

      const payload: Parameters<typeof userService.updateUser>[1] = {
        username: data.username,
        email: data.email,
        phone: data.phone ? "+91" + data.phone : "",
      };
      if (isAdminEditor) {
        payload.role = data.role as UserRole;
        payload.role_id = selectedRole?.id;
        payload.tester_type =
          data.role === "tester" ? (data.tester_type as TesterType) : null;
        if (isStandardsConfigurable(data.role, data.tester_type)) {
          payload.codo_rules_mode =
            data.codo_rules_mode ?? standardsModeDefault(data.role, data.tester_type, "codo");
          payload.cursor_tips_mode =
            data.cursor_tips_mode ?? standardsModeDefault(data.role, data.tester_type, "cursor_tips");
        }
        if (isOnboardingConfigurable(data.role)) {
          payload.onboarding_mode =
            data.onboarding_mode ?? onboardingModeDefault(data.role, data.tester_type);
        }
        payload.joining_date = data.joining_date?.trim() || null;
        payload.date_of_birth = data.date_of_birth?.trim() || null;
        payload.employee_code = data.employee_code?.trim() || null;
        payload.job_title = data.job_title?.trim() || null;
        payload.job_level = data.job_level?.trim() || null;
        if (!isOrgLeaderProfile) {
          payload.department = data.department?.trim() || null;
          payload.reports_to_user_id = data.reports_to_user_id?.trim() || null;
          payload.contract_type = data.contract_type?.trim() || null;
          payload.offer_letter_issued = !!data.offer_letter_issued;
          payload.offer_letter_shared_date =
            data.offer_letter_shared_date?.trim() || null;
          payload.probation_end_date = data.probation_end_date?.trim() || null;
        }
      }
      if (profilePhoto) {
        payload.profile_photo = profilePhoto;
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
        date_of_birth:
          updatedUser.date_of_birth !== undefined
            ? updatedUser.date_of_birth
            : data.date_of_birth?.trim() || null,
      };

      onUserUpdate(finalUpdatedUser);
      resetPhotoState();

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
    const dob = (form.getValues("date_of_birth") || "").trim();
    const missing: string[] = [];
    if (!join) missing.push("Join date");
    if (!dob) missing.push("Date of birth");
    if (missing.length) {
      toast({
        title: "Cannot create Employee ID",
        description: `Missing: ${missing.join(" and ")}. Set them below, then regenerate.`,
        variant: "destructive",
      });
      return;
    }
    const dobErr = dobAgeError(dob);
    if (dobErr) {
      toast({
        title: "Cannot create Employee ID",
        description: dobErr,
        variant: "destructive",
      });
      return;
    }
    setRegenerating(true);
    try {
      const updatedUser = await userService.updateUser(user.id, {
        joining_date: join,
        date_of_birth: dob,
        regenerate_employee_code: true,
      });
      form.setValue("employee_code", updatedUser.employee_code || "");
      if (updatedUser.date_of_birth) {
        form.setValue("date_of_birth", String(updatedUser.date_of_birth).slice(0, 10));
      }
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              <div className="col-span-12 flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                {showingLogo ? (
                  <BrandAvatar
                    className="h-20 w-20 shrink-0 rounded-2xl ring-1 ring-border/60 shadow-sm"
                    alt={`${displayName} profile`}
                  />
                ) : (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border/60 shadow-sm bg-white">
                    <img
                      src={previewSrc || "/brand/bugricer-mark-black.png"}
                      alt={`${displayName} profile`}
                      className="h-full w-full object-contain p-[14%]"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Profile photo</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {showingLogo
                      ? "No photo yet — BugRicer logo is shown by default. Upload a square photo to replace it."
                      : "Update the profile picture shown across BugRicer."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePhotoPick(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={isSubmitting}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {hasUploadedAvatar(user.avatar) || profilePhoto
                        ? "Change photo"
                        : "Upload photo"}
                    </Button>
                    {profilePhoto ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 rounded-xl text-muted-foreground"
                        disabled={isSubmitting}
                        onClick={() => setProfilePhoto(null)}
                      >
                        Clear new photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

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
                      disabled={
                        loggedInUserRole !== "admin" ||
                        (targetIsSuper && !actorIsSuper)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className={fieldInputClass}>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[70]">
                        {selectableRoles.map((role) => (
                          <SelectItem
                            key={role.id}
                            value={role.role_name.toLowerCase()}
                            disabled={
                              role.role_name.toLowerCase() === "admin" &&
                              !actorIsSuper &&
                              String(user.role || "").toLowerCase() !== "admin"
                            }
                          >
                            {role.role_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {targetIsSuper ? (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Super Admin — role changes require another Super Admin.
                      </p>
                    ) : null}
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
                          disabled={!isAdminEditor || isSubmitting}
                          invalid={!!fieldState.error}
                        />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Only CODO Testers can use BugUpdate, check-in, weekly report and leave.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isAdminEditor && standardsConfigurable && (
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
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Switching to Required asks them to acknowledge every item the next time they open the dashboard.
                  </p>
                </div>
              )}

              {isAdminEditor && onboardingConfigurable && (
                <div className="col-span-12 space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    Onboarding
                  </p>
                  <OnboardingModeField
                    value={onboardingMode}
                    defaultMode={onboardingDefault}
                    savedMode={savedOnboardingMode}
                    hasSubmitted={onboardingSubmitted}
                    disabled={isSubmitting}
                    onChange={(mode) => form.setValue("onboarding_mode", mode, { shouldDirty: true })}
                  />
                </div>
              )}

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
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6 space-y-2">
                        <FormLabelDot color="bg-pink-500">Date of birth</FormLabelDot>
                        <FormControl>
                          <DatePicker
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Pick date of birth"
                            className={fieldInputClass}
                            disableFuture
                            showToday={false}
                            // Why: Default DatePicker is ±15 years (2011–2041 in 2026) — too narrow for DOB.
                            fromYear={new Date().getFullYear() - 100}
                            toYear={new Date().getFullYear() - 14}
                          />
                        </FormControl>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Used for Employee ID and BugDates birthdays. Age must be 14–100.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employee_code"
                    render={({ field }) => (
                      <FormItem className="col-span-12 space-y-2">
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
                          Needs Join date + Date of birth above. Refresh regenerates the cipher ID.
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
                      <FormItem
                        className={cn(
                          "col-span-12 space-y-2",
                          !isOrgLeaderProfile && "md:col-span-6"
                        )}
                      >
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

                  {!isOrgLeaderProfile ? (
                    <>
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
                                {managerOptions.map((m) => {
                                  const name = m.username || m.name || m.email || "User";
                                  const position = (m.role || m.job_title || "")
                                    .replace(/_/g, " ")
                                    .trim();
                                  return (
                                    <SelectItem key={m.id} value={m.id}>
                                      <span className="flex items-center gap-2 min-w-0">
                                        <span className="truncate">{name}</span>
                                        {position ? (
                                          <span className="text-muted-foreground capitalize shrink-0">
                                            · {position}
                                          </span>
                                        ) : null}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
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
                    </>
                  ) : null}

                  <div className="col-span-12 pt-1" />
                </>
              ) : null}
            </div>

            <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="h-11 px-6 border-gray-200 dark:border-gray-700 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || testerTypeMissing}
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

      <ProfilePhotoResizeModal
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={(next) => {
          setCropOpen(next);
          if (!next && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
        onApply={(file) => {
          setProfilePhoto(file);
          if (cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
          setCropOpen(false);
        }}
      />

      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent
          className="z-[1100] max-w-[400px] rounded-2xl"
          overlayClassName="z-[1100]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits on this user. Close anyway and lose them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={discardAndClose}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
