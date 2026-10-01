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
import { extractApiErrorMessage } from "@/lib/apiError";
import {
  isValidIfscFormat,
  lookupIndiaIfsc,
  normalizeIfsc,
} from "@/lib/indiaIfscLookup";
import {
  ADMIN_ONBOARDING_URL_PARAM,
  clearOnboardingDraft,
  loadOnboardingDraft,
  ONBOARDING_URL_PARAM,
  saveOnboardingDraft,
  slugToStep,
  stepToSlug,
} from "@/lib/onboardingPersistence";
import { onboardingService } from "@/services/onboardingService";
import { googleDocsService } from "@/services/googleDocsService";
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
  KeyRound,
  Eye,
  EyeOff,
  X,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OnboardingBodySkeleton } from "./WorkspaceLaunchSkeleton";
import { Link, useSearchParams } from "react-router-dom";
import type { UserOnboardingDetails } from "@/services/onboardingService";
import { buildGoogleReauthUrl } from "@/lib/googleReauth";

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

/**
 * Why: The server names the field it rejected (e.g. "Missing required fields: city");
 * map it to the wizard step so the employee can jump straight to the fix.
 */
function stepForSubmitError(message: string): number | null {
  const m = message.toLowerCase();
  if (/aadhaar|pan_|pan |statutory/.test(m)) return 1;
  if (/account_|bank|ifsc|branch|upi/.test(m)) return 2;
  if (/google/.test(m)) return 3;
  if (
    /emergency|contact_email|profile_photo|date_of_birth|gender|marital|github|linkedin|house|city|pin_code|district|state|country|address/.test(
      m
    )
  ) {
    return 0;
  }
  return null;
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
  github_url: string;
  linkedin_url: string;
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
  github_url: "",
  linkedin_url: "",
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
    github_url: String(details.github_url || "").trim().slice(0, 255),
    linkedin_url: String(details.linkedin_url || "").trim().slice(0, 255),
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
  /**
   * Why: Admins may fill/edit all employee records before HR verify —
   * no employee WhatsApp/email OTP required.
   */
  adminMode?: boolean;
  /**
   * Why: Admin User Details uses ?employee_onboarding=; Profile self-edit uses ?onboarding=.
   * Defaults from adminMode so callers do not collide.
   */
  stepQueryKey?: string;
  onOpenChange?: (open: boolean) => void;
  onCompleted: (result?: { avatar?: string | null; updated?: boolean }) => void;
}

type ContactAvailability = "idle" | "checking" | "available" | "taken" | "unknown";

/** Matches send_*_otp.php expires_in (5 minutes) until the server reports its own. */
const OTP_TTL_MS = 5 * 60 * 1000;

type OtpFailure =
  | { kind: "expired" }
  | { kind: "invalid"; message: string; expiresIn?: number }
  | { kind: "other"; message: string };

/** Why: Expired codes need a resend; wrong codes need a retype — branch on error_code. */
function readOtpFailure(err: unknown): OtpFailure {
  const res = (err as {
    response?: { status?: number; data?: { error_code?: string; message?: string; data?: { expires_in?: number } } };
  })?.response;
  const code = res?.data?.error_code;
  if (code === "OTP_EXPIRED" || res?.status === 410) return { kind: "expired" };
  if (code === "OTP_INVALID" || res?.status === 422) {
    return {
      kind: "invalid",
      message: res?.data?.message || "Incorrect code. Try again.",
      expiresIn: Number(res?.data?.data?.expires_in) || undefined,
    };
  }
  // Legacy backend answered every failure with 401 "Invalid or expired OTP".
  if (res?.status === 401 && /otp/i.test(res?.data?.message ?? "")) {
    return { kind: "invalid", message: "Incorrect or expired code. Try again or resend." };
  }
  return {
    kind: "other",
    message: err instanceof Error ? err.message : "Could not verify the code. Try again.",
  };
}

const formatOtpTimer = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function OtpExpiredCard({
  channel,
  busy,
  cooldown,
  onResend,
}: {
  channel: "WhatsApp" | "email";
  busy: boolean;
  cooldown: number;
  onResend: () => void;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-3"
      role="alert"
    >
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Code expired</p>
          <p className="text-[11px] text-muted-foreground">
            For your security, codes last 5 minutes. Send a new one to {channel === "email" ? "your inbox" : "WhatsApp"}.
          </p>
        </div>
      </div>
      <Button
        type="button"
        className="rounded-xl h-10 w-full sm:w-auto shrink-0"
        disabled={busy || cooldown > 0}
        onClick={onResend}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Send new code"}
      </Button>
    </div>
  );
}

function ContactAvailabilityHint({ state }: { state: ContactAvailability }) {
  if (state === "checking") {
    return (
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Checking it isn’t used by another account…
      </p>
    );
  }
  if (state === "available") {
    return (
      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5" aria-live="polite">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Available — send the OTP to verify
      </p>
    );
  }
  return null;
}

/**
 * Why: Dirty checks must compare File fields by identity metadata — File objects
 * serialize to {} and would make every attachment change look "clean".
 */
function formSignature(form: OnboardingFormState): string {
  return JSON.stringify(form, (_key, value) =>
    value instanceof File
      ? `file:${value.name}:${value.size}:${value.lastModified}`
      : value
  );
}

