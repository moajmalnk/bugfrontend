import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  BUG_LEVEL_FORM_OPTIONS,
  bugLevelBadgeClass,
  formatBugLevelLabel,
} from "@/lib/bugMetaUtils";
import { Bug, BugLevel } from "@/types";
import { apiClient } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { formatDetailedDate } from "@/lib/dateUtils";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function triState(value: boolean | number | string | null | undefined): "yes" | "no" | "unset" {
  if (value === true || value === 1 || value === "1") return "yes";
  if (value === false || value === 0 || value === "0") return "no";
  return "unset";
}

function YesNoButtons({
  value,
  onChange,
  disabled,
  yesLabel = "Yes",
  noLabel = "No",
}: {
  value: "yes" | "no" | "unset";
  onChange: (next: "yes" | "no") => void;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("no")}
        className={cn(
          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
          value === "no"
            ? "border-slate-500 bg-slate-700 text-white shadow-sm ring-2 ring-slate-400/40"
            : "border-border/70 bg-background/60 text-muted-foreground hover:border-slate-400/50 hover:bg-muted/40"
        )}
      >
        {noLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("yes")}
        className={cn(
          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
          value === "yes"
            ? "border-emerald-500 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40"
            : "border-border/70 bg-background/60 text-muted-foreground hover:border-emerald-400/50 hover:bg-emerald-500/10"
        )}
      >
        {yesLabel}
      </button>
    </div>
  );
}

export function formatRetestSummary(bug: Pick<Bug, "tester_retested" | "tester_issue_fixed">): {
  label: string;
  className: string;
} {
  const retested = triState(bug.tester_retested);
  const issueFixed = triState(bug.tester_issue_fixed);
  if (retested === "unset") {
    return {
      label: "Retest pending",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    };
  }
  if (retested === "no") {
    return {
      label: "Not retested",
      className:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    };
  }
  if (issueFixed === "yes") {
    return {
      label: "Verified fixed",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    };
  }
  if (issueFixed === "no") {
    return {
      label: "Still broken",
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    };
  }
  return {
    label: "Retested",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  };
}

interface TesterVerificationPanelProps {
  bug: Bug;
  onUpdated?: (bug: Bug) => void;
}

export function TesterVerificationPanel({ bug, onUpdated }: TesterVerificationPanelProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const role = String(currentUser?.role || "").toLowerCase();
  const canVerify = role === "admin" || role === "tester";

  const [retested, setRetested] = useState<"yes" | "no" | "unset">(triState(bug.tester_retested));
  const [issueFixed, setIssueFixed] = useState<"yes" | "no" | "unset">(
    triState(bug.tester_issue_fixed)
  );
  const [bugLevel, setBugLevel] = useState<BugLevel>(
    (bug.bug_level as BugLevel) || "normal"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRetested(triState(bug.tester_retested));
    setIssueFixed(triState(bug.tester_issue_fixed));
    setBugLevel((bug.bug_level as BugLevel) || "normal");
  }, [bug.id, bug.tester_retested, bug.tester_issue_fixed, bug.bug_level]);

  const summary = useMemo(() => formatRetestSummary(bug), [bug]);

  const dirty =
    retested !== triState(bug.tester_retested) ||
    (retested === "yes" && issueFixed !== triState(bug.tester_issue_fixed)) ||
    bugLevel !== ((bug.bug_level as BugLevel) || "normal");

  const canSave =
    canVerify &&
    dirty &&
    retested !== "unset" &&
    (retested === "no" || issueFixed !== "unset");

  const handleSave = async () => {
    if (!canSave || !currentUser?.id) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("id", bug.id);
      formData.append("tester_retested", retested === "yes" ? "1" : "0");
      if (retested === "yes") {
        formData.append("tester_issue_fixed", issueFixed === "yes" ? "1" : "0");
      } else {
        formData.append("tester_issue_fixed", "");
      }
      formData.append("bug_level", bugLevel);
      formData.append("updated_by", currentUser.id);

      const response = await apiClient.post<{ success: boolean; data: Bug; message?: string }>(
        "/bugs/update.php",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || "Failed to save verification");
      }
      onUpdated?.(response.data.data);
      toast({
        title: "Verification saved",
        description: "Tester retest details were updated.",
      });
    } catch (error) {
      toast({
        title: "Could not save verification",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-sky-200/50 dark:border-sky-800/40 bg-gradient-to-br from-sky-50/80 via-background/40 to-indigo-50/50 dark:from-sky-950/20 dark:via-background/20 dark:to-indigo-950/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 rounded-lg bg-sky-600 p-1.5 shrink-0">
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              Tester verification
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              After a developer fix, confirm retest outcome and severity.
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("rounded-full font-medium", summary.className)}>
          {summary.label}
        </Badge>
      </div>

      {!canVerify ? (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Tester tested again:</span>
            <span className="font-medium text-foreground">
              {retested === "yes" ? "Yes" : retested === "no" ? "No" : "Not recorded"}
            </span>
          </div>
          {retested === "yes" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Issue fixed:</span>
              <span className="font-medium text-foreground">
                {issueFixed === "yes" ? "Yes" : issueFixed === "no" ? "No" : "Not recorded"}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Bug level:</span>
            <Badge variant="outline" className={bugLevelBadgeClass(bugLevel)}>
              {formatBugLevelLabel(bugLevel)}
            </Badge>
          </div>
          {bug.tester_verified_by_name || bug.tester_verified_at ? (
            <p className="text-xs text-muted-foreground pt-1">
              {bug.tester_verified_by_name ? `Verified by ${bug.tester_verified_by_name}` : "Verified"}
              {bug.tester_verified_at ? ` · ${formatDetailedDate(bug.tester_verified_at)}` : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Tester tested again?
            </label>
            <YesNoButtons
              value={retested}
              disabled={saving}
              onChange={(next) => {
                setRetested(next);
                if (next === "no") setIssueFixed("unset");
              }}
            />
          </div>

          {retested === "yes" ? (
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Issue fixed?
              </label>
              <YesNoButtons
                value={issueFixed}
                disabled={saving}
                onChange={setIssueFixed}
                yesLabel="Yes — fixed"
                noLabel="No — still broken"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Bug level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BUG_LEVEL_FORM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={saving}
                  onClick={() => setBugLevel(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-all",
                    bugLevel === option.value
                      ? option.selectedClass
                      : "border-border/70 bg-background/60 hover:bg-muted/30"
                  )}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div
                    className={cn(
                      "text-[11px] mt-0.5",
                      bugLevel === option.value ? "opacity-90" : "text-muted-foreground"
                    )}
                  >
                    {option.hint}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Visible to admin &amp; tester editors
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!canSave || saving}
              onClick={handleSave}
              className="rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {issueFixed === "yes" ? (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  ) : issueFixed === "no" ? (
                    <XCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                  )}
                  Save verification
                </>
              )}
            </Button>
          </div>

          {bug.tester_verified_by_name || bug.tester_verified_at ? (
            <p className="text-xs text-muted-foreground">
              Last saved
              {bug.tester_verified_by_name ? ` by ${bug.tester_verified_by_name}` : ""}
              {bug.tester_verified_at ? ` · ${formatDetailedDate(bug.tester_verified_at)}` : ""}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
