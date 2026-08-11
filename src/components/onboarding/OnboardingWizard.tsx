import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl as resolveStoredAvatarUrl } from "@/lib/avatarUrl";
import {
  INDIAN_STATES,
  districtsForState,
} from "@/lib/indiaLocations";
import { lookupIndiaPin } from "@/lib/indiaPinLookup";
import {
  isValidIfscFormat,
  lookupIndiaIfsc,
  normalizeIfsc,
} from "@/lib/indiaIfscLookup";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  slugToStep,
  stepToSlug,
} from "@/lib/onboardingPersistence";
import { onboardingService } from "@/services/onboardingService";
import { WfhLocationMapPicker } from "@/components/onboarding/WfhLocationMapPicker";
import {
  ProfilePhotoResizeModal,
  validateProfilePhotoSource,
} from "@/components/onboarding/ProfilePhotoResizeModal";
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Map,
  MapPin,
  MessageCircle,
  Mic,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
  ExternalLink,
  BookOpen,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { UserOnboardingDetails } from "@/services/onboardingService";

/** Why: input-otp caret/focus breaks inside Dialog overflow scroll — native digit boxes stay typeable. */
function OtpDigitBoxes({
  value,
  onChange,
  disabled,
  onComplete,
  autoFocus,
}: {
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
}) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (!autoFocus) return;
    const t = window.setTimeout(() => refs.current[Math.min(digits.length, 5)]?.focus(), 0);
    return () => window.clearTimeout(t);
    // Only on mount / when OTP UI appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const commit = (next: string) => {
    const cleaned = next.replace(/\D/g, "").slice(0, 6);
    onChange(cleaned);
    if (cleaned.length === 6) completeRef.current?.(cleaned);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          value={digits[i] ?? ""}
          className={cn(
            "h-11 w-11 rounded-xl border border-border/80 bg-background/80 text-center text-base font-semibold tabular-nums shadow-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (!raw) {
              commit(digits.slice(0, i));
              return;
            }
            const next = (digits.slice(0, i) + raw).slice(0, 6);
            commit(next);
            const focusAt = Math.min(next.length, 5);
            refs.current[focusAt]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (digits[i]) {
                commit(digits.slice(0, i) + digits.slice(i + 1));
              } else if (i > 0) {
                commit(digits.slice(0, i - 1));
                refs.current[i - 1]?.focus();
              }
              return;
            }
            if (e.key === "ArrowLeft" && i > 0) {
              e.preventDefault();
              refs.current[i - 1]?.focus();
            }
            if (e.key === "ArrowRight" && i < 5) {
              e.preventDefault();
              refs.current[i + 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!pasted) return;
            commit(pasted);
            refs.current[Math.min(pasted.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );
}

/** Why: Draft / typed names often differ slightly from India Post spellings (e.g. Vattaloor vs Vattalur). */
function matchPinOffice(current: string, names: string[]): string {
  const n = current.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!n) return "";
  const exact = names.find(
    (o) => o.toLowerCase().replace(/[^a-z0-9]/g, "") === n
  );
  if (exact) return exact;
  const prefix = n.slice(0, Math.min(6, n.length));
  if (prefix.length < 4) return "";
  return (
    names.find((o) => {
      const on = o.toLowerCase().replace(/[^a-z0-9]/g, "");
      return on.startsWith(prefix) || n.startsWith(on.slice(0, prefix.length));
    }) || ""
  );
}

const STEPS = [
  { label: "Address", short: "Reach & WFH" },
  { label: "Statutory", short: "Documents" },
  { label: "Banking", short: "Payroll" },
  { label: "Permissions", short: "Workspace" },
  { label: "Review", short: "Summary & legal" },
] as const;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".heic"];
const fieldClass =
  "h-11 rounded-xl border-border/70 bg-background/80 shadow-none focus-visible:ring-2 focus-visible:ring-primary/30";

type FileKey = "aadhaar_file" | "pan_file" | "profile_photo";
type PermStatus = "idle" | "granted" | "denied";

function FieldShell({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("col-span-12 md:col-span-6 space-y-2", className)}>
      <Label className="text-[13px] font-medium text-foreground/90 tracking-tight">
        {label}
        {required ? <span className="text-primary/80 ml-0.5">*</span> : null}
        {hint ? (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  status,
  statusDetail,
  className,
}: {
  label: string;
  value?: string | null;
  status?: "verified" | "pending" | "denied" | "ok" | "warn" | null;
  statusDetail?: string | null;
  className?: string;
}) {
  const display = (value ?? "").trim();
  const statusStyles: Record<
    NonNullable<typeof status>,
    string
  > = {
    verified:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
    denied: "bg-destructive/10 text-destructive border-destructive/25",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  };
  const statusLabel =
    status === "verified"
      ? "Verified"
      : status === "ok"
        ? "Ready"
        : status === "pending"
          ? "Pending"
          : status === "denied"
            ? "Denied"
            : status === "warn"
              ? "Check"
              : null;

  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border/50 bg-background/60 p-3.5 flex flex-col gap-2",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </p>
        {status && statusLabel ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
              statusStyles[status]
            )}
          >
            {status === "verified" || status === "ok" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : status === "denied" ? (
              <XCircle className="h-3 w-3" />
            ) : null}
            {statusLabel}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-medium text-foreground break-words leading-snug">
        {display || "—"}
      </p>
      {statusDetail ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{statusDetail}</p>
      ) : null}
    </div>
  );
}

function SummaryBlock({
  icon: Icon,
  title,
  subtitle,
  onEdit,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="col-span-12 rounded-2xl border border-border/60 bg-card/80 overflow-hidden shadow-sm shadow-black/5">
      <div className="relative flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent" />
        <div className="relative flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0 border border-primary/15">
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight truncate">{title}</h3>
            {subtitle ? (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {onEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative rounded-xl h-8 text-xs shrink-0 border-border/70"
            onClick={onEdit}
          >
            Edit
          </Button>
        ) : null}
      </div>
      <div className="p-4 sm:p-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-0.5">
        {title}
      </p>
      <div className="grid grid-cols-12 gap-2.5 sm:gap-3">{children}</div>
    </div>
  );
}

function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    return "Allowed types: PDF, JPG, PNG, HEIC";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Max file size is 5MB";
  }
  return null;
}

