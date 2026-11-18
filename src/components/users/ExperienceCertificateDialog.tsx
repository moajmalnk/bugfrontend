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
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  buildCatalogCertificateSuggestion,
  matchCertificateRolePack,
} from "@/lib/experienceCertificateSuggestions";
import {
  downloadExperienceCertificatePdf,
  type ExperienceCertificatePayload,
} from "@/lib/pdf/experienceCertificatePdf";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import type { User } from "@/types";
import { Award, Loader2, Sparkles } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CONTRACT_PHRASE: Record<string, string> = {
  full_time: "full-time",
  remote: "remote",
  part_time: "part-time",
  contract: "contract",
  intern: "internship",
  probation: "probation",
  freelancer: "freelance",
  other: "full-time",
};

type FormState = {
  fullName: string;
  salutation: "Mr" | "Ms" | "Mx";
  designation: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  referenceNo: string;
  certificateDate: string;
  assessment: string;
  technologies: string;
  responsibilities: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  salutation: "Mr",
  designation: "",
  employmentType: "full-time",
  startDate: "",
  endDate: "",
  referenceNo: "",
  certificateDate: "",
  assessment: "",
  technologies: "",
  responsibilities: "",
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoDateOnly(value?: string | null): string {
  const raw = String(value || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function buildReferenceNo(userId: string | number): string {
  const year = new Date().getFullYear();
  const padded = String(userId).replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `CODO/HR/EXP/${year}/${padded || "0001"}`;
}

function employmentPhrase(contractType?: string | null): string {
  const key = String(contractType || "")
    .trim()
    .toLowerCase();
  if (!key) return "full-time";
  return CONTRACT_PHRASE[key] || key.replace(/_/g, "-");
}

function linesFromText(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function buildInitialForm(
  user: Pick<
    User,
    "id" | "name" | "job_title" | "contract_type" | "joining_date" | "role"
  >,
  overrides?: Partial<{
    job_title: string | null;
    contract_type: string | null;
    joining_date: string | null;
  }>
): FormState {
  const jobTitle = (overrides?.job_title ?? user.job_title ?? "").trim();
  const contract = overrides?.contract_type ?? user.contract_type;
  const joining = isoDateOnly(overrides?.joining_date ?? user.joining_date);
  const suggested = buildCatalogCertificateSuggestion({
    designation: jobTitle,
    appRole: user.role,
    salutation: "Mr",
  });
  return {
    fullName: (user.name || "").trim(),
    salutation: "Mr",
    designation: jobTitle,
    employmentType: employmentPhrase(contract),
    startDate: joining,
    endDate: todayIso(),
    referenceNo: buildReferenceNo(user.id),
    certificateDate: todayIso(),
    assessment: suggested.assessment,
    technologies: suggested.technologies,
    responsibilities: suggested.responsibilities,
  };
}

function serializeForm(form: FormState): string {
  return JSON.stringify(form);
}

export type ExperienceCertificateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Pick<
    User,
    "id" | "name" | "job_title" | "contract_type" | "joining_date" | "role"
  > | null;
  jobTitleFallback?: string | null;
  contractTypeFallback?: string | null;
  joiningDateFallback?: string | null;
};

export function ExperienceCertificateDialog({
  open,
  onOpenChange,
  user,
  jobTitleFallback,
  contractTypeFallback,
  joiningDateFallback,
}: ExperienceCertificateDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );
  const [generating, setGenerating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [lastSuggestSource, setLastSuggestSource] = useState<"ai" | "catalog" | null>(
    null
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setBaseline("");
    setErrors({});
    setGenerating(false);
    setSuggesting(false);
    setDiscardOpen(false);
    setLastSuggestSource(null);
  }, []);

  useEffect(() => {
    if (!open || !user) {
      if (!open) resetForm();
      return;
    }
    const initial = buildInitialForm(user, {
      job_title: jobTitleFallback ?? user.job_title,
      contract_type: contractTypeFallback ?? user.contract_type,
      joining_date: joiningDateFallback ?? user.joining_date,
    });
    setForm(initial);
    setBaseline(serializeForm(initial));
    setErrors({});
    setGenerating(false);
    setSuggesting(false);
    setDiscardOpen(false);
    setLastSuggestSource("catalog");
  }, [
    open,
    user,
    jobTitleFallback,
    contractTypeFallback,
    joiningDateFallback,
    resetForm,
  ]);

  const matchedPack = useMemo(
    () => matchCertificateRolePack(form.designation, user?.role),
    [form.designation, user?.role]
  );

  const isDirty = useMemo(
    () => Boolean(baseline) && serializeForm(form) !== baseline,
    [form, baseline]
  );

  const validateField = useCallback(
    (key: keyof FormState, value: string): string => {
      const v = value.trim();
      switch (key) {
        case "fullName":
          return v ? "" : "Full name is required";
        case "designation":
          return v ? "" : "Designation is required";
        case "employmentType":
          return v ? "" : "Employment type is required";
        case "startDate":
          return /^\d{4}-\d{2}-\d{2}$/.test(v) ? "" : "Start date is required";
        case "endDate":
          return /^\d{4}-\d{2}-\d{2}$/.test(v) ? "" : "End date is required";
        case "referenceNo":
          return v ? "" : "Reference number is required";
        case "certificateDate":
          return /^\d{4}-\d{2}-\d{2}$/.test(v)
            ? ""
            : "Certificate date is required";
        case "assessment":
          return v ? "" : "Assessment paragraph is required";
        case "responsibilities":
          return linesFromText(v).length > 0
            ? ""
            : "Add at least one responsibility";
        default:
          return "";
      }
    },
    []
  );

  const isValid = useMemo(() => {
    const required: (keyof FormState)[] = [
      "fullName",
      "designation",
      "employmentType",
      "startDate",
      "endDate",
      "referenceNo",
      "certificateDate",
      "assessment",
      "responsibilities",
    ];
    return required.every((key) => !validateField(key, form[key]));
  }, [form, validateField]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === "string") {
      setErrors((prev) => ({
        ...prev,
        [key]: validateField(key, value),
      }));
    }
  };

  const applySuggestion = useCallback(
    (next: {
      technologies: string;
      responsibilities: string;
      assessment: string;
      source: "ai" | "catalog";
      packLabel?: string;
    }) => {
      setForm((prev) => ({
        ...prev,
        technologies: next.technologies.slice(0, 4000),
        responsibilities: next.responsibilities.slice(0, 4000),
        assessment: next.assessment.slice(0, 800),
      }));
      setErrors((prev) => ({
        ...prev,
        technologies: "",
        responsibilities: "",
        assessment: "",
      }));
      setLastSuggestSource(next.source);
      toast({
        title:
          next.source === "ai"
            ? "AI suggestions applied"
            : "Role suggestions applied",
        description: next.packLabel
          ? `Based on ${next.packLabel}. Edit freely before download.`
          : "Edit freely before download.",
      });
    },
    [toast]
  );

  const handleSuggest = async () => {
    if (suggesting || generating) return;
    if (!form.designation.trim()) {
      setErrors((prev) => ({
        ...prev,
        designation: "Designation is required for suggestions",
      }));
      return;
    }

    setSuggesting(true);
    try {
      const data = await userService.suggestExperienceCertificate({
        designation: form.designation.trim(),
        app_role: user?.role,
        salutation: form.salutation,
        full_name: form.fullName.trim(),
        employment_type: form.employmentType.trim(),
      });
      applySuggestion({
        technologies: data.technologies,
        responsibilities: data.responsibilities,
        assessment: data.assessment,
        source: data.source,
        packLabel: data.pack_label,
      });
    } catch {
      // Instant local catalog if API fails
      const local = buildCatalogCertificateSuggestion({
        designation: form.designation,
        appRole: user?.role,
        salutation: form.salutation,
      });
      applySuggestion({
        technologies: local.technologies,
        responsibilities: local.responsibilities,
        assessment: local.assessment,
        source: "catalog",
        packLabel: local.packLabel,
      });
    } finally {
      setSuggesting(false);
    }
  };

  const requestClose = () => {
    if (generating || suggesting) return;
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    if (generating || suggesting || !isValid) return;
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    (
      [
        "fullName",
        "designation",
        "employmentType",
        "startDate",
        "endDate",
        "referenceNo",
        "certificateDate",
        "assessment",
        "responsibilities",
      ] as const
    ).forEach((key) => {
      const err = validateField(key, form[key]);
      if (err) nextErrors[key] = err;
    });
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setGenerating(true);
    try {
      const payload: ExperienceCertificatePayload = {
        fullName: form.fullName.trim().slice(0, 120),
        salutation: form.salutation,
        designation: form.designation.trim().slice(0, 120),
        employmentType: form.employmentType.trim().slice(0, 60),
        startDate: form.startDate,
        endDate: form.endDate,
        referenceNo: form.referenceNo.trim().slice(0, 80),
        certificateDate: form.certificateDate,
        assessment: form.assessment.trim().slice(0, 800),
        technologies: form.technologies.trim().slice(0, 4000),
        responsibilities: form.responsibilities.trim().slice(0, 4000),
      };
      await downloadExperienceCertificatePdf(payload);
      toast({
        title: "Certificate downloaded",
        description: "Experience certificate PDF is ready.",
      });
      setBaseline(serializeForm(form));
      onOpenChange(false);
      resetForm();
    } catch {
      toast({
        title: "Download failed",
        description: "Could not generate the certificate. Try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const busy = generating || suggesting;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="max-w-[720px] w-[calc(100%-1.5rem)] rounded-2xl max-h-[90vh] overflow-y-auto p-0 gap-0"
          onPointerDownOutside={(e) => {
            if (busy || isDirty) e.preventDefault();
            if (isDirty && !busy) setDiscardOpen(true);
          }}
          onEscapeKeyDown={(e) => {
            if (busy) {
              e.preventDefault();
              return;
            }
            if (isDirty) {
              e.preventDefault();
              setDiscardOpen(true);
            }
          }}
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Experience Certificate
            </DialogTitle>
            <DialogDescription>
              CODO letterhead PDF — role suggestions for Technologies &amp;
              Responsibilities, then customize before download.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 grid grid-cols-12 gap-4">
            <Field
              className="col-span-12 sm:col-span-3"
              label="Salutation"
              error={errors.salutation}
            >
              <Select
                value={form.salutation}
                onValueChange={(v) =>
                  updateField("salutation", v as FormState["salutation"])
                }
                disabled={busy}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Mx">Mx</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              className="col-span-12 sm:col-span-9"
              label="Full name"
              error={errors.fullName}
              required
            >
              <Input
                className="h-10 rounded-xl"
                maxLength={120}
                value={form.fullName}
                disabled={busy}
                onChange={(e) =>
                  updateField("fullName", e.target.value.slice(0, 120))
                }
              />
            </Field>

            <Field
              className="col-span-12 sm:col-span-6"
              label="Designation / role"
              error={errors.designation}
              required
              hint={`Matched pack: ${matchedPack.label}`}
            >
              <Input
                className="h-10 rounded-xl"
                maxLength={120}
                value={form.designation}
                disabled={busy}
                onChange={(e) =>
                  updateField("designation", e.target.value.slice(0, 120))
                }
              />
            </Field>

            <Field
              className="col-span-12 sm:col-span-6"
              label="Employment type"
              error={errors.employmentType}
              required
            >
              <Input
                className="h-10 rounded-xl"
                maxLength={60}
                value={form.employmentType}
                disabled={busy}
                onChange={(e) =>
                  updateField("employmentType", e.target.value.slice(0, 60))
                }
                placeholder="full-time"
              />
            </Field>

            <Field
              className="col-span-12 sm:col-span-6"
              label="Start date"
              error={errors.startDate}
              required
            >
              <DatePicker
                value={form.startDate}
                onChange={(value) => updateField("startDate", value)}
                placeholder="Pick start date"
                className="h-10 rounded-xl"
                disabled={busy}
                disableFuture
                fromYear={new Date().getFullYear() - 40}
                toYear={new Date().getFullYear()}
              />
            </Field>

            <Field
              className="col-span-12 sm:col-span-6"
              label="End date"
              error={errors.endDate}
              required
            >
              <DatePicker
                value={form.endDate}
                onChange={(value) => updateField("endDate", value)}
                placeholder="Pick end date"
                className="h-10 rounded-xl"
                disabled={busy}
                disableFuture
                fromYear={new Date().getFullYear() - 40}
                toYear={new Date().getFullYear()}
              />
            </Field>

            <Field
              className="col-span-12 sm:col-span-6"
              label="Reference No"
              error={errors.referenceNo}
              required
            >
              <Input
                className="h-10 rounded-xl"
                maxLength={80}
                value={form.referenceNo}
                disabled={busy}
                onChange={(e) =>
                  updateField("referenceNo", e.target.value.slice(0, 80))
                }
              />
            </Field>

            <Field
              className="col-span-12 sm:col-span-6"
              label="Certificate date"
              error={errors.certificateDate}
              required
            >
              <DatePicker
                value={form.certificateDate}
                onChange={(value) => updateField("certificateDate", value)}
                placeholder="Pick certificate date"
                className="h-10 rounded-xl"
                disabled={busy}
                disableFuture
                fromYear={new Date().getFullYear() - 5}
                toYear={new Date().getFullYear()}
              />
            </Field>

            <div className="col-span-12 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                Suggest Technologies, Responsibilities &amp; assessment from the
                designation
                {lastSuggestSource
                  ? ` · last: ${lastSuggestSource === "ai" ? "AI" : "role catalog"}`
                  : ""}
                . Everything stays editable.
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl shrink-0 h-9"
                disabled={busy || !form.designation.trim()}
                onClick={() => void handleSuggest()}
              >
                {suggesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Suggesting…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI suggest from role
                  </>
                )}
              </Button>
            </div>

            <Field
              className="col-span-12"
              label="Assessment paragraph"
              error={errors.assessment}
              required
              hint="Shown after the intro paragraph on the certificate"
            >
              <Textarea
                className="min-h-[72px] rounded-xl"
                maxLength={800}
                value={form.assessment}
                disabled={busy}
                onChange={(e) =>
                  updateField("assessment", e.target.value.slice(0, 800))
                }
              />
            </Field>

            <Field
              className="col-span-12"
              label="Technologies & tools (optional)"
              hint="One category per line — e.g. Frontend Development: React, TypeScript"
            >
              <Textarea
                className="min-h-[100px] rounded-xl"
                maxLength={4000}
                value={form.technologies}
                disabled={busy}
                onChange={(e) =>
                  updateField("technologies", e.target.value.slice(0, 4000))
                }
                placeholder={
                  "Frontend Development: React.js, Next.js, TypeScript\nAPI Integration: REST APIs, Axios"
                }
              />
            </Field>

            <Field
              className="col-span-12"
              label="Key responsibilities"
              error={errors.responsibilities}
              required
              hint="One bullet per line — customize after AI / role suggest"
            >
              <Textarea
                className="min-h-[120px] rounded-xl"
                maxLength={4000}
                value={form.responsibilities}
                disabled={busy}
                onChange={(e) =>
                  updateField("responsibilities", e.target.value.slice(0, 4000))
                }
                placeholder={
                  "Developed responsive web interfaces using React and TypeScript.\nIntegrated frontend applications with backend APIs."
                }
              />
            </Field>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border/60 gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={busy}
              onClick={requestClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl min-w-[160px]"
              disabled={!isValid || busy}
              onClick={() => void handleGenerate()}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                "Download PDF"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved certificate edits. Close anyway and lose them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
                resetForm();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 min-w-0", className)}>
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
