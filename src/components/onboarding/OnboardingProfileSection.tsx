import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import { OnboardingVerificationBadge } from "@/components/onboarding/OnboardingVerificationBanner";
import {
  onboardingService,
  type UserOnboardingDetails,
} from "@/services/onboardingService";
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
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{value}</p>
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
}: OnboardingProfileSectionProps) {
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"verify" | "reject" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [previewBusyKey, setPreviewBusyKey] = useState<string | null>(null);
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
    if (!reviewOpen) return;
    window.history.pushState({ onboardingReview: true }, "");
    const onPop = () => {
      if (verifying) return;
      setPendingDecision(null);
      setReviewOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [reviewOpen, verifying]);

  const closeReview = () => {
    if (verifying) return;
    setPendingDecision(null);
    setReviewOpen(false);
    if (window.history.state?.onboardingReview) {
      window.history.back();
    }
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

  const runVerification = async (action: "verify" | "reject") => {
    if (verifying) return;
    setVerifying(true);

    // Why: Close immediately — mail/WhatsApp/push must not keep Confirm verify spinning.
    const decision = action;
    setPendingDecision(null);
    setReviewOpen(false);
    if (window.history.state?.onboardingReview) {
      window.history.back();
    }
    toast({
      title: decision === "verify" ? "Verifying…" : "Updating…",
      description:
        decision === "verify"
          ? "Marking documents as verified."
          : "Marking onboarding as rejected.",
    });

    try {
      await onboardingService.verify(userId, decision);
      await queryClient.invalidateQueries({ queryKey: ["onboarding-details", userId] });
      await queryClient.invalidateQueries({ queryKey: ["userDetails"] });
      toast({
        title: decision === "verify" ? "Employee verified" : "Marked as rejected",
        description:
          decision === "verify"
            ? "Onboarding documents are now verified."
            : "The employee will see a rejected status banner.",
      });
    } catch (err) {
      toast({
        title: "Verification update failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setReviewOpen(true);
      setPendingDecision(decision);
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
                onClick={() => {
                  setPendingDecision(null);
                  setReviewOpen(true);
                }}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Review & decide
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Address</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Emergency contact" value={details.emergency_contact} />
            <DetailRow
              label="Emergency verified"
              value={formatWhen(details.emergency_contact_verified_at)}
            />
            <DetailRow label="Contact email" value={details.contact_email} />
            <DetailRow
              label="Email verified"
              value={formatWhen(details.contact_email_verified_at)}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="House" value={details.house_name_number} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Landmark" value={details.landmark} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="City" value={details.city} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Post office" value={details.post_office} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="PIN" value={details.pin_code} />
          </div>
          <div className="col-span-12 md:col-span-4">
            <DetailRow label="District" value={details.district} />
          </div>
          <div className="col-span-12 md:col-span-4">
            <DetailRow label="State" value={details.state} />
          </div>
          <div className="col-span-12 md:col-span-4">
            <DetailRow label="Country" value={details.country} />
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">WFH Location</CardTitle>
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
        <CardContent className="p-4 sm:p-5 pt-0 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Account holder" value={details.account_holder_name} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Bank" value={details.bank_name} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Account number" value={details.account_number} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="IFSC" value={details.ifsc_code} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Branch" value={details.branch_name} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="Account type" value={details.account_type} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="UPI ID" value={details.upi_id} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <DetailRow label="UPI phone" value={details.upi_linked_phone} />
          </div>
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
          className="w-[min(96vw,980px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden z-[1000]"
          overlayClassName="z-[1000]"
          showCloseButton={!verifying}
        >
          <DialogHeader className="border-b border-border/50 px-5 sm:px-6 py-5 text-left space-y-2">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Review onboarding
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Check the employee summary and documents below, then reject or verify.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
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
          </div>

          <DialogFooter className="border-t border-border/50 px-5 sm:px-6 py-4 gap-3 sm:justify-between flex-col sm:flex-row">
            {!pendingDecision ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-11 order-3 sm:order-1"
                  disabled={verifying}
                  onClick={closeReview}
                >
                  Close
                </Button>
                <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={verifying || verificationStatus === "rejected"}
                    onClick={() => setPendingDecision("reject")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl h-11"
                    disabled={verifying || verificationStatus === "verified"}
                    onClick={() => setPendingDecision("verify")}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </>
            ) : (
              <div
                className={cn(
                  "w-full rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  pendingDecision === "verify"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="flex items-start gap-2 min-w-0">
                  {pendingDecision === "verify" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {pendingDecision === "verify"
                        ? "Confirm verification?"
                        : "Confirm rejection?"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pendingDecision === "verify"
                        ? "Marks statutory and banking documents as verified for this employee."
                        : "Employee will see a rejected banner until you verify later."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-10"
                    disabled={verifying}
                    onClick={() => setPendingDecision(null)}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl h-10"
                    variant={pendingDecision === "reject" ? "destructive" : "default"}
                    disabled={verifying}
                    onClick={() => void runVerification(pendingDecision)}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving…
                      </>
                    ) : pendingDecision === "verify" ? (
                      "Confirm verify"
                    ) : (
                      "Confirm reject"
                    )}
                  </Button>
                </div>
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