function FileDropZone({
  label,
  required,
  file,
  error,
  onSelect,
  existingLabel,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  error?: string;
  onSelect: (file: File | null, error?: string) => void;
  /** Shown when no new File is selected but a prior upload exists (edit mode). */
  existingLabel?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();

  const applyFile = (next: File | null) => {
    if (!next) {
      onSelect(null);
      return;
    }
    const err = validateFile(next);
    if (err) {
      onSelect(null, err);
      return;
    }
    onSelect(next);
  };

  const hasExisting = !file && !!existingLabel;

  return (
    <div className="col-span-12 md:col-span-6 space-y-2">
      <Label className="text-[13px] font-medium text-foreground/90">
        {label}
        {required ? <span className="text-primary/80 ml-0.5">*</span> : (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">optional</span>
        )}
      </Label>
      <div
        className={cn(
          "relative flex items-center rounded-2xl border border-dashed border-border/80 min-h-[132px]",
          "bg-gradient-to-b from-muted/40 to-muted/10 transition-all",
          !file && !hasExisting && "hover:from-primary/5 hover:to-muted/20 hover:border-primary/40",
          (file || hasExisting) && "border-primary/40 from-primary/5 to-primary/[0.02]",
          error && "border-destructive/60"
        )}
      >
        {file || hasExisting ? (
          <div className="flex items-center gap-3 w-full p-4 sm:p-5 min-w-0">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/15 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {file?.name || existingLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {file
                  ? "PDF, JPG, PNG, HEIC · max 5MB"
                  : "On file · replace to upload a new scan"}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                title="Replace file"
                aria-label="Replace file"
                onClick={openPicker}
                className="h-9 w-9 rounded-xl inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              {file ? (
                <button
                  type="button"
                  title="Remove file"
                  aria-label="Remove file"
                  onClick={() => {
                    if (inputRef.current) inputRef.current.value = "";
                    onSelect(null);
                  }}
                  className="h-9 w-9 rounded-xl inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            className="group flex flex-col items-center justify-center gap-2.5 w-full p-6 cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-center px-2">
              <p className="text-sm font-medium text-foreground">Drop file or browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG, HEIC · max 5MB
              </p>
            </div>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            e.target.value = "";
            applyFile(next);
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export interface OnboardingFormState {
  emergency_contact: string;
  emergency_contact_verified: boolean;
  emergency_contact_verified_at: string | null;
  contact_email: string;
  contact_email_verified: boolean;
  contact_email_verified_at: string | null;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  house_name_number: string;
  landmark: string;
  city: string;
  post_office: string;
  pin_code: string;
  district: string;
  state: string;
  country: string;
  wfh_latitude: number | null;
  wfh_longitude: number | null;
  aadhaar_number: string;
  pan_number: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  upi_id: string;
  upi_linked_phone: string;
  aadhaar_file: File | null;
  pan_file: File | null;
  profile_photo: File | null;
  terms_accepted: boolean;
  privacy_accepted: boolean;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
}

const INITIAL: OnboardingFormState = {
  emergency_contact: "",
  emergency_contact_verified: false,
  emergency_contact_verified_at: null,
  contact_email: "",
  contact_email_verified: false,
  contact_email_verified_at: null,
  date_of_birth: "",
  gender: "",
  marital_status: "",
  house_name_number: "",
  landmark: "",
  city: "",
  post_office: "",
  pin_code: "",
  district: "",
  state: "Kerala",
  country: "India",
  wfh_latitude: null,
  wfh_longitude: null,
  aadhaar_number: "",
  pan_number: "",
  account_holder_name: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  account_type: "salary",
  upi_id: "",
  upi_linked_phone: "",
  aadhaar_file: null,
  pan_file: null,
  profile_photo: null,
  terms_accepted: false,
  privacy_accepted: false,
  terms_accepted_at: null,
  privacy_accepted_at: null,
};

/** Why: Edit-mode preview only when a real avatar exists (never ui-avatars fallback). */
function resolveExistingAvatar(avatar: string | null | undefined): string | null {
  const raw = (avatar || "").trim();
  if (!raw) return null;
  return resolveStoredAvatarUrl(raw, "User");
}

function mapDetailsToForm(
  details: UserOnboardingDetails,
  opts?: {
    termsAcceptedAt?: string | null;
    privacyAcceptedAt?: string | null;
    employeeName?: string;
    employeePhone?: string;
    employeeEmail?: string;
    /** Why: Edit mode — saved contacts stay verified until the value changes. */
    trustSavedContacts?: boolean;
  }
): OnboardingFormState {
  const emgDigits = String(details.emergency_contact || "")
    .replace(/\D/g, "")
    .slice(0, 15);
  const emgLast10 = emgDigits.length >= 10 ? emgDigits.slice(-10) : emgDigits;
  const emgVerified =
    !!details.emergency_contact_verified_at ||
    (!!opts?.trustSavedContacts && emgLast10.length === 10);

  // Prefer saved contact email; otherwise seed with the user's own login email (allowed).
  const mail = String(details.contact_email || opts?.employeeEmail || "")
    .trim()
    .toLowerCase()
    .slice(0, 150);
  const mailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  const mailVerified =
    !!details.contact_email_verified_at ||
    (!!opts?.trustSavedContacts && mailLooksValid);

  const lat =
    details.wfh_latitude != null && details.wfh_latitude !== ""
      ? Number(details.wfh_latitude)
      : null;
  const lng =
    details.wfh_longitude != null && details.wfh_longitude !== ""
      ? Number(details.wfh_longitude)
      : null;

  return {
    ...INITIAL,
    emergency_contact: emgLast10,
    emergency_contact_verified: emgVerified,
    emergency_contact_verified_at:
      details.emergency_contact_verified_at ||
      (emgVerified ? details.updated_at || details.created_at || null : null),
    contact_email: mail,
    contact_email_verified: mailVerified,
    contact_email_verified_at:
      details.contact_email_verified_at ||
      (mailVerified ? details.updated_at || details.created_at || null : null),
    date_of_birth: String(details.date_of_birth || "").slice(0, 10),
    gender: String(details.gender || "").toLowerCase(),
    marital_status: String(details.marital_status || "").toLowerCase(),
    house_name_number: String(details.house_name_number || "").slice(0, 150),
    landmark: String(details.landmark || "").slice(0, 200),
    city: String(details.city || "").slice(0, 100),
    post_office: String(details.post_office || "").slice(0, 100),
    pin_code: String(details.pin_code || "").replace(/\D/g, "").slice(0, 10),
    district: String(details.district || "").slice(0, 100),
    state: String(details.state || "Kerala").slice(0, 100),
    country: String(details.country || "India").slice(0, 100),
    wfh_latitude: Number.isFinite(lat) ? lat : null,
    wfh_longitude: Number.isFinite(lng) ? lng : null,
    aadhaar_number: String(details.aadhaar_number || "").replace(/\D/g, "").slice(0, 12),
    pan_number: String(details.pan_number || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10),
    account_holder_name: String(
      details.account_holder_name || opts?.employeeName || ""
    ).slice(0, 150),
    bank_name: String(details.bank_name || "").slice(0, 100),
    account_number: String(details.account_number || "").replace(/\D/g, "").slice(0, 20),
    ifsc_code: normalizeIfsc(String(details.ifsc_code || "")),
    branch_name: String(details.branch_name || "").slice(0, 150),
    account_type: String(details.account_type || "salary").slice(0, 40),
    upi_id: String(details.upi_id || "").slice(0, 100),
    upi_linked_phone: String(
      details.upi_linked_phone || opts?.employeePhone || ""
    )
      .replace(/\D/g, "")
      .slice(0, 15),
    terms_accepted: true,
    privacy_accepted: true,
    terms_accepted_at: opts?.termsAcceptedAt || new Date().toISOString(),
    privacy_accepted_at: opts?.privacyAcceptedAt || new Date().toISOString(),
  };
}

interface OnboardingWizardProps {
  open: boolean;
  userId: string;
  /** Prefills salary account holder from the employee profile. */
  employeeName?: string;
  employeePhone?: string;
  employeeEmail?: string;
  /** New hires only — existing users keep their current password. */
  mustSetPassword?: boolean;
  /**
   * Why: Profile "Edit profile" reopens the same wizard to update HR details.
   * Closable; hydrates from saved onboarding; files optional when already on file.
   */
  editMode?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCompleted: (result?: { avatar?: string | null; updated?: boolean }) => void;
}

export function OnboardingWizard({
  open,
  userId,
  employeeName = "",
  employeePhone = "",
  employeeEmail = "",
  mustSetPassword = false,
  editMode = false,
  onOpenChange,
  onCompleted,
}: OnboardingWizardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormState>(INITIAL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fileErrors, setFileErrors] = useState<Partial<Record<FileKey, string>>>({});
  const [loading, setLoading] = useState(false);
  const [wfhBusy, setWfhBusy] = useState(false);
  const [wfhMapOpen, setWfhMapOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasExistingAadhaar, setHasExistingAadhaar] = useState(false);
  const [hasExistingPan, setHasExistingPan] = useState(false);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [pinLookupBusy, setPinLookupBusy] = useState(false);
  const [pinLookupHint, setPinLookupHint] = useState<string | null>(null);
  const [pinPostOffices, setPinPostOffices] = useState<string[]>([]);
  const [photoCropOpen, setPhotoCropOpen] = useState(false);
  const [photoCropSrc, setPhotoCropSrc] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [ifscLookupBusy, setIfscLookupBusy] = useState(false);
  const [ifscLookupHint, setIfscLookupHint] = useState<string | null>(null);
  const [ifscMeta, setIfscMeta] = useState<string | null>(null);
  const [emgOtpSent, setEmgOtpSent] = useState(false);
  const [emgOtp, setEmgOtp] = useState("");
  const [emgOtpBusy, setEmgOtpBusy] = useState(false);
  const [emgVerifyBusy, setEmgVerifyBusy] = useState(false);
  const [emgCooldown, setEmgCooldown] = useState(0);
  // Why: Own account email/phone are allowed; API sets these when another user owns the value.
  const [emgConflictMsg, setEmgConflictMsg] = useState<string | null>(null);
  const [mailOtpSent, setMailOtpSent] = useState(false);
  const [mailOtp, setMailOtp] = useState("");
  const [mailOtpBusy, setMailOtpBusy] = useState(false);
  const [mailVerifyBusy, setMailVerifyBusy] = useState(false);
  const [mailCooldown, setMailCooldown] = useState(0);
  const [mailConflictMsg, setMailConflictMsg] = useState<string | null>(null);
  /** Why: Remember last OTP-verified values so edit mode only re-prompts OTP after a change. */
  const [verifiedEmgBaseline, setVerifiedEmgBaseline] = useState<string | null>(null);
  const [verifiedEmgBaselineAt, setVerifiedEmgBaselineAt] = useState<string | null>(null);
  const [verifiedMailBaseline, setVerifiedMailBaseline] = useState<string | null>(null);
  const [verifiedMailBaselineAt, setVerifiedMailBaselineAt] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pinAbortRef = useRef<AbortController | null>(null);
  const pinTimerRef = useRef<number | null>(null);
  const ifscAbortRef = useRef<AbortController | null>(null);
  const ifscTimerRef = useRef<number | null>(null);
  const skipUrlSync = useRef(false);
  const [perms, setPerms] = useState<{
    location: PermStatus;
    mic: PermStatus;
    notifications: PermStatus;
  }>({
    location: "idle",
    mic: "idle",
    notifications: "idle",
  });
  const [permBusy, setPermBusy] = useState(false);

  const syncStepToUrl = useCallback(
    (nextStep: number, replace = false) => {
      const slug = stepToSlug(nextStep);
      const next = new URLSearchParams(searchParams);
      if (next.get("onboarding") === slug) return;
      next.set("onboarding", slug);
      skipUrlSync.current = true;
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  const goToStep = useCallback(
    async (
      nextStep: number,
      options?: {
        replace?: boolean;
        persist?: boolean;
        formOverride?: OnboardingFormState;
      }
    ) => {
      const clamped = Math.min(Math.max(nextStep, 0), 4);
      const payload = options?.formOverride ?? form;
      setStep(clamped);
      syncStepToUrl(clamped, options?.replace ?? false);
      if (options?.persist !== false && userId && !editMode) {
        try {
          await saveOnboardingDraft(userId, clamped, payload);
        } catch {
          // non-blocking
        }
      }
    },
    [form, syncStepToUrl, userId, editMode]
  );

  // Restore draft / saved details + URL step when wizard opens
  useEffect(() => {
    if (!open || !userId) return;
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setHasExistingAadhaar(false);
    setHasExistingPan(false);
    setExistingAvatarUrl(null);
    setVerifiedEmgBaseline(null);
    setVerifiedEmgBaselineAt(null);
    setVerifiedMailBaseline(null);
    setVerifiedMailBaselineAt(null);
    setEmgConflictMsg(null);
    setMailConflictMsg(null);
    setEmgOtpSent(false);
    setEmgOtp("");
    setMailOtpSent(false);
    setMailOtp("");
    setHydrated(false);
    let cancelled = false;
    (async () => {
      const withProfileDefaults = (base: OnboardingFormState): OnboardingFormState => ({
        ...base,
        account_holder_name:
          base.account_holder_name.trim() || employeeName.trim().slice(0, 150),
        upi_linked_phone:
          base.upi_linked_phone.replace(/\D/g, "") ||
          employeePhone.replace(/\D/g, "").slice(0, 15),
        contact_email:
          base.contact_email.trim() ||
          employeeEmail.trim().toLowerCase().slice(0, 150),
        emergency_contact:
          base.emergency_contact.replace(/\D/g, "").slice(-10) ||
          employeePhone.replace(/\D/g, "").slice(-10),
      });

      if (editMode) {
        try {
          const data = await onboardingService.get(userId);
          if (cancelled) return;
          const details = data?.details;
          setHasExistingAadhaar(!!(details?.has_aadhaar_file || details?.aadhaar_file_path));
          setHasExistingPan(!!(details?.has_pan_file || details?.pan_file_path));
          setExistingAvatarUrl(resolveExistingAvatar(data?.user?.avatar));
          if (details) {
            const mapped = withProfileDefaults(
              mapDetailsToForm(details, {
                termsAcceptedAt: data.terms_accepted_at || data.user?.terms_accepted_at,
                privacyAcceptedAt: data.privacy_accepted_at || data.user?.privacy_accepted_at,
                employeeName,
                employeePhone,
                employeeEmail,
                trustSavedContacts: true,
              })
            );
            setForm(mapped);
            if (mapped.emergency_contact_verified) {
              setVerifiedEmgBaseline(mapped.emergency_contact.replace(/\D/g, "").slice(-10));
              setVerifiedEmgBaselineAt(mapped.emergency_contact_verified_at);
            }
            if (mapped.contact_email_verified) {
              setVerifiedMailBaseline(mapped.contact_email.trim().toLowerCase());
              setVerifiedMailBaselineAt(mapped.contact_email_verified_at);
            }
          } else {
            setForm(withProfileDefaults(INITIAL));
          }
          const urlSlug = searchParams.get("onboarding");
          const nextStep = urlSlug ? slugToStep(urlSlug) : 0;
          setStep(nextStep);
          syncStepToUrl(nextStep, true);
        } catch {
          if (cancelled) return;
          setForm(withProfileDefaults(INITIAL));
          setStep(0);
          syncStepToUrl(0, true);
          toast({
            title: "Could not load onboarding details",
            description: "You can still edit fields; save may require re-uploading documents.",
            variant: "destructive",
          });
        }
        if (!cancelled) setHydrated(true);
        return;
      }

      const draft = await loadOnboardingDraft(userId, INITIAL);
      if (cancelled) return;
      const urlSlug = searchParams.get("onboarding");
      const urlStep = slugToStep(urlSlug);
      if (draft) {
        setForm(
          withProfileDefaults({
            ...INITIAL,
            ...draft.form,
          } as OnboardingFormState)
        );
        const nextStep = urlSlug ? urlStep : draft.step;
        setStep(nextStep);
        syncStepToUrl(nextStep, true);
      } else {
        setForm(withProfileDefaults(INITIAL));
        const nextStep = urlSlug ? urlStep : 0;
        setStep(nextStep);
        syncStepToUrl(nextStep, true);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // Only hydrate when opened for a user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, editMode]);

  const closeWizard = useCallback(() => {
    if (!editMode || loading) return;
    // Why: Profile derives open from ?onboarding= — clearing the param closes the modal.
    const cleaned = new URLSearchParams(searchParams);
    cleaned.delete("onboarding");
    setSearchParams(cleaned, { replace: true });
    onOpenChange?.(false);
  }, [editMode, loading, searchParams, setSearchParams, onOpenChange]);
  // Browser back/forward within onboarding steps
  useEffect(() => {
    if (!open || !hydrated) return;
    const slug = searchParams.get("onboarding");
    if (!slug) {
      // Why: Edit mode is URL-owned — missing slug means close. First-time
      // onboarding re-seeds the slug so refresh can resume the step.
      if (editMode) {
        onOpenChange?.(false);
        return;
      }
      syncStepToUrl(step, true);
      return;
    }
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    const urlStep = slugToStep(slug);
    if (urlStep !== step) setStep(urlStep);
  }, [open, hydrated, searchParams, step, syncStepToUrl, editMode, onOpenChange]);

  // Persist quietly when files / key fields change after hydrate (first-time only)
  useEffect(() => {
    if (!open || !hydrated || !userId || editMode) return;
    const t = window.setTimeout(() => {
      void saveOnboardingDraft(userId, step, form);
    }, 400);
    return () => window.clearTimeout(t);
  }, [form, step, open, hydrated, userId, editMode]);

  const setField = useCallback(<K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Object URL for cropped profile preview (or existing avatar in edit mode)
  useEffect(() => {
    if (form.profile_photo) {
      const url = URL.createObjectURL(form.profile_photo);
      setPhotoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPhotoPreviewUrl(existingAvatarUrl);
  }, [form.profile_photo, existingAvatarUrl]);
  const openProfilePhotoPicker = () => photoInputRef.current?.click();

  const onProfilePhotoPicked = (file: File | null) => {
    if (!file) return;
    const err = validateProfilePhotoSource(file);
    if (err) {
      setFileErrors((p) => ({ ...p, profile_photo: err }));
      toast({ title: err, variant: "destructive" });
      return;
    }
    setFileErrors((p) => ({ ...p, profile_photo: undefined }));
    if (photoCropSrc) URL.revokeObjectURL(photoCropSrc);
    const src = URL.createObjectURL(file);
    setPhotoCropSrc(src);
    setPhotoCropOpen(true);
  };

  const handlePinChange = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setField("pin_code", digits);
    setPinLookupHint(null);
    setPinPostOffices([]);

    pinAbortRef.current?.abort();
    if (pinTimerRef.current != null) {
      window.clearTimeout(pinTimerRef.current);
      pinTimerRef.current = null;
    }

    if (digits.length !== 6) {
      setPinLookupBusy(false);
      return;
    }

    const ac = new AbortController();
    pinAbortRef.current = ac;
    setPinLookupBusy(true);

    pinTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const hit = await lookupIndiaPin(digits, ac.signal);
          if (ac.signal.aborted) return;
          if (!hit) {
            setPinPostOffices([]);
            setPinLookupHint("No post office found for this PIN");
            return;
          }
          const names = hit.offices.map((o) => o.name);
          setPinPostOffices(names);

          setForm((prev) => {
            const matched = matchPinOffice(prev.post_office, names);
            const autoOffice =
              matched || (names.length === 1 ? names[0] : "");
            return {
              ...prev,
              pin_code: digits,
              post_office: autoOffice,
              city: prev.city.trim() ? prev.city : hit.city,
              state: hit.state || prev.state || "Kerala",
              district: hit.district || prev.district,
              country: "India",
            };
          });

          setPinLookupHint(
            names.length > 1
              ? `${names.length} post offices found — select the correct one`
              : `Filled from PIN · ${names[0]}`
          );
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return;
          setPinLookupHint("Could not look up PIN right now");
        } finally {
          if (!ac.signal.aborted) setPinLookupBusy(false);
        }
      })();
    }, 280);
  }, [setField]);

  const handleIfscChange = useCallback((raw: string) => {
    const code = normalizeIfsc(raw);
    setField("ifsc_code", code);
    setIfscLookupHint(null);
    setIfscMeta(null);

    ifscAbortRef.current?.abort();
    if (ifscTimerRef.current != null) {
      window.clearTimeout(ifscTimerRef.current);
      ifscTimerRef.current = null;
    }

    if (code.length < 11) {
      setIfscLookupBusy(false);
      if (code.length > 0 && code.length < 11) {
        setIfscLookupHint("Enter full 11-character IFSC");
      }
      return;
    }

    if (!isValidIfscFormat(code)) {
      setIfscLookupBusy(false);
      setIfscLookupHint("Invalid IFSC format (e.g. SBIN0001234)");
      return;
    }

    const ac = new AbortController();
    ifscAbortRef.current = ac;
    setIfscLookupBusy(true);
    setIfscLookupHint("Looking up branch…");

    ifscTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const hit = await lookupIndiaIfsc(code, ac.signal);
          if (ac.signal.aborted) return;
          if (!hit) {
            setIfscLookupHint("No bank found for this IFSC — check and try again");
            return;
          }
          setForm((prev) => ({
            ...prev,
            ifsc_code: hit.ifsc,
            bank_name: hit.bank || prev.bank_name,
            branch_name: hit.branch || prev.branch_name,
            // Payroll accounts are almost always salary/savings — prefer salary.
            account_type:
              prev.account_type === "current" ? prev.account_type : "salary",
          }));
          const place = [hit.city, hit.state].filter(Boolean).join(", ");
          setIfscMeta(
            [hit.bank, hit.branch, place].filter(Boolean).join(" · ")
          );
          setIfscLookupHint(
            hit.upi
              ? "Bank & branch filled from IFSC · UPI supported"
              : "Bank & branch filled from IFSC"
          );
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return;
          setIfscLookupHint("Could not look up IFSC right now");
        } finally {
          if (!ac.signal.aborted) setIfscLookupBusy(false);
        }
      })();
    }, 280);
  }, [setField]);

  // After draft hydrate, re-load post-office options for an existing PIN
  useEffect(() => {
    if (!open || !hydrated) return;
    const digits = form.pin_code.replace(/\D/g, "");
    if (digits.length !== 6 || pinPostOffices.length > 0) return;
    handlePinChange(digits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hydrated]);

  // Re-run IFSC lookup after draft hydrate when code is already present
  useEffect(() => {
    if (!open || !hydrated) return;
    const code = normalizeIfsc(form.ifsc_code);
    if (!isValidIfscFormat(code)) return;
    if (form.bank_name.trim() && form.branch_name.trim()) return;
    handleIfscChange(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hydrated]);

  useEffect(() => {
    return () => {
      pinAbortRef.current?.abort();
      ifscAbortRef.current?.abort();
      if (pinTimerRef.current != null) window.clearTimeout(pinTimerRef.current);
      if (ifscTimerRef.current != null) window.clearTimeout(ifscTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (emgCooldown <= 0) return;
    const t = window.setTimeout(() => setEmgCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [emgCooldown]);

  useEffect(() => {
    if (mailCooldown <= 0) return;
    const t = window.setTimeout(() => setMailCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [mailCooldown]);

  const isValidContactEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendEmergencyOtp = async () => {
    const digits = form.emergency_contact.replace(/\D/g, "");
    if (
      digits.length < 10 ||
      emgOtpBusy ||
      emgCooldown > 0 ||
      form.emergency_contact_verified
    ) {
      return;
    }
    setEmgConflictMsg(null);
    // Optimistic: show OTP fields immediately while request runs.
    setEmgOtpBusy(true);
    setEmgOtpSent(true);
    setEmgOtp("");
    setEmgCooldown(30);
    setForm((p) => ({ ...p, emergency_contact_verified: false }));
    try {
      await onboardingService.sendEmergencyOtp(digits.slice(-10));
      toast({
        title: "OTP sent on WhatsApp",
        description: `Check WhatsApp on ····${digits.slice(-4)}`,
      });
    } catch (err) {
      setEmgOtpSent(false);
      setEmgCooldown(0);
      const msg = err instanceof Error ? err.message : "Try again";
      setEmgConflictMsg(msg);
      toast({
        title: "Could not send OTP",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setEmgOtpBusy(false);
    }
  };

  const verifyEmergencyOtp = async (code?: string) => {
    const otp = (code ?? emgOtp).replace(/\D/g, "");
    const digits = form.emergency_contact.replace(/\D/g, "");
    if (otp.length !== 6 || digits.length < 10 || emgVerifyBusy) return;
    setEmgVerifyBusy(true);
    try {
      const res = await onboardingService.verifyEmergencyOtp(digits.slice(-10), otp);
      const verifiedAt =
        (res?.data?.verified_at as string | undefined) || new Date().toISOString();
      setForm((p) => ({
        ...p,
        emergency_contact_verified: true,
        emergency_contact_verified_at: verifiedAt,
      }));
      setVerifiedEmgBaseline(digits.slice(-10));
      setVerifiedEmgBaselineAt(verifiedAt);
      setEmgOtpSent(false);
      setEmgOtp("");
      setEmgCooldown(0);
      toast({ title: "Emergency number verified" });
    } catch (err) {
      toast({
        title: "OTP incorrect",
        description: err instanceof Error ? err.message : "Check the code and try again",
        variant: "destructive",
      });
    } finally {
      setEmgVerifyBusy(false);
    }
  };

  const sendContactEmailOtp = async () => {
    const email = form.contact_email.trim().toLowerCase();
    if (
      !isValidContactEmail(email) ||
      mailOtpBusy ||
      mailCooldown > 0 ||
      form.contact_email_verified
    ) {
      return;
    }
    setMailConflictMsg(null);
    // Optimistic: show OTP fields immediately while SMTP runs in background.
    setMailOtpBusy(true);
    setMailOtpSent(true);
    setMailOtp("");
    setMailCooldown(30);
    setForm((p) => ({ ...p, contact_email_verified: false }));
    try {
      await onboardingService.sendContactEmailOtp(email);
      toast({
        title: "OTP sent to email",
        description: `Check inbox for ${email}`,
      });
    } catch (err) {
      setMailOtpSent(false);
      setMailCooldown(0);
      const msg = err instanceof Error ? err.message : "Try again";
      setMailConflictMsg(msg);
      toast({
        title: "Could not send email OTP",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setMailOtpBusy(false);
    }
  };

  const verifyContactEmailOtp = async (code?: string) => {
    const otp = (code ?? mailOtp).replace(/\D/g, "");
    const email = form.contact_email.trim().toLowerCase();
    if (otp.length !== 6 || !isValidContactEmail(email) || mailVerifyBusy) return;
    setMailVerifyBusy(true);
    try {
      const res = await onboardingService.verifyContactEmailOtp(email, otp);
      const verifiedAt =
        (res?.data?.verified_at as string | undefined) || new Date().toISOString();
      setForm((p) => ({
        ...p,
        contact_email_verified: true,
        contact_email_verified_at: verifiedAt,
      }));
      setVerifiedMailBaseline(email);
      setVerifiedMailBaselineAt(verifiedAt);
      setMailOtpSent(false);
      setMailOtp("");
      setMailCooldown(0);
      toast({ title: "Contact email verified" });
    } catch (err) {
      toast({
        title: "OTP incorrect",
        description: err instanceof Error ? err.message : "Check the code and try again",
        variant: "destructive",
      });
    } finally {
      setMailVerifyBusy(false);
    }
  };

  const step1Valid = useMemo(() => {
    const hasPhoto = !!form.profile_photo || (editMode && !!existingAvatarUrl);
    return (
      hasPhoto &&
      form.emergency_contact.replace(/\D/g, "").length >= 10 &&
      !emgConflictMsg &&
      form.emergency_contact_verified &&
      isValidContactEmail(form.contact_email) &&
      !mailConflictMsg &&
      form.contact_email_verified &&
      !!form.date_of_birth &&
      !!form.gender &&
      !!form.marital_status &&
      form.house_name_number.trim() &&
      form.city.trim() &&
      form.pin_code.replace(/\D/g, "").length >= 6 &&
      form.district.trim() &&
      form.state.trim()
    );
  }, [form, editMode, existingAvatarUrl, emgConflictMsg, mailConflictMsg]);

  const step2Valid = useMemo(() => {
    const hasAadhaar = !!form.aadhaar_file || (editMode && hasExistingAadhaar);
    return (
      form.aadhaar_number.replace(/\D/g, "").length === 12 &&
      hasAadhaar &&
      !fileErrors.aadhaar_file &&
      !fileErrors.pan_file
    );
  }, [form, fileErrors, editMode, hasExistingAadhaar]);
  const step3Valid = useMemo(() => {
    return (
      form.account_holder_name.trim() &&
      form.bank_name.trim() &&
      form.account_number.replace(/\D/g, "").length >= 9 &&
      isValidIfscFormat(normalizeIfsc(form.ifsc_code)) &&
      form.branch_name.trim() &&
      form.account_type.trim()
    );
  }, [form]);

  const passwordValid =
    !mustSetPassword ||
    (password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword);

  const passwordError = useMemo(() => {
    if (!mustSetPassword) return null;
    if (!password && !confirmPassword) return null;
    if (password.length > 0 && password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (confirmPassword.length > 0 && password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  }, [mustSetPassword, password, confirmPassword]);

  const step5Valid =
    form.terms_accepted && form.privacy_accepted && passwordValid;

  const districtOptions = useMemo(
    () => districtsForState(form.state),
    [form.state]
  );

  const canNext = [!!step1Valid, step2Valid, step3Valid, true, step5Valid][step];

  /** Why: Users need a clear reason when Continue stays disabled on long address forms. */
  const nextBlockedHint = useMemo(() => {
    if (canNext || step !== 0) return null;
    if (!(form.profile_photo || (editMode && existingAvatarUrl))) {
      return "Upload a profile photo to continue";
    }
    if (form.emergency_contact.replace(/\D/g, "").length < 10) {
      return "Enter a 10-digit emergency WhatsApp number";
    }
    if (emgConflictMsg) return emgConflictMsg;
    if (!form.emergency_contact_verified) return "Verify emergency WhatsApp with OTP";
    if (!isValidContactEmail(form.contact_email)) return "Enter a valid contact email";
    if (mailConflictMsg) return mailConflictMsg;
    if (!form.contact_email_verified) return "Verify contact email with OTP";
    if (!form.date_of_birth) return "Enter your date of birth";
    if (!form.gender) return "Select your gender";
    if (!form.marital_status) return "Select your marital status";
    if (!form.state.trim()) return "Select your state";
    if (!form.district.trim()) return "Select your district";
    if (!form.city.trim()) return "Enter your city";
    if (!form.house_name_number.trim()) return "Enter house name / number";
    if (form.pin_code.replace(/\D/g, "").length < 6) return "Enter a 6-digit PIN code";
    return "Complete all required address fields";
  }, [
    canNext,
    step,
    form,
    editMode,
    existingAvatarUrl,
    emgConflictMsg,
    mailConflictMsg,
  ]);

  const handleStateChange = (state: string) => {
    setForm((prev) => {
      const nextDistricts = districtsForState(state);
      const districtStillValid = nextDistricts.includes(prev.district);
      return {
        ...prev,
        state,
        district: districtStillValid ? prev.district : "",
      };
    });
  };

  const formatVerifiedAt = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const captureWfh = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setWfhBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setField("wfh_latitude", pos.coords.latitude);
        setField("wfh_longitude", pos.coords.longitude);
        setWfhBusy(false);
        toast({ title: "WFH location captured" });
      },
      () => {
        setWfhBusy(false);
        toast({
          title: "Could not capture location",
          description: "You can skip WFH location and continue.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const requestLocation = () =>
    new Promise<PermStatus>((resolve) => {
      if (!navigator.geolocation) {
        resolve("denied");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => resolve("granted"),
        () => resolve("denied"),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
      );
    });

  const requestMic = async (): Promise<PermStatus> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return "denied";
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return "granted";
    } catch {
      return "denied";
    }
  };

  const requestNotifications = async (): Promise<PermStatus> => {
    if (!("Notification" in window)) return "denied";
    try {
      const result = await Notification.requestPermission();
      return result === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  };

  /**
   * Why: One user gesture (Meet-style) starts location + mic + notifications together.
   * No sample PDF download here — that was spamming the browser download shelf on every Allow/refresh.
   */
  const requestAllPermissions = async () => {
    if (permBusy) return;
    setPermBusy(true);
    try {
      // Kick off from the same click — do not await between starts.
      const locationP = requestLocation();
      const micP = requestMic();
      const notificationsP = requestNotifications();

      const [location, mic, notifications] = await Promise.all([
        locationP,
        micP,
        notificationsP,
      ]);

      setPerms({
        location,
        mic,
        notifications,
      });

      const grantedCount = [location, mic, notifications].filter(
        (s) => s === "granted"
      ).length;
      if (grantedCount === 3) {
        toast({ title: "All permissions ready" });
      } else if (grantedCount > 0) {
        toast({
          title: "Some permissions updated",
          description: "You can continue anyway, or tap Allow again for denied ones.",
        });
      } else {
        toast({
          title: "Permissions not granted",
          description: "You can continue and enable them later in browser settings.",
          variant: "destructive",
        });
      }
    } finally {
      setPermBusy(false);
    }
  };

  // Prefill status when opening the permissions step (no prompts).
  useEffect(() => {
    if (step !== 3 || typeof window === "undefined") return;

    const sync = async () => {
      let notifications: PermStatus = "idle";
      if ("Notification" in window) {
        notifications =
          Notification.permission === "granted"
            ? "granted"
            : Notification.permission === "denied"
              ? "denied"
              : "idle";
      }

      let location: PermStatus = "idle";
      let mic: PermStatus = "idle";
      try {
        const loc = await navigator.permissions?.query({
          name: "geolocation" as PermissionName,
        });
        if (loc?.state === "granted") location = "granted";
        if (loc?.state === "denied") location = "denied";
      } catch {
        /* Permissions API not available */
      }
      try {
        const micQ = await navigator.permissions?.query({
          name: "microphone" as PermissionName,
        });
        if (micQ?.state === "granted") mic = "granted";
        if (micQ?.state === "denied") mic = "denied";
      } catch {
        /* ignore */
      }

      setPerms((prev) => ({
        location: prev.location === "granted" ? "granted" : location,
        mic: prev.mic === "granted" ? "granted" : mic,
        notifications:
          prev.notifications === "granted" ? "granted" : notifications,
      }));
    };

    void sync();
  }, [step]);

  const handleFinalize = async () => {
    const hasPhoto = !!form.profile_photo || (editMode && !!existingAvatarUrl);
    const hasAadhaar = !!form.aadhaar_file || (editMode && hasExistingAadhaar);
    if (loading || !step5Valid || !hasPhoto || !hasAadhaar) {
      return;
    }
    if (mustSetPassword && (!passwordValid || password !== confirmPassword)) {
      toast({
        title: "Set your password",
        description: "Enter a new password and confirm it before finishing.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      emergency_contact: form.emergency_contact,
      contact_email: form.contact_email.trim().toLowerCase(),
      emergency_contact_verified_at: form.emergency_contact_verified
        ? form.emergency_contact_verified_at || new Date().toISOString()
        : null,
      contact_email_verified_at: form.contact_email_verified
        ? form.contact_email_verified_at || new Date().toISOString()
        : null,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      marital_status: form.marital_status,
      house_name_number: form.house_name_number,
      landmark: form.landmark,
      city: form.city,
      post_office: form.post_office,
      pin_code: form.pin_code,
      district: form.district,
      state: form.state,
      country: form.country || "India",
      wfh_latitude: form.wfh_latitude,
      wfh_longitude: form.wfh_longitude,
      aadhaar_number: form.aadhaar_number,
      pan_number: form.pan_number,
      account_holder_name: form.account_holder_name,
      bank_name: form.bank_name,
      account_number: form.account_number,
      ifsc_code: form.ifsc_code,
      branch_name: form.branch_name,
      account_type: form.account_type,
      upi_id: form.upi_id,
      upi_linked_phone: form.upi_linked_phone,
      terms_accepted: form.terms_accepted,
      privacy_accepted: form.privacy_accepted,
      terms_accepted_at: form.terms_accepted_at,
      privacy_accepted_at: form.privacy_accepted_at,
      ...(mustSetPassword
        ? { password, confirm_password: confirmPassword }
        : {}),
      // Why: Only send new blobs — re-uploading unchanged scans made Save crawl.
      aadhaar_file: form.aadhaar_file || null,
      pan_file: form.pan_file || null,
      profile_photo: form.profile_photo || null,
    };

    setLoading(true);

    // Why: Edit mode closes immediately so Save feels instant; request continues in background.
    if (editMode) {
      const cleaned = new URLSearchParams(searchParams);
      cleaned.delete("onboarding");
      setSearchParams(cleaned, { replace: true });
      onOpenChange?.(false);
      toast({
        title: "Saving changes…",
        description: "Updating your employee records.",
      });

      try {
        const result = await onboardingService.submit(payload);
        setForm(INITIAL);
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setStep(0);
        setHydrated(false);
        setHasExistingAadhaar(false);
        setHasExistingPan(false);
        setExistingAvatarUrl(null);
        const avatar =
          (result?.data?.avatar as string | undefined) ||
          (result?.data?.user?.avatar as string | undefined) ||
          null;
        onCompleted({ avatar, updated: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not save onboarding changes";
        toast({
          title: "Update failed",
          description: message,
          variant: "destructive",
        });
        // Re-open review so the employee can retry without re-entering everything.
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("onboarding", "legal");
            return next;
          },
          { replace: false }
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const result = await onboardingService.submit(payload);
      await clearOnboardingDraft(userId);
      const cleaned = new URLSearchParams(searchParams);
      cleaned.delete("onboarding");
      setSearchParams(cleaned, { replace: true });
      setForm(INITIAL);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setStep(0);
      setHydrated(false);
      setHasExistingAadhaar(false);
      setHasExistingPan(false);
      setExistingAvatarUrl(null);
      const avatar =
        (result?.data?.avatar as string | undefined) ||
        (result?.data?.user?.avatar as string | undefined) ||
        null;
      onCompleted({ avatar, updated: false });
      onOpenChange?.(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not complete onboarding";
      toast({
        title: "Onboarding failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allPermsGranted =
    perms.location === "granted" &&
    perms.mic === "granted" &&
    perms.notifications === "granted";

  const PermStatusChip = ({
    icon: Icon,
    label,
    status,
  }: {
    icon: typeof MapPin;
    label: string;
    status: PermStatus;
  }) => (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium min-w-0",
        status === "granted" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        status === "denied" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        status === "idle" && "border-border/60 bg-muted/40 text-muted-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {status === "granted" ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : status === "denied" ? (
        <XCircle className="h-3.5 w-3.5 shrink-0" />
      ) : null}
    </div>
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!editMode) return;
          if (!next) closeWizard();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[980px] w-[calc(100vw-0.75rem)] sm:w-[calc(100vw-1.25rem)] max-h-[min(92dvh,920px)] overflow-hidden rounded-2xl p-0 gap-0 border-border/50 shadow-2xl bg-background z-[1000] !flex flex-col"
          overlayClassName="z-[1000]"
          onInteractOutside={(e) => {
            // Select/Popover portals render outside Dialog — don't treat as dismiss.
            const target = e.target as HTMLElement | null;
            if (
              target?.closest?.(
                "[data-radix-select-content], [data-radix-popper-content-wrapper]"
              )
            ) {
              e.preventDefault();
              return;
            }
            if (!editMode) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (!editMode) e.preventDefault();
          }}
        >
          <DialogHeader className="relative shrink-0 px-4 sm:px-8 pt-4 sm:pt-7 pb-3 sm:pb-5 border-b border-border/50 text-left space-y-0 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent" />
            <div className="relative space-y-3 sm:space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                    {editMode ? "Update employee records" : "Employee onboarding"}
                  </p>
                  <DialogTitle className="text-xl sm:text-[1.75rem] font-semibold tracking-tight text-foreground">
                    {editMode ? "Edit onboarding details" : "Set up your workspace"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground max-w-xl leading-relaxed hidden sm:block">
                    {editMode
                      ? "Update address, documents, banking, and permissions. Saving sends your profile back for HR verification."
                      : "A short guided setup for address, documents, banking, and permissions. Required before you can enter BugRicer."}
                  </DialogDescription>
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-1.5 sm:px-3.5 sm:py-2 text-right">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Step</p>
                    <p className="text-base sm:text-lg font-semibold tabular-nums text-foreground">
                      {step + 1}
                      <span className="text-muted-foreground font-normal text-sm"> / {STEPS.length}</span>
                    </p>
                  </div>
                  {editMode ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-xl h-10 w-10"
                      aria-label="Close"
                      disabled={loading}
                      onClick={closeWizard}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {STEPS.map((item, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <div key={item.label} className="min-w-0 flex flex-col gap-1.5 sm:gap-2">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-colors",
                          done || active ? "bg-primary" : "bg-muted"
                        )}
                      />
                      <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shrink-0",
                            done && "bg-primary text-primary-foreground",
                            active && "bg-primary/15 text-primary ring-1 ring-primary/30",
                            !done && !active && "bg-muted text-muted-foreground"
                          )}
                        >
                          {done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-xs font-medium truncate",
                              active ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {item.label}
                          </p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          "sm:hidden text-[10px] truncate text-center",
                          active ? "text-foreground font-medium" : "text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogHeader>

          <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto flex-1 min-h-0 scrollbar-thin overscroll-contain">
            {step === 0 && (
              <div className="grid grid-cols-12 gap-x-5 gap-y-5">
                <div className="col-span-12 mb-1">
                  <h2 className="text-base font-semibold tracking-tight">Address & reachability</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Used for HR records and emergency contact.
                  </p>
                </div>

                <div className="col-span-12 rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/5 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                    <div className="relative shrink-0 mx-auto sm:mx-0">
                      <div
                        className={cn(
                          "h-24 w-24 rounded-full overflow-hidden border-2 border-dashed border-border/80 bg-muted/40 flex items-center justify-center",
                          (form.profile_photo || existingAvatarUrl) && "border-solid border-primary/50"
                        )}
                      >
                        {photoPreviewUrl ? (
                          <img
                            src={photoPreviewUrl}
                            alt="Profile photo preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
                      <div>
                        <p className="text-[13px] font-medium text-foreground/90">
                          Profile photo <span className="text-primary/80">*</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {editMode && existingAvatarUrl && !form.profile_photo
                            ? "Current photo on file · replace to upload a new crop"
                            : "Square crop required · JPG / PNG / WebP · used across BugRicer"}
                        </p>
                        {fileErrors.profile_photo ? (
                          <p className="text-xs text-destructive mt-1">{fileErrors.profile_photo}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl h-9"
                          onClick={openProfilePhotoPicker}
                        >
                          {form.profile_photo || existingAvatarUrl ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                              Replace
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              Upload photo
                            </>
                          )}
                        </Button>
                        {form.profile_photo ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-xl h-9 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setForm((p) => ({ ...p, profile_photo: null }));
                              if (!editMode || !existingAvatarUrl) {
                                setFileErrors((p) => ({
                                  ...p,
                                  profile_photo: "Profile photo is required",
                                }));
                              } else {
                                setFileErrors((p) => ({ ...p, profile_photo: undefined }));
                              }
                              if (photoInputRef.current) photoInputRef.current.value = "";
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Remove
                          </Button>
                        ) : null}
                      </div>                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const next = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          onProfilePhotoPicked(next);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <FieldShell label="Emergency mobile" required className="col-span-12">
                  <div className="flex flex-col gap-2.5 min-w-0">
                    <div className="relative min-w-0">
                      <Input
                        className={cn(
                          fieldClass,
                          "w-full",
                          form.emergency_contact_verified && "pr-10 border-emerald-500/50",
                          emgConflictMsg && "border-destructive/60"
                        )}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit WhatsApp number"
                        value={form.emergency_contact}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, "").slice(0, 10);
                          const matchesBaseline =
                            verifiedEmgBaseline != null && next === verifiedEmgBaseline;
                          setEmgConflictMsg(null);
                          setForm((prev) => ({
                            ...prev,
                            emergency_contact: next,
                            emergency_contact_verified: matchesBaseline,
                            emergency_contact_verified_at: matchesBaseline
                              ? verifiedEmgBaselineAt || prev.emergency_contact_verified_at
                              : null,
                          }));
                          if (next !== form.emergency_contact) {
                            setEmgOtpSent(false);
                            setEmgOtp("");
                          }
                        }}
                      />
                      {form.emergency_contact_verified ? (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      ) : null}
                    </div>
                    {emgConflictMsg ? (
                      <p className="text-xs text-destructive">{emgConflictMsg}</p>
                    ) : null}

                    {form.emergency_contact_verified ? (
                      <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            WhatsApp number verified
                          </p>
                        </div>
                        {formatVerifiedAt(form.emergency_contact_verified_at) ? (
                          <p className="text-[11px] text-muted-foreground pl-6">
                            Verified {formatVerifiedAt(form.emergency_contact_verified_at)}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground pl-6">
                          Change the number to verify again with OTP
                        </p>
                      </div>
                    ) : !emgOtpSent ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-11 w-full sm:w-auto sm:self-start"
                        disabled={
                          form.emergency_contact.replace(/\D/g, "").length < 10 ||
                          !!emgConflictMsg ||
                          emgOtpBusy
                        }
                        onClick={() => void sendEmergencyOtp()}
                      >
                        {emgOtpBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <MessageCircle className="h-4 w-4 mr-2" />
                        )}
                        Send WhatsApp OTP
                      </Button>
                    ) : (
                      <div className="grid grid-cols-12 gap-2.5 min-w-0">
                        <div className="col-span-12 min-w-0">
                          <OtpDigitBoxes
                            value={emgOtp}
                            autoFocus
                            disabled={emgVerifyBusy}
                            onChange={setEmgOtp}
                            onComplete={(code) => void verifyEmergencyOtp(code)}
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-6">
                          <Button
                            type="button"
                            className="rounded-xl h-11 w-full"
                            disabled={emgOtp.length !== 6 || emgVerifyBusy}
                            onClick={() => void verifyEmergencyOtp()}
                          >
                            {emgVerifyBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Verify OTP
                          </Button>
                        </div>
                        <div className="col-span-12 sm:col-span-6">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-11 w-full"
                            disabled={emgOtpBusy || emgCooldown > 0}
                            onClick={() => void sendEmergencyOtp()}
                          >
                            {emgOtpBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            {emgCooldown > 0 ? `Resend in ${emgCooldown}s` : "Resend OTP"}
                          </Button>
                        </div>
                        <p className="col-span-12 text-[11px] text-muted-foreground">
                          OTP sent on WhatsApp · enter the 6-digit code
                        </p>
                      </div>
                    )}

                    {!form.emergency_contact_verified && !emgOtpSent ? (
                      <p className="text-[11px] text-muted-foreground">
                        Must be WhatsApp-enabled — your own number is fine; another employee’s is not
                      </p>
                    ) : null}
                  </div>
                </FieldShell>

                <FieldShell label="Contact email" required className="col-span-12">
                  <div className="flex flex-col gap-2.5 min-w-0">
                    <div className="relative min-w-0">
                      <Input
                        className={cn(
                          fieldClass,
                          "w-full",
                          form.contact_email_verified && "pr-10 border-emerald-500/50",
                          mailConflictMsg && "border-destructive/60"
                        )}
                        type="email"
                        maxLength={150}
                        placeholder="name@example.com"
                        value={form.contact_email}
                        onChange={(e) => {
                          const next = e.target.value.slice(0, 150);
                          const normalized = next.trim().toLowerCase();
                          const matchesBaseline =
                            verifiedMailBaseline != null &&
                            normalized === verifiedMailBaseline;
                          setMailConflictMsg(null);
                          setForm((prev) => ({
                            ...prev,
                            contact_email: next,
                            contact_email_verified: matchesBaseline,
                            contact_email_verified_at: matchesBaseline
                              ? verifiedMailBaselineAt || prev.contact_email_verified_at
                              : null,
                          }));
                          if (next !== form.contact_email) {
                            setMailOtpSent(false);
                            setMailOtp("");
                          }
                        }}
                      />
                      {form.contact_email_verified ? (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      ) : null}
                    </div>
                    {mailConflictMsg ? (
                      <p className="text-xs text-destructive">{mailConflictMsg}</p>
                    ) : null}

                    {form.contact_email_verified ? (
                      <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            Contact email verified
                          </p>
                        </div>
                        {formatVerifiedAt(form.contact_email_verified_at) ? (
                          <p className="text-[11px] text-muted-foreground pl-6">
                            Verified {formatVerifiedAt(form.contact_email_verified_at)}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground pl-6">
                          Change the email to verify again with OTP
                        </p>
                      </div>
                    ) : !mailOtpSent ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-11 w-full sm:w-auto sm:self-start"
                        disabled={
                          !isValidContactEmail(form.contact_email) ||
                          !!mailConflictMsg ||
                          mailOtpBusy
                        }
                        onClick={() => void sendContactEmailOtp()}
                      >
                        {mailOtpBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        Send email OTP
                      </Button>
                    ) : (
                      <div className="grid grid-cols-12 gap-2.5 min-w-0">
                        <div className="col-span-12 min-w-0">
                          <OtpDigitBoxes
                            value={mailOtp}
                            autoFocus
                            disabled={mailVerifyBusy}
                            onChange={setMailOtp}
                            onComplete={(code) => void verifyContactEmailOtp(code)}
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-6">
                          <Button
                            type="button"
                            className="rounded-xl h-11 w-full"
                            disabled={mailOtp.length !== 6 || mailVerifyBusy}
                            onClick={() => void verifyContactEmailOtp()}
                          >
                            {mailVerifyBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Verify OTP
                          </Button>
                        </div>
                        <div className="col-span-12 sm:col-span-6">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-11 w-full"
                            disabled={mailOtpBusy || mailCooldown > 0}
                            onClick={() => void sendContactEmailOtp()}
                          >
                            {mailOtpBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            {mailCooldown > 0 ? `Resend in ${mailCooldown}s` : "Resend OTP"}
                          </Button>
                        </div>
                        <p className="col-span-12 text-[11px] text-muted-foreground">
                          OTP sent to inbox · enter the 6-digit code
                        </p>
                      </div>
                    )}

                    {!form.contact_email_verified && !mailOtpSent ? (
                      <p className="text-[11px] text-muted-foreground">
                        Use your email or another personal address — not one already used by another employee
                      </p>
                    ) : null}
                  </div>
                </FieldShell>

                <FieldShell label="Date of birth" required className="col-span-12 md:col-span-4">
                  <DatePicker
                    value={form.date_of_birth || ""}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        date_of_birth: (v || "").slice(0, 10),
                      }))
                    }
                    placeholder="Pick date of birth"
                    className={cn(fieldClass, "w-full")}
                    disableFuture
                    showToday={false}
                    fromYear={new Date().getFullYear() - 100}
                    toYear={new Date().getFullYear()}
                  />
                </FieldShell>

                <FieldShell label="Gender" required className="col-span-12 md:col-span-4">
                  <Select
                    value={form.gender || undefined}
                    onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))}
                  >
                    <SelectTrigger className={cn(fieldClass, "w-full")}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl z-[1100]">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldShell>

                <FieldShell label="Marital status" required className="col-span-12 md:col-span-4">
                  <Select
                    value={form.marital_status || undefined}
                    onValueChange={(v) => setForm((p) => ({ ...p, marital_status: v }))}
                  >
                    <SelectTrigger className={cn(fieldClass, "w-full")}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl z-[1100]">
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldShell>

                <FieldShell label="State" required className="md:col-span-4">
                  <Select value={form.state || undefined} onValueChange={handleStateChange}>
                    <SelectTrigger className={cn(fieldClass, "w-full")}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    {/* Why: Dialog uses z-[1000]; default Select z-50 renders under the modal. */}
                    <SelectContent
                      position="popper"
                      className="max-h-64 rounded-xl z-[1100]"
                      searchPlaceholder="Search state..."
                    >
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <FieldShell label="District" required className="md:col-span-4">
                  <Select
                    value={form.district || undefined}
                    onValueChange={(v) => setField("district", v)}
                    disabled={!form.state || districtOptions.length === 0}
                  >
                    <SelectTrigger className={cn(fieldClass, "w-full")}>
                      <SelectValue
                        placeholder={
                          form.state ? "Select district" : "Select state first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="max-h-64 rounded-xl z-[1100]"
                      searchPlaceholder="Search district..."
                    >
                      {districtOptions.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <FieldShell label="City" required className="md:col-span-4">
                  <Input
                    className={fieldClass}
                    maxLength={100}
                    placeholder="City / town"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value.slice(0, 100))}
                  />
                </FieldShell>

                <FieldShell label="Landmark" className="md:col-span-6">
                  <Input
                    className={fieldClass}
                    maxLength={200}
                    placeholder="Nearby landmark"
                    value={form.landmark}
                    onChange={(e) => setField("landmark", e.target.value.slice(0, 200))}
                  />
                </FieldShell>
                <FieldShell label="House name / number" required className="md:col-span-6">
                  <Input
                    className={fieldClass}
                    maxLength={150}
                    placeholder="House / flat / building"
                    value={form.house_name_number}
                    onChange={(e) => setField("house_name_number", e.target.value.slice(0, 150))}
                  />
                </FieldShell>

                <FieldShell label="PIN code" required className="md:col-span-4">
                  <div className="relative">
                    <Input
                      className={cn(fieldClass, pinLookupBusy && "pr-10")}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit PIN"
                      value={form.pin_code}
                      onChange={(e) => handlePinChange(e.target.value)}
                    />
                    {pinLookupBusy ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                  {pinLookupHint ? (
                    <p className="text-[11px] text-muted-foreground mt-1">{pinLookupHint}</p>
                  ) : null}
                </FieldShell>
                <FieldShell label="Post office" className="md:col-span-8">
                  {pinPostOffices.length > 0 ? (
                    <Select
                      key={`po-${form.pin_code}-${pinPostOffices.join("|")}`}
                      value={
                        pinPostOffices.includes(form.post_office)
                          ? form.post_office
                          : undefined
                      }
                      onValueChange={(v) => {
                        setField("post_office", v);
                        setPinLookupHint(`Selected · ${v}`);
                      }}
                    >
                      <SelectTrigger className={cn(fieldClass, "w-full")}>
                        <SelectValue placeholder="Select post office" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="max-h-64 rounded-xl z-[1100]"
                        searchPlaceholder="Search post office..."
                      >
                        {pinPostOffices.map((office) => (
                          <SelectItem key={office} value={office}>
                            {office}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className={fieldClass}
                      maxLength={100}
                      value={form.post_office}
                      onChange={(e) =>
                        setField("post_office", e.target.value.slice(0, 100))
                      }
                      placeholder="Enter PIN to load"
                    />
                  )}
                </FieldShell>

                <div className="col-span-12 rounded-2xl border border-border/60 bg-gradient-to-br from-sky-500/[0.06] via-background to-background p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <div>
                        <h3 className="font-semibold tracking-tight text-foreground">
                          WFH location
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            Optional
                          </span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          Save a home pin for future work-from-home verification. Capture GPS or pick on the map.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                          type="button"
                          className="rounded-xl h-10"
                          onClick={captureWfh}
                          disabled={wfhBusy}
                        >
                          {wfhBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <MapPin className="h-4 w-4 mr-2" />
                          )}
                          Capture current
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl h-10 bg-background/70"
                          onClick={() => setWfhMapOpen(true)}
                        >
                          <Map className="h-4 w-4 mr-2" />
                          Choose from map
                        </Button>
                        {form.wfh_latitude != null && form.wfh_longitude != null ? (
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
                            {form.wfh_latitude.toFixed(6)}, {form.wfh_longitude.toFixed(6)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No location set yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-12 gap-x-5 gap-y-5">
                <div className="col-span-12 mb-1">
                  <h2 className="text-base font-semibold tracking-tight">Statutory verification</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload clear scans. Files stay private to you and admins.
                  </p>
                </div>
                <FieldShell label="Aadhaar number" required>
                  <Input
                    className={fieldClass}
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="12 digits"
                    value={form.aadhaar_number}
                    onChange={(e) =>
                      setField("aadhaar_number", e.target.value.replace(/\D/g, "").slice(0, 12))
                    }
                  />
                </FieldShell>
                <FieldShell label="PAN number" hint="optional">
                  <Input
                    className={cn(fieldClass, "uppercase")}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={form.pan_number}
                    onChange={(e) =>
                      setField(
                        "pan_number",
                        e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10)
                      )
                    }
                  />
                </FieldShell>
                <FileDropZone
                  label="Aadhaar scan"
                  required
                  file={form.aadhaar_file}
                  existingLabel={
                    editMode && hasExistingAadhaar ? "Aadhaar scan on file" : null
                  }
                  error={fileErrors.aadhaar_file}
                  onSelect={(file, error) => {
                    setForm((p) => ({ ...p, aadhaar_file: file }));
                    setFileErrors((p) => ({ ...p, aadhaar_file: error }));
                  }}
                />
                <FileDropZone
                  label="PAN scan"
                  file={form.pan_file}
                  existingLabel={
                    editMode && hasExistingPan ? "PAN scan on file" : null
                  }
                  error={fileErrors.pan_file}
                  onSelect={(file, error) => {
                    setForm((p) => ({ ...p, pan_file: file }));
                    setFileErrors((p) => ({ ...p, pan_file: error }));
                  }}
                />              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-12 gap-x-5 gap-y-5">
                <div className="col-span-12 mb-1">
                  <h2 className="text-base font-semibold tracking-tight">Banking details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter account number and IFSC — bank, branch, and type fill automatically.
                  </p>
                </div>

                <FieldShell label="Account holder name" required className="md:col-span-12">
                  <Input
                    className={fieldClass}
                    maxLength={150}
                    placeholder="Name as on the bank passbook"
                    value={form.account_holder_name}
                    onChange={(e) =>
                      setField("account_holder_name", e.target.value.slice(0, 150))
                    }
                  />
                  {employeeName.trim() &&
                  form.account_holder_name.trim() === employeeName.trim() ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Prefilled from your BugRicer profile — edit if the bank name differs
                    </p>
                  ) : null}
                </FieldShell>

                <FieldShell label="Account number" required>
                  <Input
                    className={fieldClass}
                    inputMode="numeric"
                    maxLength={18}
                    placeholder="9–18 digits"
                    value={form.account_number}
                    onChange={(e) =>
                      setField(
                        "account_number",
                        e.target.value.replace(/\D/g, "").slice(0, 18)
                      )
                    }
                  />
                  {form.account_number.length > 0 && form.account_number.length < 9 ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Most Indian accounts are 9–18 digits
                    </p>
                  ) : null}
                </FieldShell>

                <FieldShell label="IFSC code" required>
                  <div className="relative">
                    <Input
                      className={cn(fieldClass, "uppercase pr-10")}
                      maxLength={11}
                      placeholder="SBIN0001234"
                      value={form.ifsc_code}
                      onChange={(e) => handleIfscChange(e.target.value)}
                    />
                    {ifscLookupBusy ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                  {ifscLookupHint ? (
                    <p className="text-[11px] text-muted-foreground mt-1">{ifscLookupHint}</p>
                  ) : null}
                </FieldShell>

                {ifscMeta ? (
                  <div className="col-span-12 rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3">
                    <p className="text-xs font-medium text-primary/90">Branch match</p>
                    <p className="text-sm text-foreground mt-0.5 break-words">{ifscMeta}</p>
                  </div>
                ) : null}

                <FieldShell label="Bank name" required>
                  <Input
                    className={fieldClass}
                    maxLength={150}
                    placeholder="Fills from IFSC"
                    value={form.bank_name}
                    onChange={(e) => setField("bank_name", e.target.value.slice(0, 150))}
                  />
                </FieldShell>

                <FieldShell label="Branch name" required>
                  <Input
                    className={fieldClass}
                    maxLength={150}
                    placeholder="Fills from IFSC"
                    value={form.branch_name}
                    onChange={(e) => setField("branch_name", e.target.value.slice(0, 150))}
                  />
                </FieldShell>

                <FieldShell label="Account type" required>
                  <Select
                    value={form.account_type}
                    onValueChange={(v) => setField("account_type", v)}
                  >
                    <SelectTrigger className={cn(fieldClass, "w-full")}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="rounded-xl z-[1100]"
                      searchable={false}
                    >
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Salary is selected by default for payroll accounts
                  </p>
                </FieldShell>

                <FieldShell label="UPI ID" hint="optional">
                  <Input
                    className={fieldClass}
                    maxLength={100}
                    placeholder="name@upi"
                    value={form.upi_id}
                    onChange={(e) => setField("upi_id", e.target.value.slice(0, 100))}
                  />
                </FieldShell>
                <FieldShell label="UPI linked phone" hint="optional">
                  <Input
                    className={fieldClass}
                    inputMode="numeric"
                    maxLength={15}
                    value={form.upi_linked_phone}
                    onChange={(e) =>
                      setField(
                        "upi_linked_phone",
                        e.target.value.replace(/\D/g, "").slice(0, 15)
                      )
                    }
                  />
                </FieldShell>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-12 gap-4 sm:gap-5">
                <div className="col-span-12">
                  <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-primary/[0.07] via-card/80 to-card/80 p-6 sm:p-8">
                    <div className="flex flex-col items-center text-center gap-5 max-w-lg mx-auto">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-sky-500" />
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                          <Mic className="h-5 w-5 text-rose-500" />
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                          <Bell className="h-5 w-5 text-violet-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                          Do you want BugRicer to use location, microphone, and notifications?
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          One tap asks your browser for everything we need for check-ins, voice notes, and alerts.
                          You can continue even if something is denied.
                        </p>
                      </div>

                      <Button
                        type="button"
                        className="rounded-2xl h-12 w-full sm:w-auto sm:min-w-[320px] text-base px-6"
                        disabled={permBusy || allPermsGranted}
                        onClick={() => void requestAllPermissions()}
                      >
                        {permBusy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Waiting for browser…
                          </>
                        ) : allPermsGranted ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            All permissions ready
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4 mr-2" />
                            Allow location, mic & notifications
                          </>
                        )}
                      </Button>

                      <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                        <PermStatusChip
                          icon={MapPin}
                          label="Location"
                          status={perms.location}
                        />
                        <PermStatusChip icon={Mic} label="Microphone" status={perms.mic} />
                        <PermStatusChip
                          icon={Bell}
                          label="Notifications"
                          status={perms.notifications}
                        />
                      </div>

                      {!allPermsGranted ? (
                        <p className="text-[11px] text-muted-foreground">
                          Browser may show a few prompts in a row — allow each once.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-12 gap-4 sm:gap-5">
                <div className="col-span-12 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.10] via-card/90 to-card/70 p-5 sm:p-6 shadow-sm shadow-black/5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted/40 flex items-center justify-center shadow-inner">
                        {photoPreviewUrl ? (
                          <img
                            src={photoPreviewUrl}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Camera className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      {form.emergency_contact_verified && form.contact_email_verified ? (
                        <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-background shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
                        Review before you finish
                      </p>
                      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                        Onboarding summary
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                        Confirm every detail below. Verified contacts show date and time. Use Edit to jump back, then accept legal terms.
                      </p>
                    </div>
                  </div>
                </div>

                <SummaryBlock
                  icon={MapPin}
                  title="Address & contacts"
                  subtitle="Verified reach details for attendance and emergencies"
                  onEdit={() => void goToStep(0)}
                >
                  <SummarySection title="Verified contacts">
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem
                        label="Emergency mobile"
                        value={form.emergency_contact}
                        status={form.emergency_contact_verified ? "verified" : "pending"}
                        statusDetail={
                          form.emergency_contact_verified
                            ? formatVerifiedAt(form.emergency_contact_verified_at)
                              ? `Verified on ${formatVerifiedAt(form.emergency_contact_verified_at)}`
                              : "WhatsApp OTP confirmed"
                            : "WhatsApp OTP still required"
                        }
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem
                        label="Contact email"
                        value={form.contact_email}
                        status={form.contact_email_verified ? "verified" : "pending"}
                        statusDetail={
                          form.contact_email_verified
                            ? formatVerifiedAt(form.contact_email_verified_at)
                              ? `Verified on ${formatVerifiedAt(form.contact_email_verified_at)}`
                              : "Email OTP confirmed"
                            : "Email OTP still required"
                        }
                      />
                    </div>
                  </SummarySection>

                  <SummarySection title="Personal">
                    <div className="col-span-12 sm:col-span-4">
                      <SummaryItem
                        label="Date of birth"
                        value={
                          form.date_of_birth
                            ? new Date(form.date_of_birth + "T00:00:00").toLocaleDateString(
                                undefined,
                                { day: "2-digit", month: "short", year: "numeric" }
                              )
                            : "—"
                        }
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <SummaryItem
                        label="Gender"
                        value={
                          form.gender
                            ? form.gender.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                            : "—"
                        }
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <SummaryItem
                        label="Marital status"
                        value={
                          form.marital_status
                            ? form.marital_status.replace(/\b\w/g, (c) => c.toUpperCase())
                            : "—"
                        }
                      />
                    </div>
                  </SummarySection>

                  <SummarySection title="Postal address">
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="House / number" value={form.house_name_number} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="Landmark" value={form.landmark || "—"} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="City" value={form.city} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                      <SummaryItem label="Post office" value={form.post_office} />
                    </div>
                    <div className="col-span-6 sm:col-span-3 lg:col-span-3">
                      <SummaryItem label="PIN" value={form.pin_code} />
                    </div>
                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <SummaryItem label="District" value={form.district} />
                    </div>
                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <SummaryItem label="State" value={form.state} />
                    </div>
                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <SummaryItem label="Country" value={form.country || "India"} />
                    </div>
                  </SummarySection>

                  <SummarySection title="Work from home">
                    <div className="col-span-12">
                      <SummaryItem
                        label="WFH coordinates"
                        value={
                          form.wfh_latitude != null && form.wfh_longitude != null
                            ? `${form.wfh_latitude.toFixed(5)}, ${form.wfh_longitude.toFixed(5)}`
                            : "Not set"
                        }
                        status={
                          form.wfh_latitude != null && form.wfh_longitude != null
                            ? "ok"
                            : null
                        }
                        statusDetail={
                          form.wfh_latitude != null && form.wfh_longitude != null
                            ? "Saved for future WFH verification"
                            : "Optional — you can add this later"
                        }
                      />
                    </div>
                  </SummarySection>
                </SummaryBlock>

                <SummaryBlock
                  icon={FileText}
                  title="Statutory documents"
                  subtitle="Identity proofs submitted for HR verification"
                  onEdit={() => void goToStep(1)}
                >
                  <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem
                        label="Aadhaar"
                        value={form.aadhaar_number}
                        status={
                          form.aadhaar_file || (editMode && hasExistingAadhaar)
                            ? "ok"
                            : "warn"
                        }
                        statusDetail={
                          form.aadhaar_file
                            ? `Scan ready · ${form.aadhaar_file.name}`
                            : editMode && hasExistingAadhaar
                              ? "Scan on file"
                              : "Scan file missing"
                        }
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem
                        label="PAN"
                        value={form.pan_number || "Not provided"}
                        status={
                          form.pan_file || (editMode && hasExistingPan)
                            ? "ok"
                            : form.pan_number
                              ? "warn"
                              : null
                        }
                        statusDetail={
                          form.pan_file
                            ? `Scan ready · ${form.pan_file.name}`
                            : editMode && hasExistingPan
                              ? "Scan on file"
                              : form.pan_number
                                ? "Number only — scan optional"
                                : "Optional field"
                        }
                      />
                    </div>
                  </div>
                </SummaryBlock>

                <SummaryBlock
                  icon={Building2}
                  title="Banking / payroll"
                  subtitle="Account used for salary and reimbursements"
                  onEdit={() => void goToStep(2)}
                >
                  <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="Account holder" value={form.account_holder_name} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="Bank" value={form.bank_name} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="Branch" value={form.branch_name} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="Account number" value={form.account_number} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="IFSC" value={form.ifsc_code} />
                    </div>
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                      <SummaryItem label="Account type" value={form.account_type} />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem label="UPI ID" value={form.upi_id || "Not provided"} />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem
                        label="UPI phone"
                        value={form.upi_linked_phone || "Not provided"}
                      />
                    </div>
                  </div>
                </SummaryBlock>

                <SummaryBlock
                  icon={Shield}
                  title="Workspace permissions"
                  subtitle="Browser access for check-ins, voice, and alerts"
                  onEdit={() => void goToStep(3)}
                >
                  <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
                    {(
                      [
                        ["Location", perms.location],
                        ["Microphone", perms.mic],
                        ["Notifications", perms.notifications],
                      ] as const
                    ).map(([label, status]) => (
                      <div key={label} className="col-span-12 sm:col-span-4">
                        <SummaryItem
                          label={label}
                          value={
                            status === "granted"
                              ? "Allowed"
                              : status === "denied"
                                ? "Blocked in browser"
                                : "Not requested yet"
                          }
                          status={
                            status === "granted"
                              ? "ok"
                              : status === "denied"
                                ? "denied"
                                : "pending"
                          }
                        />
                      </div>
                    ))}
                  </div>
                </SummaryBlock>

                <div className="col-span-12 pt-1">
                  <h2 className="text-base font-semibold tracking-tight">CODO resources</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Company website and employee handbook — open before you accept legal terms.
                  </p>
                </div>
                <div className="col-span-12 grid grid-cols-12 gap-3 sm:gap-4">
                  <a
                    href="https://codoai.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-12 sm:col-span-6 group rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-5 flex items-start gap-3 hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
                    onClick={() => {
                      (
                        window as Window & {
                          gtag?: (...args: unknown[]) => void;
                        }
                      ).gtag?.("event", "codo_website_click", {
                        location: "onboarding_review",
                      });
                    }}
                  >
                    <div className="h-11 w-11 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0 border border-sky-500/25">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground tracking-tight">
                          CODO AI Innovations
                        </p>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Visit the company website
                      </p>
                      <p className="text-xs font-medium text-primary">codoai.in</p>
                    </div>
                  </a>
                  <a
                    href="/CODO-Handbook.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-12 sm:col-span-6 group rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-5 flex items-start gap-3 hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
                    onClick={() => {
                      (
                        window as Window & {
                          gtag?: (...args: unknown[]) => void;
                        }
                      ).gtag?.("event", "codo_handbook_click", {
                        location: "onboarding_review",
                      });
                    }}
                  >
                    <div className="h-11 w-11 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0 border border-violet-500/25">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground tracking-tight">
                          CODO Handbook
                        </p>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Open the employee handbook PDF
                      </p>
                      <p className="text-xs font-medium text-primary">CODO-Handbook.pdf</p>
                    </div>
                  </a>
                </div>

                {mustSetPassword ? (
                  <div className="col-span-12 rounded-2xl border border-border/60 bg-card/70 p-5 sm:p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h2 className="text-base font-semibold tracking-tight">
                          Set your login password
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Choose a new password for future logins. Existing teammates keep their current password and skip this step.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label htmlFor="onboarding-password" className="text-[13px] font-medium">
                          New password <span className="text-primary/80">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="onboarding-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            maxLength={128}
                            onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                            placeholder="At least 6 characters"
                            className={cn(fieldClass, "pr-11")}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label htmlFor="onboarding-confirm-password" className="text-[13px] font-medium">
                          Confirm password <span className="text-primary/80">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="onboarding-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            maxLength={128}
                            onChange={(e) => setConfirmPassword(e.target.value.slice(0, 128))}
                            placeholder="Re-enter password"
                            className={cn(fieldClass, "pr-11")}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            tabIndex={-1}
                            aria-label={
                              showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      {passwordError ? (
                        <p className="col-span-12 text-xs text-destructive">{passwordError}</p>
                      ) : passwordValid && password.length >= 6 ? (
                        <p className="col-span-12 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Password ready
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="col-span-12 pt-1">
                  <h2 className="text-base font-semibold tracking-tight">Legal agreements</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accept both to finalize and enter BugRicer.
                  </p>
                </div>
                <div className="col-span-12 rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6 space-y-5">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={form.terms_accepted}
                      onCheckedChange={(c) => {
                        const accepted = c === true;
                        setForm((prev) => ({
                          ...prev,
                          terms_accepted: accepted,
                          terms_accepted_at: accepted
                            ? prev.terms_accepted_at || new Date().toISOString()
                            : null,
                        }));
                      }}
                      className="mt-1 rounded-md"
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                      I accept the BugRicer{" "}
                      <Link
                        to="/terms-of-use"
                        target="_blank"
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Terms of Service and Code of Conduct
                      </Link>
                      .
                      {formatVerifiedAt(form.terms_accepted_at) ? (
                        <span className="block text-[11px] text-muted-foreground mt-1">
                          Accepted {formatVerifiedAt(form.terms_accepted_at)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <div className="h-px bg-border/60" />
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={form.privacy_accepted}
                      onCheckedChange={(c) => {
                        const accepted = c === true;
                        setForm((prev) => ({
                          ...prev,
                          privacy_accepted: accepted,
                          privacy_accepted_at: accepted
                            ? prev.privacy_accepted_at || new Date().toISOString()
                            : null,
                        }));
                      }}
                      className="mt-1 rounded-md"
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                      I agree to the{" "}
                      <Link
                        to="/privacy-policy"
                        target="_blank"
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Privacy Policy
                      </Link>{" "}
                      regarding my personal and statutory data.
                      {formatVerifiedAt(form.privacy_accepted_at) ? (
                        <span className="block text-[11px] text-muted-foreground mt-1">
                          Accepted {formatVerifiedAt(form.privacy_accepted_at)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 flex flex-col gap-2 sm:gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {nextBlockedHint ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 order-first sm:order-none">
                {nextBlockedHint}
              </p>
            ) : null}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                {editMode ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl h-11 px-4 flex-1 sm:flex-none"
                    disabled={loading}
                    onClick={closeWizard}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-11 px-4 flex-1 sm:flex-none"
                  disabled={step === 0 || loading}
                  onClick={() => void goToStep(step - 1)}
                >
                  Back
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <p className="hidden md:block text-xs text-muted-foreground mr-1 shrink-0">
                  {STEPS[step].label}
                </p>
                {step < 4 ? (
                  <Button
                    type="button"
                    className="rounded-xl h-11 min-w-0 flex-1 sm:min-w-[140px] sm:flex-none text-base font-semibold shadow-md"
                    disabled={!canNext}
                    onClick={() => void goToStep(step + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="rounded-xl h-11 min-w-0 flex-1 sm:min-w-[180px] sm:flex-none text-base font-semibold shadow-md"
                    disabled={!canNext || loading}
                    onClick={handleFinalize}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {editMode ? "Saving…" : "Finalizing…"}
                      </>
                    ) : editMode ? (
                      "Save changes"
                    ) : (
                      "Finish & enter"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WfhLocationMapPicker
        open={wfhMapOpen}
        onOpenChange={setWfhMapOpen}
        value={
          form.wfh_latitude != null && form.wfh_longitude != null
            ? { latitude: form.wfh_latitude, longitude: form.wfh_longitude }
            : null
        }
        onApply={(point) => {
          setField("wfh_latitude", point.latitude);
          setField("wfh_longitude", point.longitude);
          toast({ title: "WFH location selected from map" });
        }}
      />

      <ProfilePhotoResizeModal
        open={photoCropOpen}
        imageSrc={photoCropSrc}
        onOpenChange={(next) => {
          setPhotoCropOpen(next);
          if (!next) {
            if (photoCropSrc) {
              URL.revokeObjectURL(photoCropSrc);
              setPhotoCropSrc(null);
            }
            if (photoInputRef.current) photoInputRef.current.value = "";
          }
        }}
        onApply={(file) => {
          setForm((p) => ({ ...p, profile_photo: file }));
          setFileErrors((p) => ({ ...p, profile_photo: undefined }));
          toast({ title: "Profile photo ready" });
        }}
      />
    </>
  );
}