export function OnboardingWizard({
  open,
  userId,
  employeeName = "",
  employeePhone = "",
  employeeEmail = "",
  mustSetPassword = false,
  editMode = false,
  adminMode = false,
  stepQueryKey,
  onOpenChange,
  onCompleted,
}: OnboardingWizardProps) {
  const canCloseWizard = editMode || adminMode;
  /**
   * Why: Admin and edit drafts must not collide with the employee's own first-time
   * draft (keyed by bare userId) on a shared browser.
   */
  const draftStoreKey = !userId
    ? ""
    : adminMode
      ? `admin_${userId}`
      : editMode
        ? `edit_${userId}`
        : userId;
  const skipEmployeeOtp = adminMode;
  const requirePassword = mustSetPassword && !editMode && !adminMode;
  const urlParam =
    stepQueryKey ||
    (adminMode ? ADMIN_ONBOARDING_URL_PARAM : ONBOARDING_URL_PARAM);
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormState>(INITIAL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fileErrors, setFileErrors] = useState<Partial<Record<FileKey, string>>>({});
  const [loading, setLoading] = useState(false);
  // null = not uploading; 0–100 while the submit body is in flight.
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<{ message: string; step: number | null } | null>(null);
  const [wfhBusy, setWfhBusy] = useState(false);
  const [wfhMapOpen, setWfhMapOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasExistingAadhaar, setHasExistingAadhaar] = useState(false);
  const [hasExistingPan, setHasExistingPan] = useState(false);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [pinLookupBusy, setPinLookupBusy] = useState(false);
  const [pinLookupHint, setPinLookupHint] = useState<string | null>(null);
  const [pinPostOffices, setPinPostOffices] = useState<string[]>([]);
  // Why: PIN drives state/district/city. Remember what we auto-filled so a new PIN
  // or office can refresh those fields without overwriting anything the user typed.
  const [pinOfficeBlocks, setPinOfficeBlocks] = useState<Record<string, string>>({});
  const [pinAutoFilled, setPinAutoFilled] = useState(false);
  const lastAutoCityRef = useRef<string | null>(null);
  const houseInputRef = useRef<HTMLInputElement>(null);
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
  // Why: Track code lifetime locally so an expired code swaps to "Send new code"
  // instead of letting the user submit a dead OTP. Server stays the authority.
  const [emgExpiresAt, setEmgExpiresAt] = useState<number | null>(null);
  const [mailExpiresAt, setMailExpiresAt] = useState<number | null>(null);
  const [emgOtpError, setEmgOtpError] = useState<string | null>(null);
  const [mailOtpError, setMailOtpError] = useState<string | null>(null);
  const [otpNow, setOtpNow] = useState(() => Date.now());
  const [emgAvailability, setEmgAvailability] = useState<ContactAvailability>("idle");
  const [mailAvailability, setMailAvailability] = useState<ContactAvailability>("idle");
  /** Why: Remember last OTP-verified values so edit mode only re-prompts OTP after a change. */
  const [verifiedEmgBaseline, setVerifiedEmgBaseline] = useState<string | null>(null);
  const [verifiedEmgBaselineAt, setVerifiedEmgBaselineAt] = useState<string | null>(null);
  const [verifiedMailBaseline, setVerifiedMailBaseline] = useState<string | null>(null);
  const [verifiedMailBaselineAt, setVerifiedMailBaselineAt] = useState<string | null>(null);
  const accountEmail = employeeEmail.trim().toLowerCase();
  const isAccountEmail =
    accountEmail !== "" && form.contact_email.trim().toLowerCase() === accountEmail;

  /**
   * Why: The account email was proven when the employee signed in from the welcome
   * link sent to it, so keeping it as the contact email needs no OTP. Any other
   * address still goes through email OTP (the server applies the same rule).
   */
  useEffect(() => {
    if (!isAccountEmail || form.contact_email_verified) return;
    setForm((prev) => ({
      ...prev,
      contact_email_verified: true,
      contact_email_verified_at: prev.contact_email_verified_at || new Date().toISOString(),
    }));
  }, [isAccountEmail, form.contact_email_verified]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pinAbortRef = useRef<AbortController | null>(null);
  const pinTimerRef = useRef<number | null>(null);
  const ifscAbortRef = useRef<AbortController | null>(null);
  const ifscTimerRef = useRef<number | null>(null);
  const skipUrlSync = useRef(false);
  /** Signature of the server-loaded form; edit/admin drafts are only kept while the form differs. */
  const baselineSigRef = useRef<string | null>(null);
  const hasDraftRef = useRef(false);
  /** Blocks a pending autosave from re-writing a draft the user just discarded or submitted. */
  const draftDiscardRef = useRef(false);
  const restoreNoticeRef = useRef<string | null>(null);
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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleChecking, setGoogleChecking] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);

  const syncStepToUrl = useCallback(
    (nextStep: number, replace = false) => {
      const slug = stepToSlug(nextStep);
      const next = new URLSearchParams(searchParams);
      if (next.get(urlParam) === slug) return;
      next.set(urlParam, slug);
      skipUrlSync.current = true;
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams, urlParam]
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
      if (options?.persist !== false && userId && !editMode && !adminMode) {
        try {
          await saveOnboardingDraft(userId, clamped, payload);
        } catch {
          // non-blocking
        }
      }
    },
    [form, syncStepToUrl, userId, editMode, adminMode]
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
    draftDiscardRef.current = false;
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

      // Why: Admin fill/edit loads the employee's saved row, then layers any unsaved
      // tab-scoped draft on top so a refresh mid-wizard keeps what was typed.
      if (editMode || adminMode) {
        try {
          const data = await onboardingService.get(userId);
          if (cancelled) return;
          const details = data?.details;
          setHasExistingAadhaar(!!(details?.has_aadhaar_file || details?.aadhaar_file_path));
          setHasExistingPan(!!(details?.has_pan_file || details?.pan_file_path));
          setExistingAvatarUrl(resolveExistingAvatar(data?.user?.avatar));
          let baseForm: OnboardingFormState;
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
            baseForm = mapped;
            if (mapped.emergency_contact_verified) {
              setVerifiedEmgBaseline(mapped.emergency_contact.replace(/\D/g, "").slice(-10));
              setVerifiedEmgBaselineAt(mapped.emergency_contact_verified_at);
            }
            if (mapped.contact_email_verified) {
              setVerifiedMailBaseline(mapped.contact_email.trim().toLowerCase());
              setVerifiedMailBaselineAt(mapped.contact_email_verified_at);
            }
          } else {
            baseForm = withProfileDefaults(INITIAL);
          }
          const draft = draftStoreKey
            ? await loadOnboardingDraft(draftStoreKey, INITIAL)
            : null;
          if (cancelled) return;
          baselineSigRef.current = formSignature(baseForm);
          hasDraftRef.current = !!draft;
          const restored = draft
            ? withProfileDefaults({ ...INITIAL, ...draft.form } as OnboardingFormState)
            : null;
          setForm(restored ?? baseForm);
          if (restored && restoreNoticeRef.current !== draftStoreKey) {
            restoreNoticeRef.current = draftStoreKey;
            toast({
              title: "Unsaved changes restored",
              description: "Picked up where you left off. Cancel discards them.",
            });
          }
          const urlSlug = searchParams.get(urlParam);
          const nextStep = urlSlug ? slugToStep(urlSlug) : (draft?.step ?? 0);
          setStep(nextStep);
          syncStepToUrl(nextStep, true);
        } catch {
          if (cancelled) return;
          baselineSigRef.current = formSignature(withProfileDefaults(INITIAL));
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
      const urlSlug = searchParams.get(urlParam);
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
  }, [open, userId, editMode, adminMode]);

  const closeWizard = useCallback(() => {
    if (!canCloseWizard || loading) return;
    const dirty =
      hydrated &&
      baselineSigRef.current !== null &&
      formSignature(form) !== baselineSigRef.current;
    if (dirty && !window.confirm("Discard unsaved onboarding changes?")) return;
    draftDiscardRef.current = true;
    hasDraftRef.current = false;
    restoreNoticeRef.current = null;
    if (draftStoreKey) void clearOnboardingDraft(draftStoreKey);
    // Why: Parent derives open from the step query — clearing the param closes the modal.
    const cleaned = new URLSearchParams(searchParams);
    cleaned.delete(urlParam);
    setSearchParams(cleaned, { replace: true });
    onOpenChange?.(false);
  }, [
    canCloseWizard,
    loading,
    hydrated,
    form,
    draftStoreKey,
    searchParams,
    setSearchParams,
    onOpenChange,
    urlParam,
  ]);
  // Browser back/forward within onboarding steps
  useEffect(() => {
    if (!open || !hydrated) return;
    const slug = searchParams.get(urlParam);
    if (!slug) {
      // Why: Edit/admin mode is URL-owned — missing slug means close. First-time
      // onboarding re-seeds the slug so refresh can resume the step.
      if (canCloseWizard) {
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
  }, [open, hydrated, searchParams, step, syncStepToUrl, canCloseWizard, onOpenChange, urlParam]);

  // Persist quietly when files / key fields change after hydrate
  useEffect(() => {
    if (!open || !hydrated || !userId || !draftStoreKey) return;
    const t = window.setTimeout(() => {
      if (!canCloseWizard) {
        void saveOnboardingDraft(userId, step, form);
        return;
      }
      if (draftDiscardRef.current) return;
      // Why: Edit/admin only keep a draft while it differs from the server row, so an
      // untouched open never shadows newer data saved elsewhere.
      if (formSignature(form) === baselineSigRef.current) {
        if (hasDraftRef.current) {
          hasDraftRef.current = false;
          void clearOnboardingDraft(draftStoreKey);
        }
        return;
      }
      hasDraftRef.current = true;
      void saveOnboardingDraft(draftStoreKey, step, form);
    }, 400);
    return () => window.clearTimeout(t);
  }, [form, step, open, hydrated, userId, draftStoreKey, canCloseWizard]);

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

  const handlePinChange = useCallback((raw: string, opts?: { silent?: boolean }) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setField("pin_code", digits);
    setPinLookupHint(null);
    setPinPostOffices([]);
    setPinOfficeBlocks({});
    setPinAutoFilled(false);

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
          const blocks = Object.fromEntries(hit.offices.map((o) => [o.name, o.block]));
          setPinPostOffices(names);
          setPinOfficeBlocks(blocks);

          let autoOffice = "";
          setForm((prev) => {
            const matched = matchPinOffice(prev.post_office, names);
            autoOffice = matched || (names.length === 1 ? names[0] : "");
            const autoCity = (autoOffice && blocks[autoOffice]) || hit.city;
            const cityIsAuto =
              !prev.city.trim() || prev.city === lastAutoCityRef.current;
            if (cityIsAuto) lastAutoCityRef.current = autoCity;
            return {
              ...prev,
              pin_code: digits,
              post_office: autoOffice,
              city: cityIsAuto ? autoCity : prev.city,
              state: hit.state || prev.state || "Kerala",
              district: hit.district || prev.district,
              country: "India",
            };
          });
          setPinAutoFilled(true);

          setPinLookupHint(
            names.length > 1
              ? `${names.length} post offices found — pick yours`
              : `Filled state, district and city from ${names[0]}`
          );
          // Single match: jump straight to the only address detail left to type.
          if (!opts?.silent && names.length === 1) {
            window.requestAnimationFrame(() => houseInputRef.current?.focus());
          }
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
    handlePinChange(digits, { silent: true });
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

  useEffect(() => {
    if (!emgOtpSent && !mailOtpSent) return;
    setOtpNow(Date.now());
    const id = window.setInterval(() => setOtpNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [emgOtpSent, mailOtpSent]);

  const emgSecondsLeft =
    emgExpiresAt == null ? null : Math.max(0, Math.ceil((emgExpiresAt - otpNow) / 1000));
  const mailSecondsLeft =
    mailExpiresAt == null ? null : Math.max(0, Math.ceil((mailExpiresAt - otpNow) / 1000));
  const emgOtpExpired = emgOtpSent && emgSecondsLeft === 0;
  const mailOtpExpired = mailOtpSent && mailSecondsLeft === 0;

  const availabilityForUserId = adminMode ? userId : undefined;
  const emgDigitsForCheck = form.emergency_contact.replace(/\D/g, "");
  const mailForCheck = form.contact_email.trim().toLowerCase();

  /**
   * Why: A number or email owned by another account must be rejected before any
   * OTP is sent. Debounced + aborted so only the latest value's result applies.
   */
  useEffect(() => {
    if (!open || form.emergency_contact_verified || emgDigitsForCheck.length !== 10) {
      setEmgAvailability("idle");
      return;
    }
    setEmgAvailability("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      onboardingService
        .checkContactAvailability("phone", emgDigitsForCheck, {
          forUserId: availabilityForUserId,
          signal: controller.signal,
        })
        .then((res) => {
          if (controller.signal.aborted) return;
          setEmgAvailability(res.available ? "available" : "taken");
          setEmgConflictMsg(res.available ? null : res.message || "This number is already in use.");
        })
        .catch(() => {
          // Server re-checks on send, so a failed probe must not lock the user out.
          if (!controller.signal.aborted) setEmgAvailability("unknown");
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, emgDigitsForCheck, form.emergency_contact_verified, availabilityForUserId]);

  useEffect(() => {
    if (
      !open ||
      form.contact_email_verified ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailForCheck)
    ) {
      setMailAvailability("idle");
      return;
    }
    setMailAvailability("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      onboardingService
        .checkContactAvailability("email", mailForCheck, {
          forUserId: availabilityForUserId,
          signal: controller.signal,
        })
        .then((res) => {
          if (controller.signal.aborted) return;
          setMailAvailability(res.available ? "available" : "taken");
          setMailConflictMsg(res.available ? null : res.message || "This email is already in use.");
        })
        .catch(() => {
          if (!controller.signal.aborted) setMailAvailability("unknown");
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, mailForCheck, form.contact_email_verified, availabilityForUserId]);

  const isValidGithubUrl = (value: string) => {
    const v = value.trim();
    if (!v) return true;
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      return /^(www\.)?github\.com$/i.test(u.hostname);
    } catch {
      return false;
    }
  };

  const isValidLinkedinUrl = (value: string) => {
    const v = value.trim();
    if (!v) return true;
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      return /(^|\.)linkedin\.com$/i.test(u.hostname);
    } catch {
      return false;
    }
  };

  const sendEmergencyOtp = async () => {
    const digits = form.emergency_contact.replace(/\D/g, "");
    if (
      digits.length < 10 ||
      emgAvailability === "checking" ||
      emgAvailability === "taken" ||
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
    setEmgOtpError(null);
    setEmgExpiresAt(Date.now() + OTP_TTL_MS);
    setEmgCooldown(30);
    setForm((p) => ({ ...p, emergency_contact_verified: false }));
    try {
      const sent = await onboardingService.sendEmergencyOtp(digits.slice(-10));
      const ttl = Number(sent?.data?.expires_in);
      if (ttl > 0) setEmgExpiresAt(Date.now() + ttl * 1000);
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
    if (otp.length !== 6 || digits.length < 10 || emgVerifyBusy || emgOtpExpired) return;
    setEmgVerifyBusy(true);
    setEmgOtpError(null);
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
      setEmgExpiresAt(null);
      toast({ title: "Emergency number verified" });
    } catch (err) {
      const outcome = readOtpFailure(err);
      setEmgOtp("");
      if (outcome.kind === "expired") {
        setEmgExpiresAt(Date.now());
      } else if (outcome.kind === "invalid") {
        setEmgOtpError(outcome.message);
        if (outcome.expiresIn) setEmgExpiresAt(Date.now() + outcome.expiresIn * 1000);
      } else {
        setEmgOtpError(outcome.message);
      }
    } finally {
      setEmgVerifyBusy(false);
    }
  };

  const sendContactEmailOtp = async () => {
    const email = form.contact_email.trim().toLowerCase();
    if (
      !isValidContactEmail(email) ||
      mailAvailability === "checking" ||
      mailAvailability === "taken" ||
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
    setMailOtpError(null);
    setMailExpiresAt(Date.now() + OTP_TTL_MS);
    setMailCooldown(30);
    setForm((p) => ({ ...p, contact_email_verified: false }));
    try {
      const sent = await onboardingService.sendContactEmailOtp(email);
      const ttl = Number(sent?.data?.expires_in);
      if (ttl > 0) setMailExpiresAt(Date.now() + ttl * 1000);
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
    if (otp.length !== 6 || !isValidContactEmail(email) || mailVerifyBusy || mailOtpExpired) return;
    setMailVerifyBusy(true);
    setMailOtpError(null);
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
      setMailExpiresAt(null);
      toast({ title: "Contact email verified" });
    } catch (err) {
      const outcome = readOtpFailure(err);
      setMailOtp("");
      if (outcome.kind === "expired") {
        setMailExpiresAt(Date.now());
      } else if (outcome.kind === "invalid") {
        setMailOtpError(outcome.message);
        if (outcome.expiresIn) setMailExpiresAt(Date.now() + outcome.expiresIn * 1000);
      } else {
        setMailOtpError(outcome.message);
      }
    } finally {
      setMailVerifyBusy(false);
    }
  };

  const step1Valid = useMemo(() => {
    const hasPhoto =
      !!form.profile_photo || ((editMode || adminMode) && !!existingAvatarUrl);
    const contactsOk = skipEmployeeOtp
      ? form.emergency_contact.replace(/\D/g, "").length >= 10 &&
        isValidContactEmail(form.contact_email)
      : form.emergency_contact_verified && form.contact_email_verified;
    return (
      hasPhoto &&
      form.emergency_contact.replace(/\D/g, "").length >= 10 &&
      !emgConflictMsg &&
      contactsOk &&
      isValidContactEmail(form.contact_email) &&
      !mailConflictMsg &&
      !!form.date_of_birth &&
      !!form.gender &&
      !!form.marital_status &&
      isValidGithubUrl(form.github_url) &&
      isValidLinkedinUrl(form.linkedin_url) &&
      form.house_name_number.trim() &&
      form.city.trim() &&
      form.pin_code.replace(/\D/g, "").length >= 6 &&
      form.district.trim() &&
      form.state.trim()
    );
  }, [
    form,
    editMode,
    adminMode,
    skipEmployeeOtp,
    existingAvatarUrl,
    emgConflictMsg,
    mailConflictMsg,
  ]);

  const step2Valid = useMemo(() => {
    const hasAadhaar =
      !!form.aadhaar_file || ((editMode || adminMode) && hasExistingAadhaar);
    return (
      form.aadhaar_number.replace(/\D/g, "").length === 12 &&
      hasAadhaar &&
      !fileErrors.aadhaar_file &&
      !fileErrors.pan_file
    );
  }, [form, fileErrors, editMode, adminMode, hasExistingAadhaar]);
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
    !requirePassword ||
    (password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword);

  const passwordError = useMemo(() => {
    if (!requirePassword) return null;
    if (!password && !confirmPassword) return null;
    if (password.length > 0 && password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (confirmPassword.length > 0 && password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  }, [requirePassword, password, confirmPassword]);

  const step5Valid =
    form.terms_accepted && form.privacy_accepted && passwordValid;

  const districtOptions = useMemo(
    () => districtsForState(form.state),
    [form.state]
  );

  const step4Valid = adminMode || googleConnected;

  const canNext =
    hydrated && [!!step1Valid, step2Valid, step3Valid, step4Valid, step5Valid][step];

  /** Why: Users need a clear reason when Continue stays disabled on long address forms. */
  const nextBlockedHint = useMemo(() => {
    if (canNext) return null;
    if (step === 3 && !adminMode && !googleConnected) {
      return "Connect Google to continue — needed for Docs, Sheets, and Meet";
    }
    if (step !== 0) return null;
    if (!(form.profile_photo || ((editMode || adminMode) && existingAvatarUrl))) {
      return "Upload a profile photo to continue";
    }
    if (form.emergency_contact.replace(/\D/g, "").length < 10) {
      return "Enter a 10-digit emergency WhatsApp number";
    }
    if (emgConflictMsg) return emgConflictMsg;
    if (!skipEmployeeOtp && !form.emergency_contact_verified) {
      return "Verify emergency WhatsApp with OTP";
    }
    if (!isValidContactEmail(form.contact_email)) return "Enter a valid contact email";
    if (mailConflictMsg) return mailConflictMsg;
    if (!skipEmployeeOtp && !form.contact_email_verified) {
      return "Verify contact email with OTP";
    }
    if (!form.date_of_birth) return "Enter your date of birth";
    if (!form.gender) return "Select your gender";
    if (!form.marital_status) return "Select your marital status";
    if (!isValidGithubUrl(form.github_url)) return "Enter a valid GitHub profile URL";
    if (!isValidLinkedinUrl(form.linkedin_url)) return "Enter a valid LinkedIn profile URL";
    if (form.pin_code.replace(/\D/g, "").length < 6) return "Enter a 6-digit PIN code";
    if (!form.state.trim()) return "Select your state";
    if (!form.district.trim()) return "Select your district";
    if (!form.city.trim()) return "Enter your city";
    if (!form.house_name_number.trim()) return "Enter house name / number";
    return "Complete all required address fields";
  }, [
    canNext,
    step,
    form,
    editMode,
    adminMode,
    skipEmployeeOtp,
    existingAvatarUrl,
    emgConflictMsg,
    mailConflictMsg,
    googleConnected,
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
    if (step !== 3 || adminMode || typeof window === "undefined") return;

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
  }, [step, adminMode]);

  // Why: First-time setup also links Google for Docs, Sheets, and Meet (employee session only).
  const refreshGoogleConnection = useCallback(async () => {
    if (adminMode) return;
    setGoogleChecking(true);
    try {
      const result = await googleDocsService.checkConnection();
      setGoogleConnected(!!result.connected);
      setGoogleEmail(result.email || null);
    } catch {
      setGoogleConnected(false);
      setGoogleEmail(null);
    } finally {
      setGoogleChecking(false);
    }
  }, [adminMode]);

  useEffect(() => {
    if (!open || adminMode) return;
    void refreshGoogleConnection();
  }, [open, adminMode, refreshGoogleConnection]);

  useEffect(() => {
    if (!open || adminMode) return;
    // Older OAuth callbacks appended "?google_connected=…" onto the step param.
    const rawSlug = searchParams.get(urlParam) || "";
    const qIdx = rawSlug.indexOf("?");
    const embedded = qIdx >= 0 ? new URLSearchParams(rawSlug.slice(qIdx + 1)) : null;
    const googleOk = searchParams.get("google_connected") ?? embedded?.get("google_connected") ?? null;
    const googleError = searchParams.get("google_error") ?? embedded?.get("google_error") ?? null;
    if (!googleOk && !googleError && !embedded) return;

    if (googleOk === "true") {
      toast({
        title: "Google connected",
        description: "Docs, Sheets, and Meet are ready in BugRicer.",
      });
      void refreshGoogleConnection();
    } else if (googleError) {
      toast({
        title: "Google connection failed",
        description: decodeURIComponent(googleError),
        variant: "destructive",
      });
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("google_connected");
        next.delete("google_error");
        next.delete("email");
        const slug = (next.get(urlParam) || "").split("?")[0];
        next.set(urlParam, slug || "permissions");
        return next;
      },
      { replace: true }
    );
  }, [
    open,
    adminMode,
    searchParams,
    setSearchParams,
    refreshGoogleConnection,
    urlParam,
  ]);

  const connectGoogleAccount = async () => {
    if (adminMode || googleConnecting) return;
    try {
      setGoogleConnecting(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        toast({
          title: "Please sign in again",
          description: "Your session expired before Google connect.",
          variant: "destructive",
        });
        return;
      }
      const payload = JSON.parse(atob(token.split(".")[1]));
      const oauthUserId = payload.user_id as string;
      if (!oauthUserId) throw new Error("Missing user id in session");

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.delete("google_connected");
      returnUrl.searchParams.delete("google_error");
      returnUrl.searchParams.delete("email");
      returnUrl.searchParams.set(urlParam, "permissions");

      // Why: OAuth is a full-page redirect — flush the debounced draft first or the
      // last edits are lost when the wizard rehydrates on return.
      if (draftStoreKey) {
        try {
          hasDraftRef.current = true;
          await saveOnboardingDraft(draftStoreKey, 3, form);
        } catch {
          // non-blocking
        }
      }

      window.location.href = buildGoogleReauthUrl(token, oauthUserId, returnUrl.toString());
    } catch (err) {
      setGoogleConnecting(false);
      toast({
        title: "Could not start Google sign-in",
        description: err instanceof Error ? err.message : "Try again from Profile later.",
        variant: "destructive",
      });
    }
  };

  const handleFinalize = async () => {
    const hasPhoto =
      !!form.profile_photo || ((editMode || adminMode) && !!existingAvatarUrl);
    const hasAadhaar =
      !!form.aadhaar_file || ((editMode || adminMode) && hasExistingAadhaar);
    if (loading) return;
    // Why: Deep links / OAuth returns can land on Review with earlier steps incomplete —
    // never let Save silently no-op or submit blanks; send the user to the gap.
    const firstInvalid = [!!step1Valid, step2Valid, !!step3Valid].findIndex((ok) => !ok);
    if (firstInvalid >= 0 || !hasPhoto || !hasAadhaar) {
      const target = firstInvalid >= 0 ? firstInvalid : !hasPhoto ? 0 : 1;
      toast({
        title: "Some details are missing",
        description: `Complete the ${STEPS[target]?.label ?? "highlighted"} step, then save again.`,
        variant: "destructive",
      });
      void goToStep(target);
      return;
    }
    if (!form.terms_accepted || !form.privacy_accepted) {
      toast({
        title: "Accept the terms to continue",
        description: "Tick both agreements on this page before saving.",
        variant: "destructive",
      });
      return;
    }
    if (!adminMode && !googleConnected) {
      toast({
        title: "Connect Google first",
        description: "Docs, Sheets, and Meet require a connected Google account.",
        variant: "destructive",
      });
      void goToStep(3);
      return;
    }
    if (requirePassword && (!passwordValid || password !== confirmPassword)) {
      toast({
        title: "Set your password",
        description: "Enter a new password and confirm it before finishing.",
        variant: "destructive",
      });
      return;
    }

    const attestedAt = new Date().toISOString();
    const payload = {
      emergency_contact: form.emergency_contact,
      contact_email: form.contact_email.trim().toLowerCase(),
      emergency_contact_verified_at: skipEmployeeOtp
        ? form.emergency_contact_verified_at || attestedAt
        : form.emergency_contact_verified
          ? form.emergency_contact_verified_at || attestedAt
          : null,
      contact_email_verified_at: skipEmployeeOtp
        ? form.contact_email_verified_at || attestedAt
        : form.contact_email_verified
          ? form.contact_email_verified_at || attestedAt
          : null,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      marital_status: form.marital_status,
      github_url: form.github_url.trim(),
      linkedin_url: form.linkedin_url.trim(),
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
      ...(requirePassword
        ? { password, confirm_password: confirmPassword }
        : {}),
      // Why: Only send new blobs — re-uploading unchanged scans made Save crawl.
      aadhaar_file: form.aadhaar_file || null,
      pan_file: form.pan_file || null,
      profile_photo: form.profile_photo || null,
    };

    setLoading(true);

    // Why: Edit/admin mode closes immediately so Save feels instant; request continues in background.
    if (editMode || adminMode) {
      if (draftStoreKey) {
        try {
          hasDraftRef.current = true;
          await saveOnboardingDraft(draftStoreKey, 4, form);
        } catch {
          // non-blocking
        }
      }
      const cleaned = new URLSearchParams(searchParams);
      cleaned.delete(urlParam);
      setSearchParams(cleaned, { replace: true });
      onOpenChange?.(false);
      toast({
        title: "Saving changes…",
        description: adminMode
          ? "Updating employee records — marked verified (no Review & decide needed)."
          : "Updating your employee records.",
      });

      try {
        const result = await onboardingService.submit(payload, {
          forUserId: adminMode ? userId : undefined,
        });
        draftDiscardRef.current = true;
        hasDraftRef.current = false;
        restoreNoticeRef.current = null;
        if (draftStoreKey) void clearOnboardingDraft(draftStoreKey);
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
        const message = extractApiErrorMessage(err, "Could not save onboarding changes");
        toast({
          title: "Update failed",
          description: message,
          variant: "destructive",
        });
        // Re-open review so the employee can retry without re-entering everything.
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set(urlParam, "legal");
            return next;
          },
          { replace: false }
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    setSubmitError(null);
    try {
      const hasFiles = !!(payload.aadhaar_file || payload.pan_file || payload.profile_photo);
      if (hasFiles) setUploadPercent(0);
      const result = await onboardingService.submit(payload, {
        onUploadProgress: hasFiles ? setUploadPercent : undefined,
      });
      setUploadPercent(null);
      void clearOnboardingDraft(userId);
      const cleaned = new URLSearchParams(searchParams);
      cleaned.delete(urlParam);
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
      const message = extractApiErrorMessage(err, "Could not complete onboarding");
      setUploadPercent(null);
      setSubmitError({ message, step: stepForSubmitError(message) });
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
          if (!canCloseWizard) return;
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
            // Why: Toasts, permission prompts and stray clicks must never dismiss a
            // multi-step form — close only via X, Cancel or Esc (with unsaved warning).
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            if (canCloseWizard) closeWizard();
          }}
        >
          <DialogHeader className="relative shrink-0 px-4 sm:px-8 pt-4 sm:pt-7 pb-3 sm:pb-5 border-b border-border/50 text-left space-y-0 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent" />
            <div className="relative space-y-3 sm:space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                    {adminMode
                      ? "Admin · employee records"
                      : editMode
                        ? "Update employee records"
                        : "Employee onboarding"}
                  </p>
                  <DialogTitle className="text-xl sm:text-[1.75rem] font-semibold tracking-tight text-foreground">
                    {adminMode
                      ? "Complete employee onboarding"
                      : editMode
                        ? "Edit onboarding details"
                        : "Set up your workspace"}
                  </DialogTitle>
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-1.5 sm:px-3.5 sm:py-2 text-right">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Step</p>
                    <p className="text-base sm:text-lg font-semibold tabular-nums text-foreground">
                      {step + 1}
                      <span className="text-muted-foreground font-normal text-sm"> / {STEPS.length}</span>
                    </p>
                  </div>
                  {canCloseWizard ? (
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
            {!hydrated ? <OnboardingBodySkeleton /> : null}
            <div className={hydrated ? "contents" : "hidden"}>
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
                          {(editMode || adminMode) && existingAvatarUrl && !form.profile_photo
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
                      <p className="text-xs text-destructive" role="alert">{emgConflictMsg}</p>
                    ) : (
                      <ContactAvailabilityHint state={emgAvailability} />
                    )}

                    {form.emergency_contact_verified || skipEmployeeOtp ? (
                      <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            {skipEmployeeOtp
                              ? "WhatsApp number accepted (admin — no OTP)"
                              : "WhatsApp number verified"}
                          </p>
                        </div>
                        {!skipEmployeeOtp &&
                        formatVerifiedAt(form.emergency_contact_verified_at) ? (
                          <p className="text-[11px] text-muted-foreground pl-6">
                            Verified {formatVerifiedAt(form.emergency_contact_verified_at)}
                          </p>
                        ) : null}
                        {!skipEmployeeOtp ? (
                          <p className="text-[11px] text-muted-foreground pl-6">
                            Change the number to verify again with OTP
                          </p>
                        ) : null}
                      </div>
                    ) : !emgOtpSent ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-11 w-full sm:w-auto sm:self-start"
                        disabled={
                          form.emergency_contact.replace(/\D/g, "").length < 10 ||
                          !!emgConflictMsg ||
                          emgAvailability === "checking" ||
                          emgAvailability === "taken" ||
                          emgOtpBusy
                        }
                        onClick={() => void sendEmergencyOtp()}
                      >
                        {emgOtpBusy || emgAvailability === "checking" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <MessageCircle className="h-4 w-4 mr-2" />
                        )}
                        Send WhatsApp OTP
                      </Button>
                    ) : emgOtpExpired ? (
                      <OtpExpiredCard
                        channel="WhatsApp"
                        busy={emgOtpBusy}
                        cooldown={emgCooldown}
                        onResend={() => void sendEmergencyOtp()}
                      />
                    ) : (
                      <div className="grid grid-cols-12 gap-2.5 min-w-0">
                        <div className="col-span-12 min-w-0">
                          <OtpDigitBoxes
                            value={emgOtp}
                            autoFocus
                            disabled={emgVerifyBusy}
                            onChange={(v) => {
                              setEmgOtp(v);
                              if (emgOtpError) setEmgOtpError(null);
                            }}
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
                        {emgOtpError ? (
                          <p className="col-span-12 text-xs text-destructive" role="alert">
                            {emgOtpError}
                          </p>
                        ) : null}
                        <p className="col-span-12 text-[11px] text-muted-foreground" aria-live="polite">
                          OTP sent on WhatsApp · enter the 6-digit code
                          {emgSecondsLeft != null && emgSecondsLeft > 0
                            ? ` · expires in ${formatOtpTimer(emgSecondsLeft)}`
                            : ""}
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
                            (verifiedMailBaseline != null && normalized === verifiedMailBaseline) ||
                            (accountEmail !== "" && normalized === accountEmail);
                          setMailConflictMsg(null);
                          setForm((prev) => ({
                            ...prev,
                            contact_email: next,
                            contact_email_verified: matchesBaseline,
                            contact_email_verified_at: matchesBaseline
                              ? verifiedMailBaselineAt ||
                                prev.contact_email_verified_at ||
                                new Date().toISOString()
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
                      <p className="text-xs text-destructive" role="alert">{mailConflictMsg}</p>
                    ) : (
                      <ContactAvailabilityHint state={mailAvailability} />
                    )}

                    {form.contact_email_verified || skipEmployeeOtp ? (
                      <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            {skipEmployeeOtp
                              ? "Contact email accepted (admin — no OTP)"
                              : isAccountEmail
                                ? "Account email — already verified"
                                : "Contact email verified"}
                          </p>
                        </div>
                        {!skipEmployeeOtp && isAccountEmail ? (
                          <p className="text-[11px] text-muted-foreground pl-6">
                            Verified when you signed in from the invite sent to this address. No OTP needed.
                          </p>
                        ) : null}
                        {!skipEmployeeOtp &&
                        !isAccountEmail &&
                        formatVerifiedAt(form.contact_email_verified_at) ? (
                          <p className="text-[11px] text-muted-foreground pl-6">
                            Verified {formatVerifiedAt(form.contact_email_verified_at)}
                          </p>
                        ) : null}
                        {!skipEmployeeOtp ? (
                          <p className="text-[11px] text-muted-foreground pl-6">
                            {isAccountEmail
                              ? "Using a different address? Change it and verify with OTP."
                              : "Change the email to verify again with OTP"}
                          </p>
                        ) : null}
                      </div>
                    ) : !mailOtpSent ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-11 w-full sm:w-auto sm:self-start"
                        disabled={
                          !isValidContactEmail(form.contact_email) ||
                          !!mailConflictMsg ||
                          mailAvailability === "checking" ||
                          mailAvailability === "taken" ||
                          mailOtpBusy
                        }
                        onClick={() => void sendContactEmailOtp()}
                      >
                        {mailOtpBusy || mailAvailability === "checking" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        Send email OTP
                      </Button>
                    ) : mailOtpExpired ? (
                      <OtpExpiredCard
                        channel="email"
                        busy={mailOtpBusy}
                        cooldown={mailCooldown}
                        onResend={() => void sendContactEmailOtp()}
                      />
                    ) : (
                      <div className="grid grid-cols-12 gap-2.5 min-w-0">
                        <div className="col-span-12 min-w-0">
                          <OtpDigitBoxes
                            value={mailOtp}
                            autoFocus
                            disabled={mailVerifyBusy}
                            onChange={(v) => {
                              setMailOtp(v);
                              if (mailOtpError) setMailOtpError(null);
                            }}
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
                        {mailOtpError ? (
                          <p className="col-span-12 text-xs text-destructive" role="alert">
                            {mailOtpError}
                          </p>
                        ) : null}
                        <p className="col-span-12 text-[11px] text-muted-foreground" aria-live="polite">
                          OTP sent to inbox · enter the 6-digit code
                          {mailSecondsLeft != null && mailSecondsLeft > 0
                            ? ` · expires in ${formatOtpTimer(mailSecondsLeft)}`
                            : ""}
                        </p>
                      </div>
                    )}

                    {!form.contact_email_verified && !mailOtpSent ? (
                      <p className="text-[11px] text-muted-foreground">
                        {accountEmail
                          ? `A different address needs a one-time code. Your account email (${accountEmail}) is accepted without OTP.`
                          : "Use your email or another personal address — not one already used by another employee"}
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

                <div className="col-span-12 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                      Professional profiles
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      GitHub and LinkedIn profile links used across BugRicer.
                    </p>
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <FieldShell label="GitHub profile" className="col-span-12 md:col-span-6">
                      <Input
                        className={fieldClass}
                        maxLength={255}
                        placeholder="https://github.com/username"
                        value={form.github_url}
                        onChange={(e) =>
                          setField("github_url", e.target.value.trim().slice(0, 255))
                        }
                      />
                      {form.github_url && !isValidGithubUrl(form.github_url) ? (
                        <p className="text-xs text-destructive mt-1">
                          Use a github.com profile URL
                        </p>
                      ) : null}
                    </FieldShell>
                    <FieldShell label="LinkedIn profile" className="col-span-12 md:col-span-6">
                      <Input
                        className={fieldClass}
                        maxLength={255}
                        placeholder="https://linkedin.com/in/username"
                        value={form.linkedin_url}
                        onChange={(e) =>
                          setField("linkedin_url", e.target.value.trim().slice(0, 255))
                        }
                      />
                      {form.linkedin_url && !isValidLinkedinUrl(form.linkedin_url) ? (
                        <p className="text-xs text-destructive mt-1">
                          Use a linkedin.com profile URL
                        </p>
                      ) : null}
                    </FieldShell>
                  </div>
                </div>

                <div className="col-span-12 space-y-1">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Home address</h3>
                  <p className="text-xs text-muted-foreground">
                    Start with your PIN code — state, district and city fill in automatically.
                  </p>
                </div>

                <FieldShell label="PIN code" required className="md:col-span-4">
                  <div className="relative">
                    <Input
                      className={cn(
                        fieldClass,
                        (pinLookupBusy || pinAutoFilled) && "pr-10",
                        pinAutoFilled && "border-emerald-500/50"
                      )}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      placeholder="6-digit PIN"
                      value={form.pin_code}
                      onChange={(e) => handlePinChange(e.target.value)}
                    />
                    {pinLookupBusy ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    ) : pinAutoFilled ? (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    ) : null}
                  </div>
                  {pinLookupBusy ? (
                    <p className="text-[11px] text-muted-foreground mt-1" aria-live="polite">
                      Looking up PIN…
                    </p>
                  ) : pinLookupHint ? (
                    <p
                      className={cn(
                        "text-[11px] mt-1",
                        pinAutoFilled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}
                      aria-live="polite"
                    >
                      {pinLookupHint}
                    </p>
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
                        const block = pinOfficeBlocks[v];
                        setForm((prev) => {
                          const cityIsAuto =
                            !prev.city.trim() || prev.city === lastAutoCityRef.current;
                          if (cityIsAuto && block) lastAutoCityRef.current = block;
                          return {
                            ...prev,
                            post_office: v,
                            city: cityIsAuto && block ? block : prev.city,
                          };
                        });
                        setPinLookupHint(`Filled state, district and city from ${v}`);
                        window.requestAnimationFrame(() => houseInputRef.current?.focus());
                      }}
                    >
                      <SelectTrigger className={cn(fieldClass, "w-full")}>
                        <SelectValue placeholder={`Select post office (${pinPostOffices.length})`} />
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
                      placeholder={
                        form.pin_code.length === 6 && !pinLookupBusy
                          ? "Type post office"
                          : "Enter PIN to load offices"
                      }
                    />
                  )}
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

                <FieldShell label="House name / number" required className="md:col-span-6">
                  <Input
                    ref={houseInputRef}
                    className={fieldClass}
                    maxLength={150}
                    autoComplete="address-line1"
                    placeholder="House / flat / building"
                    value={form.house_name_number}
                    onChange={(e) => setField("house_name_number", e.target.value.slice(0, 150))}
                  />
                </FieldShell>
                <FieldShell label="Landmark" className="md:col-span-6">
                  <Input
                    className={fieldClass}
                    maxLength={200}
                    autoComplete="address-line2"
                    placeholder="Nearby landmark"
                    value={form.landmark}
                    onChange={(e) => setField("landmark", e.target.value.slice(0, 200))}
                  />
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
                    (editMode || adminMode) && hasExistingAadhaar ? "Aadhaar scan on file" : null
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
                    (editMode || adminMode) && hasExistingPan ? "PAN scan on file" : null
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
                {adminMode ? (
                  <div className="col-span-12">
                    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6">
                      <div className="flex flex-col gap-4">
                        <div className="space-y-1">
                          <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            Device access — nothing to do here
                          </h2>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Location, microphone and notifications belong to the employee&apos;s own
                            device. BugRicer asks them on their login — your browser is not prompted.
                            Continue to the next step.
                          </p>
                        </div>
                        <div className="grid grid-cols-12 gap-3">
                          {[
                            { icon: MapPin, label: "Location", hint: "Check-ins & WFH" },
                            { icon: Mic, label: "Microphone", hint: "Voice notes" },
                            { icon: Bell, label: "Notifications", hint: "Alerts" },
                          ].map(({ icon: Icon, label, hint }) => (
                            <div
                              key={label}
                              className="col-span-12 sm:col-span-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 min-w-0"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  Employee grants · {hint}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}

                <div className="col-span-12">
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-background border border-border/60 flex items-center justify-center shrink-0 shadow-sm">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-base font-semibold tracking-tight text-foreground">
                          Connect Google
                          {!adminMode ? (
                            <span className="text-destructive font-normal"> *</span>
                          ) : null}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Required for Docs, Sheets, and Meet inside BugRicer.
                          {adminMode
                            ? " The employee must connect Google on their own login before using those tools."
                            : " Sign in once to continue — this step is required."}
                        </p>
                        {!adminMode && googleConnected && googleEmail ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                            Connected as {googleEmail}
                          </p>
                        ) : null}
                        {!adminMode && !googleConnected && !googleChecking ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Connect Google to unlock Next.
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 w-full sm:w-auto">
                        {adminMode ? (
                          <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground text-center sm:text-left">
                            Employee connects later
                          </div>
                        ) : googleChecking ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-11 w-full sm:w-auto"
                            disabled
                          >
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Checking…
                          </Button>
                        ) : googleConnected ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-11 w-full sm:w-auto border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            disabled
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Google ready
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            className="rounded-xl h-11 w-full sm:w-auto"
                            disabled={googleConnecting}
                            onClick={connectGoogleAccount}
                          >
                            {googleConnecting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Opening Google…
                              </>
                            ) : (
                              "Connect Google"
                            )}
                          </Button>
                        )}
                      </div>
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
                        status={
                          form.emergency_contact_verified || skipEmployeeOtp
                            ? "verified"
                            : "pending"
                        }
                        statusDetail={
                          skipEmployeeOtp
                            ? "Admin attested — no OTP"
                            : form.emergency_contact_verified
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
                        status={
                          form.contact_email_verified || skipEmployeeOtp
                            ? "verified"
                            : "pending"
                        }
                        statusDetail={
                          skipEmployeeOtp
                            ? "Admin attested — no OTP"
                            : form.contact_email_verified
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

                  <SummarySection title="Professional profiles">
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem
                        label="GitHub"
                        value={form.github_url || "—"}
                        status={form.github_url ? "ok" : "pending"}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <SummaryItem
                        label="LinkedIn"
                        value={form.linkedin_url || "Not provided"}
                        status={form.linkedin_url ? "ok" : "pending"}
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
                          form.aadhaar_file || ((editMode || adminMode) && hasExistingAadhaar)
                            ? "ok"
                            : "warn"
                        }
                        statusDetail={
                          form.aadhaar_file
                            ? `Scan ready · ${form.aadhaar_file.name}`
                            : (editMode || adminMode) && hasExistingAadhaar
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
                          form.pan_file || ((editMode || adminMode) && hasExistingPan)
                            ? "ok"
                            : form.pan_number
                              ? "warn"
                              : null
                        }
                        statusDetail={
                          form.pan_file
                            ? `Scan ready · ${form.pan_file.name}`
                            : (editMode || adminMode) && hasExistingPan
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
                  subtitle="Browser access and Google for Docs, Sheets, and Meet"
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
                    <div className="col-span-12">
                      <SummaryItem
                        label="Google"
                        value={
                          adminMode
                            ? "Employee must connect on their login"
                            : googleConnected
                              ? googleEmail
                                ? `Connected · ${googleEmail}`
                                : "Connected"
                              : "Required — not connected"
                        }
                        status={
                          adminMode || googleConnected ? "verified" : "denied"
                        }
                      />
                    </div>
                  </div>
                </SummaryBlock>

                {requirePassword ? (
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
          </div>

          <div className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 flex flex-col gap-2 sm:gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {submitError && step === 4 ? (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-destructive">Couldn't finish onboarding</p>
                    <p className="break-words text-xs text-foreground/90">{submitError.message}</p>
                  </div>
                </div>
                {submitError.step !== null ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-xl"
                    onClick={() => {
                      const target = submitError.step;
                      setSubmitError(null);
                      if (target !== null) void goToStep(target);
                    }}
                  >
                    Fix in {STEPS[submitError.step].label}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {nextBlockedHint ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 order-first sm:order-none">
                {nextBlockedHint}
              </p>
            ) : null}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                {canCloseWizard ? (
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
                        {editMode || adminMode
                          ? "Saving…"
                          : uploadPercent != null && uploadPercent < 100
                            ? `Uploading ${uploadPercent}%`
                            : "Finalizing…"}
                      </>
                    ) : editMode || adminMode ? (
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
