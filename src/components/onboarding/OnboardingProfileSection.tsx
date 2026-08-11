import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import {
  ONBOARDING_REJECTION_REASONS,
  type OnboardingRejectionReasonCode,
} from "@/lib/onboardingRejectionReasons";
import { OnboardingVerificationBadge } from "@/components/onboarding/OnboardingVerificationBanner";
import {
  onboardingService,
  type UserOnboardingDetails,
} from "@/services/onboardingService";
import { userService } from "@/services/userService";
import type { User } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import L from "leaflet";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/** Why: Deep-link + browser Back close the admin review workspace. */
const REVIEW_QUERY_KEY = "review";
const REVIEW_QUERY_VALUE = "onboarding";

const HR_JOB_LEVELS = [
  "Founder",
  "Head",
  "Senior",
  "Junior",
  "Intern",
  "Freelancer",
  "Contract",
] as const;

const HR_CONTRACT_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "remote", label: "Remote" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "other", label: "Other" },
] as const;

type HrEmploymentForm = {
  joining_date: string;
  employee_code: string;
  job_title: string;
  job_level: string;
  department: string;
  reports_to_user_id: string;
  contract_type: string;
  offer_letter_issued: boolean;
  probation_end_date: string;
};

const EMPTY_HR_FORM: HrEmploymentForm = {
  joining_date: "",
  employee_code: "",
  job_title: "",
  job_level: "",
  department: "",
  reports_to_user_id: "",
  contract_type: "",
  offer_letter_issued: false,
  probation_end_date: "",
};

function hrFormFromUser(user?: {
  joining_date?: string | null;
  employee_code?: string | null;
  job_title?: string | null;
  job_level?: string | null;
  department?: string | null;
  reports_to_user_id?: string | null;
  contract_type?: string | null;
  offer_letter_issued?: number | boolean | null;
  probation_end_date?: string | null;
} | null): HrEmploymentForm {
  return {
    joining_date: String(user?.joining_date || "").slice(0, 10),
    employee_code: String(user?.employee_code || ""),
    job_title: String(user?.job_title || ""),
    job_level: String(user?.job_level || ""),
    department: String(user?.department || ""),
    reports_to_user_id: String(user?.reports_to_user_id || ""),
    contract_type: String(user?.contract_type || ""),
    offer_letter_issued: Number(user?.offer_letter_issued) === 1,
    probation_end_date: String(user?.probation_end_date || "").slice(0, 10),
  };
}

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function DetailRow({
  label,
  value,
  showEmpty = false,
}: {
  label: string;
  value?: string | null;
  /** When true, render "—" instead of hiding the row */
  showEmpty?: boolean;
}) {
  const display = (value || "").trim();
  if (!display && !showEmpty) return null;
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{display || "—"}</p>
    </div>
  );
}

type DetailCell = { label: string; value?: string | null };

/**
 * Why: Fixed-column table keeps label/value rows horizontally aligned
 * across the Employment / Address / Banking profile cards.
 */
function DetailTable({
  columns,
  cells,
}: {
  columns: 2 | 3;
  cells: DetailCell[];
}) {
  const rows: DetailCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const slice = cells.slice(i, i + columns);
    while (slice.length < columns) {
      slice.push({ label: "", value: null });
    }
    rows.push(slice);
  }

  return (
    <div className="w-full overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
      <table className="w-full table-fixed border-collapse">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={`${ri}-${ci}-${cell.label || "empty"}`}
                  className={cn(
                    "align-top py-2.5 px-3 first:pl-0 last:pr-0 min-w-0",
                    ri > 0 && "border-t border-border/50"
                  )}
                  style={{ width: `${100 / columns}%` }}
                >
                  {cell.label ? (
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{cell.label}</p>
                      <p className="text-sm text-foreground break-words mt-0.5">
                        {(cell.value || "").trim() || "—"}
                      </p>
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="col-span-12 sm:col-span-6 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3 min-w-0">
      <div className="h-9 w-9 rounded-xl bg-background border border-border/50 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">
          {(value || "").trim() || "—"}
        </p>
      </div>
    </div>
  );
}

function formatWhen(iso?: string | null) {
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
}

function maskAccount(value?: string | null) {
  const digits = (value || "").replace(/\s/g, "");
  if (digits.length < 4) return digits || "—";
  return `${"•".repeat(Math.min(digits.length - 4, 8))}${digits.slice(-4)}`;
}

function DocButton({
  label,
  present,
  onPreview,
  onDownload,
  hint,
  previewBusy,
}: {
  label: string;
  present?: boolean;
  onPreview: () => void;
  onDownload: () => void;
  hint?: string;
  previewBusy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          {hint ? <p className="text-[11px] text-muted-foreground truncate">{hint}</p> : null}
        </div>
      </div>
      {present ? (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={previewBusy}
            onClick={onPreview}
          >
            {previewBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Eye className="h-3.5 w-3.5 mr-1" />
            )}
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={onDownload}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Download
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground shrink-0">Not uploaded</span>
      )}
    </div>
  );
}

function WfhMiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div
      className={cn(
        "h-48 rounded-xl overflow-hidden border relative z-0 isolate",
        // Leaflet panes default to z-index 400–700 and punch through Dialog (z-50).
        "[&_.leaflet-container]:!z-0 [&_.leaflet-pane]:!z-[1]",
        "[&_.leaflet-control]:!z-[2] [&_.leaflet-top]:!z-[2] [&_.leaflet-bottom]:!z-[2]"
      )}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full !z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}

interface OnboardingProfileSectionProps {
  userId: string;
  /** Optional hint; if omitted, loaded from get_onboarding */
  onboardingCompleted?: number | boolean | null;
  /** When true, show admin Verify / Reject actions */
  canVerify?: boolean;
  /** Optional identity enrichment from parent page */
  employeeName?: string;
  employeeUsername?: string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeRole?: string;
  employeeAvatar?: string | null;
  /** Optional HR fallbacks from parent user payload */
  employeeJoiningDate?: string | null;
  employeeCode?: string | null;
  employeeJobTitle?: string | null;
  employeeJobLevel?: string | null;
  employeeDepartment?: string | null;
  employeeReportsTo?: string | null;
  employeeContractType?: string | null;
  employeeOfferLetterIssued?: number | boolean | null;
  employeeProbationEndDate?: string | null;
}

export function OnboardingProfileSection({
  userId,
  onboardingCompleted,
  canVerify = false,
  employeeName,
  employeeUsername,
  employeeEmail,
  employeePhone,
  employeeRole,
  employeeAvatar,
  employeeJoiningDate,
  employeeCode,
  employeeJobTitle,
  employeeJobLevel,
  employeeDepartment,
  employeeReportsTo,
  employeeContractType,
  employeeOfferLetterIssued,
  employeeProbationEndDate,
}: OnboardingProfileSectionProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewFromUrl = searchParams.get(REVIEW_QUERY_KEY) === REVIEW_QUERY_VALUE;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"verify" | "reject" | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<OnboardingRejectionReasonCode[]>([]);
  const [rejectionNote, setRejectionNote] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [previewBusyKey, setPreviewBusyKey] = useState<string | null>(null);
  const [hrForm, setHrForm] = useState<HrEmploymentForm>(EMPTY_HR_FORM);
  const [hrSaving, setHrSaving] = useState(false);
  const [hrRegenerating, setHrRegenerating] = useState(false);
  const [managerOptions, setManagerOptions] = useState<User[]>([]);
  const [docPreview, setDocPreview] = useState<{
    title: string;
    url: string;
    mime: string;
    fileKey: "aadhaar_file_path" | "pan_file_path" | "offer_letter_path" | "nda_path";
    filename: string;
  } | null>(null);

  const hintCompleted =
    onboardingCompleted === undefined || onboardingCompleted === null
      ? null
      : Number(onboardingCompleted) === 1;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["onboarding-details", userId],
    queryFn: () => onboardingService.get(userId),
    enabled: !!userId,
  });

  const completed =
    hintCompleted === true ||
    Number(data?.onboarding_completed ?? 0) === 1 ||
    !!data?.details;

  const verificationStatus =
    data?.onboarding_verification_status ||
    data?.user?.onboarding_verification_status ||
    "none";

  const details: UserOnboardingDetails | null = data?.details ?? null;

  const employee = useMemo(() => {
    const u = data?.user;
    return {
      name: employeeName || u?.username || "Employee",
      username: employeeUsername || u?.username || "—",
      email: employeeEmail || u?.email || details?.contact_email || "—",
      phone: employeePhone || u?.phone || details?.emergency_contact || "—",
      role: (employeeRole || u?.role || "member").replace(/_/g, " "),
      avatar: employeeAvatar || u?.avatar || null,
    };
  }, [
    data?.user,
    details?.contact_email,
    details?.emergency_contact,
    employeeAvatar,
    employeeEmail,
    employeeName,
    employeePhone,
    employeeRole,
    employeeUsername,
  ]);

  const coords = useMemo(() => {
    if (!details?.wfh_latitude || !details?.wfh_longitude) return null;
    const lat = Number(details.wfh_latitude);
    const lng = Number(details.wfh_longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }, [details]);

  const employment = useMemo(() => {
    const u = data?.user;
    const joining =
      u?.joining_date || employeeJoiningDate || null;
    const offerRaw =
      u?.offer_letter_issued ?? employeeOfferLetterIssued ?? null;
    return {
      employee_code: u?.employee_code || employeeCode || null,
      joining_date: joining,
      job_title: u?.job_title || employeeJobTitle || null,
      job_level: u?.job_level || employeeJobLevel || null,
      department: u?.department || employeeDepartment || null,
      reports_to:
        u?.reports_to_username || employeeReportsTo || null,
      contract_type: u?.contract_type || employeeContractType || null,
      offer_letter:
        offerRaw == null
          ? null
          : Number(offerRaw) === 1
            ? "Yes"
            : "No",
      probation_end_date:
        u?.probation_end_date || employeeProbationEndDate || null,
    };
  }, [
    data?.user,
    employeeCode,
    employeeContractType,
    employeeDepartment,
    employeeJobLevel,
    employeeJobTitle,
    employeeJoiningDate,
    employeeOfferLetterIssued,
    employeeProbationEndDate,
    employeeReportsTo,
  ]);

  useEffect(() => {
    // Fix default leaflet icon paths in some builds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  useEffect(() => {
    // Why: URL is source of truth — open on deep link / refresh, close on Back.
    if (reviewFromUrl) {
      if (canVerify) {
        setReviewOpen(true);
      } else {
        // No permission — strip stale review query.
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete(REVIEW_QUERY_KEY);
            return next;
          },
          { replace: true }
        );
      }
      return;
    }
    if (!verifying && !hrSaving) {
      setPendingDecision(null);
      setRejectionReasons([]);
      setRejectionNote("");
      setReviewOpen(false);
    }
  }, [reviewFromUrl, canVerify, verifying, hrSaving, setSearchParams]);

  useEffect(() => {
    if (!reviewOpen) return;
    setHrForm(
      hrFormFromUser({
        ...data?.user,
        joining_date: data?.user?.joining_date || employeeJoiningDate || null,
      })
    );
  }, [reviewOpen, data?.user, employeeJoiningDate]);

  useEffect(() => {
    if (!reviewOpen || !canVerify) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await userService.getUsers();
        if (cancelled) return;
        setManagerOptions(list.filter((u) => String(u.id) !== String(userId)));
      } catch {
        if (!cancelled) setManagerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewOpen, canVerify, userId]);

  useEffect(() => {
    if (pendingDecision !== "reject") return;
    const panel = document.getElementById("onboarding-reject-panel");
    panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [pendingDecision]);

  const openReview = () => {
    if (verifying || hrSaving) return;
    setPendingDecision(null);
    setRejectionReasons([]);
    setRejectionNote("");
    setReviewOpen(true);
    if (reviewFromUrl) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(REVIEW_QUERY_KEY, REVIEW_QUERY_VALUE);
        return next;
      },
      { replace: false }
    );
  };

  const closeReview = () => {
    if (verifying || hrSaving) return;
    setPendingDecision(null);
    setRejectionReasons([]);
    setRejectionNote("");
    setReviewOpen(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(REVIEW_QUERY_KEY);
        return next;
      },
      { replace: true }
    );
  };

  const resetRejectForm = () => {
    setRejectionReasons([]);
    setRejectionNote("");
  };

  const saveHrEmployment = async (opts?: { silent?: boolean }) => {
    if (!canVerify) return true;
    setHrSaving(true);
    try {
      await userService.updateUser(userId, {
        joining_date: hrForm.joining_date.trim() || null,
        employee_code: hrForm.employee_code.trim() || null,
        job_title: hrForm.job_title.trim() || null,
        job_level: hrForm.job_level.trim() || null,
        department: hrForm.department.trim() || null,
        reports_to_user_id: hrForm.reports_to_user_id.trim() || null,
        contract_type: hrForm.contract_type.trim() || null,
        offer_letter_issued: hrForm.offer_letter_issued,
        probation_end_date: hrForm.probation_end_date.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["onboarding-details", userId] });
      await queryClient.invalidateQueries({ queryKey: ["userDetails"] });
      if (!opts?.silent) {
        toast({
          title: "Employment saved",
          description: "HR details updated for this employee.",
        });
      }
      return true;
    } catch (err) {
      toast({
        title: "Could not save employment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setHrSaving(false);
    }
  };

  const regenerateEmployeeCode = async () => {
    if (!canVerify || hrRegenerating || hrSaving || verifying) return;
    setHrRegenerating(true);
    try {
      // Why: Persist join date first so cipher uses the value currently in the form.
      const updated = await userService.updateUser(userId, {
        joining_date: hrForm.joining_date.trim() || null,
        regenerate_employee_code: true,
      });
      setHrForm((prev) => ({
        ...prev,
        joining_date: String(updated.joining_date || prev.joining_date || "").slice(0, 10),
        employee_code: String(updated.employee_code || ""),
      }));
      await queryClient.invalidateQueries({ queryKey: ["onboarding-details", userId] });
      await queryClient.invalidateQueries({ queryKey: ["userDetails"] });
      toast({
        title: "Employee ID regenerated",
        description: updated.employee_code || "Code updated",
      });
    } catch (err) {
      toast({
        title: "Could not regenerate",
        description:
          err instanceof Error
            ? err.message
            : "Joining date and date of birth are required",
        variant: "destructive",
      });
    } finally {
      setHrRegenerating(false);
    }
  };

  const toggleRejectionReason = (code: OnboardingRejectionReasonCode) => {
    setRejectionReasons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const closeDocPreview = () => {
    setDocPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  useEffect(() => {
    return () => {
      if (docPreview?.url) URL.revokeObjectURL(docPreview.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (
    file: "aadhaar_file_path" | "pan_file_path" | "offer_letter_path" | "nda_path",
    filename: string
  ) => {
    try {
      const blob = await onboardingService.downloadFile(userId, file);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not download the document.",
        variant: "destructive",
      });
    }
  };

  const openPreview = async (
    file: "aadhaar_file_path" | "pan_file_path" | "offer_letter_path" | "nda_path",
    title: string,
    filename: string
  ) => {
    if (previewBusyKey) return;
    setPreviewBusyKey(file);
    try {
      const blob = await onboardingService.downloadFile(userId, file, { preview: true });
      const mime = (blob.type || "application/octet-stream").toLowerCase();
      const url = URL.createObjectURL(blob);
      setDocPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { title, url, mime, fileKey: file, filename };
      });
    } catch {
      toast({
        title: "Preview failed",
        description: "Could not open the document for preview.",
        variant: "destructive",
      });
    } finally {
      setPreviewBusyKey(null);
    }
  };

  const selectedRejectReasons = useMemo(
    () =>
      ONBOARDING_REJECTION_REASONS.filter((r) => rejectionReasons.includes(r.code)),
    [rejectionReasons]
  );

  const rejectRequiresNote = selectedRejectReasons.some((r) => r.requiresNote);

  const canConfirmReject =
    selectedRejectReasons.length > 0 &&
    (!rejectRequiresNote || rejectionNote.trim().length >= 3);

  const runVerification = async (action: "verify" | "reject") => {
    if (verifying || hrSaving) return;
    if (action === "reject" && !canConfirmReject) {
      toast({
        title: "Choose reasons",
        description: rejectRequiresNote
          ? "Add a short note so the employee knows what to fix."
          : "Select one or more reasons for rejecting this onboarding.",
        variant: "destructive",
      });
      return;
    }

    // Why: Persist HR employment before verify so Employee ID / title are not lost.
    if (action === "verify" && canVerify) {
      const saved = await saveHrEmployment({ silent: true });
      if (!saved) return;
    }

    setVerifying(true);

    // Why: Close immediately — mail/WhatsApp/push must not keep Confirm spinning.
    const decision = action;
    const reasonPayload =
      decision === "reject"
        ? {
            rejectionReasons: [...rejectionReasons],
            rejectionNote: rejectionNote.trim().slice(0, 500) || undefined,
          }
        : undefined;

    setPendingDecision(null);
    setRejectionReasons([]);
    setRejectionNote("");
    setReviewOpen(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(REVIEW_QUERY_KEY);
        return next;
      },
      { replace: true }
    );
    toast({
      title: decision === "verify" ? "Verifying…" : "Rejecting…",
      description:
        decision === "verify"
          ? "Marking documents as verified."
          : "Notifying the employee by email, WhatsApp, and push.",
    });

    try {
      await onboardingService.verify(userId, decision, reasonPayload);
      await queryClient.invalidateQueries({ queryKey: ["onboarding-details", userId] });
      await queryClient.invalidateQueries({ queryKey: ["userDetails"] });
      toast({
        title: decision === "verify" ? "Employee verified" : "Marked as rejected",
        description:
          decision === "verify"
            ? "Onboarding documents are now verified."
            : "Employee was notified with the reason and next step.",
      });
    } catch (err) {
      toast({
        title: "Verification update failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(REVIEW_QUERY_KEY, REVIEW_QUERY_VALUE);
          return next;
        },
        { replace: false }
      );
      setReviewOpen(true);
      setPendingDecision(decision);
      if (reasonPayload) {
        setRejectionReasons(reasonPayload.rejectionReasons);
        setRejectionNote(reasonPayload.rejectionNote || "");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 grid grid-cols-12 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="col-span-12 md:col-span-6 h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!completed) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-lg">Onboarding Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <p className="text-sm text-muted-foreground">
            Onboarding not completed yet. Statutory, banking, and address details will appear here after the wizard is finished.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !details) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-lg">Onboarding Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <p className="text-sm text-muted-foreground">
            Could not load onboarding details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const addressLine = [
    details.house_name_number,
    details.landmark,
    details.city,
    details.post_office,
    details.district,
    details.state,
    details.pin_code,
  ]
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid grid-cols-12 gap-4 sm:gap-6">
      <Card className="col-span-12 rounded-2xl shadow-sm border-border/60">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Document verification
            </p>
            <OnboardingVerificationBadge status={verificationStatus} />
            {data?.onboarding_verified_at ? (
              <p className="text-xs text-muted-foreground">
                HR updated {formatWhen(data.onboarding_verified_at)}
              </p>
            ) : null}
            {data?.onboarding_completed_at || data?.user?.onboarding_completed_at ? (
              <p className="text-xs text-muted-foreground">
                Wizard completed{" "}
                {formatWhen(
                  data.onboarding_completed_at || data.user?.onboarding_completed_at
                )}
              </p>
            ) : null}
          </div>
          {canVerify && completed ? (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                type="button"
                className="rounded-xl h-10"
                disabled={verifying}
                onClick={openReview}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Review & decide
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="col-span-12 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Employment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <DetailTable
            columns={3}
            cells={[
              { label: "Employee ID", value: employment.employee_code },
              {
                label: "Join date",
                value: employment.joining_date
                  ? new Date(
                      String(employment.joining_date).slice(0, 10) + "T00:00:00"
                    ).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : null,
              },
              { label: "Job title", value: employment.job_title },
              { label: "Job level", value: employment.job_level },
              { label: "Department", value: employment.department },
              { label: "Reports to", value: employment.reports_to },
              {
                label: "Contract type",
                value: employment.contract_type
                  ? String(employment.contract_type).replace(/_/g, " ")
                  : null,
              },
              { label: "Offer letter", value: employment.offer_letter },
              {
                label: "End date",
                value: employment.probation_end_date
                  ? new Date(
                      String(employment.probation_end_date).slice(0, 10) + "T00:00:00"
                    ).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "NILL",
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Address</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <DetailTable
            columns={2}
            cells={[
              { label: "Emergency contact", value: details.emergency_contact },
              { label: "House", value: details.house_name_number },
              {
                label: "Emergency verified",
                value: formatWhen(details.emergency_contact_verified_at),
              },
              { label: "Landmark", value: details.landmark },
              { label: "Contact email", value: details.contact_email },
              { label: "City", value: details.city },
              {
                label: "Email verified",
                value: formatWhen(details.contact_email_verified_at),
              },
              { label: "Post office", value: details.post_office },
              {
                label: "Date of birth",
                value: details.date_of_birth
                  ? new Date(
                      String(details.date_of_birth).slice(0, 10) + "T00:00:00"
                    ).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : null,
              },
              { label: "PIN", value: details.pin_code },
              {
                label: "Gender",
                value: details.gender
                  ? String(details.gender)
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : null,
              },
              { label: "District", value: details.district },
              {
                label: "Marital status",
                value: details.marital_status
                  ? String(details.marital_status).replace(/\b\w/g, (c) =>
                      c.toUpperCase()
                    )
                  : null,
              },
              { label: "State", value: details.state },
              { label: "Country", value: details.country },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Landmark className="h-4 w-4 text-primary shrink-0" />
              <CardTitle className="text-lg">WFH Location</CardTitle>
            </div>
            {coords ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl h-9 shrink-0"
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${coords.lat},${coords.lng}`
                  )}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <Navigation className="h-3.5 w-3.5 mr-1.5" />
                Directions
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
          {coords ? (
            <>
              <p className="text-sm text-muted-foreground">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
              {/* Unmount while review/preview dialogs are open so Leaflet cannot stack above them */}
              {!reviewOpen && !docPreview ? (
                <WfhMiniMap lat={coords.lat} lng={coords.lng} />
              ) : (
                <div className="h-48 rounded-xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center px-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Map hidden while reviewing documents
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No WFH coordinates saved.</p>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Statutory Documents</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 flex flex-col gap-3">
          <DetailRow label="Aadhaar" value={details.aadhaar_number} />
          <DetailRow label="PAN" value={details.pan_number} />
          <DocButton
            label="Aadhaar scan"
            present={details.has_aadhaar_file}
            previewBusy={previewBusyKey === "aadhaar_file_path"}
            onPreview={() => void openPreview("aadhaar_file_path", "Aadhaar scan", "aadhaar")}
            onDownload={() => download("aadhaar_file_path", "aadhaar")}
          />
          <DocButton
            label="PAN scan"
            present={details.has_pan_file}
            previewBusy={previewBusyKey === "pan_file_path"}
            onPreview={() => void openPreview("pan_file_path", "PAN scan", "pan")}
            onDownload={() => download("pan_file_path", "pan")}
          />
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Banking Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <DetailTable
            columns={2}
            cells={[
              { label: "Account holder", value: details.account_holder_name },
              { label: "Bank", value: details.bank_name },
              { label: "Account number", value: details.account_number },
              { label: "IFSC", value: details.ifsc_code },
              { label: "Branch", value: details.branch_name },
              { label: "Account type", value: details.account_type },
              { label: "UPI ID", value: details.upi_id },
              { label: "UPI phone", value: details.upi_linked_phone },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="col-span-12 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Agreements & verification times</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <DetailRow
              label="Terms accepted"
              value={formatWhen(data?.terms_accepted_at || data?.user?.terms_accepted_at)}
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <DetailRow
              label="Privacy accepted"
              value={formatWhen(data?.privacy_accepted_at || data?.user?.privacy_accepted_at)}
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <DetailRow
              label="Onboarding completed"
              value={formatWhen(
                data?.onboarding_completed_at || data?.user?.onboarding_completed_at
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Large review workspace — summary + documents, then decide */}
      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open) closeReview();
        }}
      >
        <DialogContent
          className="w-[min(96vw,980px)] max-w-none max-h-[min(92dvh,900px)] rounded-2xl p-0 gap-0 overflow-hidden z-[1000] flex flex-col"
          overlayClassName="z-[1000]"
          showCloseButton={!verifying && !hrSaving}
        >
          <DialogHeader className="border-b border-border/50 px-5 sm:px-6 py-5 text-left space-y-2 shrink-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Review onboarding
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Update employment details if needed, check documents, then reject or verify.
            </DialogDescription>
          </DialogHeader>

          {/* Why: Cap dialog to viewport; one scroll region so reject reasons aren't clipped by overflow-hidden footer. */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-5"
            style={{ scrollbarWidth: "thin" }}
          >
            <section className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-16 w-16 rounded-2xl overflow-hidden border border-border/60 bg-muted shrink-0">
                  {employee.avatar ? (
                    <img
                      src={resolveAvatarUrl(
                        employee.avatar,
                        employee.name || employee.username || "User"
                      )}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = resolveAvatarUrl(
                          null,
                          employee.name || employee.username || "User"
                        );
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <UserRound className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight truncate">
                      {employee.name}
                    </h3>
                    <OnboardingVerificationBadge status={verificationStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {employee.role} · @{employee.username}
                  </p>
                  {(data?.onboarding_completed_at ||
                    data?.user?.onboarding_completed_at) && (
                    <p className="text-xs text-muted-foreground">
                      Submitted{" "}
                      {formatWhen(
                        data?.onboarding_completed_at ||
                          data?.user?.onboarding_completed_at
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <SummaryChip icon={Mail} label="Email" value={employee.email} />
                <SummaryChip icon={Phone} label="Phone" value={employee.phone} />
                <SummaryChip icon={MapPin} label="Address" value={addressLine || "—"} />
                <SummaryChip
                  icon={Building2}
                  label="Banking"
                  value={
                    details.bank_name
                      ? `${details.bank_name} · ${maskAccount(details.account_number)} · ${details.ifsc_code || "—"}`
                      : "—"
                  }
                />
              </div>
            </section>

            {canVerify ? (
              <section className="rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm font-semibold tracking-tight">Employment (HR)</h3>
                    <p className="text-xs text-muted-foreground">
                      Set join date, Employee ID, role, and contract before verifying. Saved
                      when you confirm verify.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 shrink-0"
                    disabled={hrSaving || verifying || hrRegenerating}
                    onClick={() => void saveHrEmployment()}
                  >
                    {hrSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : null}
                    Save employment
                  </Button>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label>Join date</Label>
                    <DatePicker
                      value={hrForm.joining_date || ""}
                      onChange={(v) =>
                        setHrForm((p) => ({ ...p, joining_date: v || "" }))
                      }
                      placeholder="Pick joining date"
                      className="h-11 rounded-xl"
                      disabled={hrSaving || verifying}
                      disableFuture
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label htmlFor="hr-employee-code">Employee ID</Label>
                    <div className="flex gap-2 min-w-0">
                      <Input
                        id="hr-employee-code"
                        value={hrForm.employee_code}
                        maxLength={32}
                        disabled={hrSaving || verifying}
                        placeholder="CODO-XXXX-XXXX"
                        className="h-11 rounded-xl font-mono text-sm"
                        onChange={(e) =>
                          setHrForm((p) => ({
                            ...p,
                            employee_code: e.target.value.toUpperCase().slice(0, 32),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-11 rounded-xl shrink-0 px-0"
                        title="Regenerate from join date + DOB"
                        disabled={hrSaving || verifying || hrRegenerating}
                        onClick={() => void regenerateEmployeeCode()}
                      >
                        {hrRegenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label htmlFor="hr-job-title">Job title</Label>
                    <Input
                      id="hr-job-title"
                      value={hrForm.job_title}
                      maxLength={200}
                      disabled={hrSaving || verifying}
                      placeholder="e.g. Full Stack Developer"
                      className="h-11 rounded-xl"
                      onChange={(e) =>
                        setHrForm((p) => ({
                          ...p,
                          job_title: e.target.value.slice(0, 200),
                        }))
                      }
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label>Job level</Label>
                    <Select
                      value={hrForm.job_level || undefined}
                      onValueChange={(v) => setHrForm((p) => ({ ...p, job_level: v }))}
                      disabled={hrSaving || verifying}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-xl z-[1100]">
                        {HR_JOB_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label htmlFor="hr-department">Department</Label>
                    <Input
                      id="hr-department"
                      value={hrForm.department}
                      maxLength={150}
                      disabled={hrSaving || verifying}
                      placeholder="e.g. CODO Agency - Development"
                      className="h-11 rounded-xl"
                      onChange={(e) =>
                        setHrForm((p) => ({
                          ...p,
                          department: e.target.value.slice(0, 150),
                        }))
                      }
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label>Reports to</Label>
                    <Select
                      value={hrForm.reports_to_user_id || "__none__"}
                      onValueChange={(v) =>
                        setHrForm((p) => ({
                          ...p,
                          reports_to_user_id: v === "__none__" ? "" : v,
                        }))
                      }
                      disabled={hrSaving || verifying}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="rounded-xl z-[1100] max-h-64"
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
                  </div>

                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label>Contract type</Label>
                    <Select
                      value={hrForm.contract_type || "__none__"}
                      onValueChange={(v) =>
                        setHrForm((p) => ({
                          ...p,
                          contract_type: v === "__none__" ? "" : v,
                        }))
                      }
                      disabled={hrSaving || verifying}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-xl z-[1100]">
                        <SelectItem value="__none__">Not set</SelectItem>
                        {HR_CONTRACT_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Label>End date (probation)</Label>
                    <DatePicker
                      value={hrForm.probation_end_date || ""}
                      onChange={(v) =>
                        setHrForm((p) => ({ ...p, probation_end_date: v || "" }))
                      }
                      placeholder="Optional / NILL"
                      className="h-11 rounded-xl"
                      disabled={hrSaving || verifying}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6 flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-2.5 min-h-11">
                    <div className="min-w-0">
                      <Label htmlFor="hr-offer-letter">Offer letter</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mark Yes when issued
                      </p>
                    </div>
                    <Switch
                      id="hr-offer-letter"
                      checked={hrForm.offer_letter_issued}
                      disabled={hrSaving || verifying}
                      onCheckedChange={(checked) =>
                        setHrForm((p) => ({ ...p, offer_letter_issued: checked }))
                      }
                    />
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight">Documents</h3>
                <p className="text-xs text-muted-foreground">
                  Download and inspect statutory scans before deciding.
                </p>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-6">
                  <DocButton
                    label="Aadhaar scan"
                    hint={details.aadhaar_number || undefined}
                    present={details.has_aadhaar_file}
                    previewBusy={previewBusyKey === "aadhaar_file_path"}
                    onPreview={() =>
                      void openPreview("aadhaar_file_path", "Aadhaar scan", "aadhaar")
                    }
                    onDownload={() => download("aadhaar_file_path", "aadhaar")}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <DocButton
                    label="PAN scan"
                    hint={details.pan_number || "Optional"}
                    present={details.has_pan_file}
                    previewBusy={previewBusyKey === "pan_file_path"}
                    onPreview={() => void openPreview("pan_file_path", "PAN scan", "pan")}
                    onDownload={() => download("pan_file_path", "pan")}
                  />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-6 rounded-2xl border border-border/60 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Statutory
                </p>
                <DetailRow label="Aadhaar number" value={details.aadhaar_number} />
                <DetailRow label="PAN number" value={details.pan_number} />
                <DetailRow
                  label="Emergency verified"
                  value={formatWhen(details.emergency_contact_verified_at) || "Pending"}
                />
                <DetailRow
                  label="Email verified"
                  value={formatWhen(details.contact_email_verified_at) || "Pending"}
                />
              </div>
              <div className="col-span-12 md:col-span-6 rounded-2xl border border-border/60 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Payroll
                </p>
                <DetailRow label="Account holder" value={details.account_holder_name} />
                <DetailRow
                  label="Bank / branch"
                  value={[details.bank_name, details.branch_name].filter(Boolean).join(" · ")}
                />
                <DetailRow label="Account" value={details.account_number} />
                <DetailRow label="IFSC" value={details.ifsc_code} />
              </div>
            </section>

            {pendingDecision === "reject" && (
              <section
                id="onboarding-reject-panel"
                className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 flex flex-col gap-4"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Reject with reasons</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select one or more issues. The employee gets email, WhatsApp, and a push
                      notification with the next steps.
                    </p>
                  </div>
                </div>

                <div
                  className="grid grid-cols-12 gap-2"
                  role="group"
                  aria-label="Rejection reasons"
                >
                  {ONBOARDING_REJECTION_REASONS.map((reason) => {
                    const selected = rejectionReasons.includes(reason.code);
                    return (
                      <button
                        key={reason.code}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        disabled={verifying}
                        onClick={() => toggleRejectionReason(reason.code)}
                        className={cn(
                          "col-span-12 text-left rounded-xl border px-3.5 py-3 transition-colors",
                          selected
                            ? "border-destructive/50 bg-destructive/10 ring-1 ring-destructive/30"
                            : "border-border/60 bg-background/60 hover:bg-muted/40"
                        )}
                      >
                        <p className="text-sm font-medium text-foreground">{reason.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {reason.action}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {selectedRejectReasons.length > 0 && (
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12">
                      <label
                        htmlFor="onboarding-rejection-note"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {rejectRequiresNote
                          ? "Note for employee (required)"
                          : "Optional note for employee"}
                      </label>
                      <Textarea
                        id="onboarding-rejection-note"
                        value={rejectionNote}
                        maxLength={500}
                        disabled={verifying}
                        placeholder="e.g. Photo looks like someone else — please upload your own clear photo."
                        className="mt-1.5 rounded-xl min-h-[72px] resize-y"
                        onChange={(e) => setRejectionNote(e.target.value.slice(0, 500))}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {rejectionNote.length}/500
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          <DialogFooter className="border-t border-border/50 px-5 sm:px-6 py-4 gap-3 sm:justify-between flex-col sm:flex-row shrink-0">
            {!pendingDecision ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-11 order-3 sm:order-1"
                  disabled={verifying || hrSaving}
                  onClick={closeReview}
                >
                  Close
                </Button>
                <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={verifying || hrSaving || verificationStatus === "rejected"}
                    onClick={() => setPendingDecision("reject")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl h-11"
                    disabled={verifying || hrSaving || verificationStatus === "verified"}
                    onClick={() => setPendingDecision("verify")}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </>
            ) : pendingDecision === "verify" ? (
              <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Confirm verification?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Saves employment details, then marks statutory and banking documents as
                      verified.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-10"
                    disabled={verifying || hrSaving}
                    onClick={() => setPendingDecision(null)}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl h-10"
                    disabled={verifying || hrSaving}
                    onClick={() => void runVerification("verify")}
                  >
                    {verifying || hrSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving…
                      </>
                    ) : (
                      "Confirm verify"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-10"
                  disabled={verifying}
                  onClick={() => {
                    setPendingDecision(null);
                    resetRejectForm();
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="rounded-xl h-10"
                  variant="destructive"
                  disabled={verifying || !canConfirmReject}
                  onClick={() => void runVerification("reject")}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    "Confirm reject & notify"
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document preview popup */}
      <Dialog
        open={!!docPreview}
        onOpenChange={(open) => {
          if (!open) closeDocPreview();
        }}
      >
        <DialogContent
          className="w-[min(96vw,920px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden z-[1000]"
          overlayClassName="z-[1000]"
        >
          <DialogHeader className="border-b border-border/50 px-5 sm:px-6 py-4 text-left space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {docPreview?.title || "Document preview"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Inspect the scan in-place. Download if you need an offline copy.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/20 px-4 sm:px-5 py-4 min-h-[min(60vh,520px)] flex items-center justify-center">
            {docPreview ? (
              docPreview.mime.startsWith("image/") ? (
                <img
                  src={docPreview.url}
                  alt={docPreview.title}
                  className="max-h-[min(58vh,500px)] max-w-full rounded-xl object-contain shadow-sm border border-border/40 bg-background"
                />
              ) : docPreview.mime.includes("pdf") ? (
                <iframe
                  title={docPreview.title}
                  src={docPreview.url}
                  className="h-[min(58vh,500px)] w-full rounded-xl border border-border/40 bg-background"
                />
              ) : (
                <div className="text-center space-y-3 max-w-sm px-4">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This file type cannot be previewed in the browser. Download it to open locally.
                  </p>
                </div>
              )
            ) : null}
          </div>

          <DialogFooter className="border-t border-border/50 px-5 sm:px-6 py-4 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl h-10"
              onClick={closeDocPreview}
            >
              Close
            </Button>
            {docPreview ? (
              <Button
                type="button"
                className="rounded-xl h-10"
                onClick={() =>
                  void download(docPreview.fileKey, docPreview.filename)
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
