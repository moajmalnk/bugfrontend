import { ThermalPrintDialog, type ReceiptBuilder } from "@/components/print/ThermalPrintDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_USER_REPORT_SECTIONS,
  USER_REPORT_SECTIONS,
  buildUserReportReceipt,
  type UserReportBank,
  type UserReportProfile,
  type UserReportSectionId,
} from "@/lib/userReportReceipt";
import { publicAppOrigin } from "@/lib/escposReceipt";
import { cn } from "@/lib/utils";
import {
  canShiftYearMonth,
  clampYearMonth,
  currentYearMonth,
  formatYearMonthLabel,
  shiftYearMonth,
} from "@/services/payVerifyService";
import { fetchUserReportData } from "@/services/userReportService";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

interface UserReportPrintDialogProps {
  open: boolean;
  onClose: () => void;
  month: string;
  onMonthChange: (month: string) => void;
  profile: UserReportProfile | null;
  bank?: UserReportBank | null;
  printedBy?: string | null;
}

export function UserReportPrintDialog({
  open,
  onClose,
  month,
  onMonthChange,
  profile,
  bank,
  printedBy,
}: UserReportPrintDialogProps) {
  const [sections, setSections] = useState<UserReportSectionId[]>(DEFAULT_USER_REPORT_SECTIONS);

  /** Why: Pay periods cannot start before joining or run past the current IST month. */
  const bounds = useMemo(() => {
    const joined = profile?.joining_date?.slice(0, 7);
    return { min: joined && MONTH_RE.test(joined) ? joined : undefined, max: currentYearMonth() };
  }, [profile?.joining_date]);

  const safeMonth = MONTH_RE.test(month) ? clampYearMonth(month, bounds) : bounds.max;

  useEffect(() => {
    if (open && safeMonth !== month) onMonthChange(safeMonth);
  }, [open, safeMonth, month, onMonthChange]);

  const userId = profile?.id ?? "";
  const query = useQuery({
    queryKey: ["user-print-report", userId, safeMonth],
    queryFn: () => fetchUserReportData(userId, safeMonth),
    enabled: open && Boolean(userId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const allFailed = query.data ? query.data.failed.length === 4 : false;
  const status = query.isError || allFailed ? "error" : query.data ? "ready" : "loading";

  const buildReceipt = useMemo<ReceiptBuilder | null>(() => {
    if (!query.data || !profile || allFailed) return null;
    const data = query.data;
    const reportUrl = `${publicAppOrigin()}/admin/users/${profile.id}`;
    return ({ printedAt, copy, style }) =>
      buildUserReportReceipt(data, {
        profile,
        bank,
        sections,
        printedBy,
        printedAt,
        copy,
        reportUrl,
        style,
      });
  }, [query.data, profile, bank, sections, printedBy, allFailed]);

  const toggleSection = (id: UserReportSectionId, checked: boolean) =>
    setSections((prev) => {
      const next = checked ? [...prev, id] : prev.filter((s) => s !== id);
      return USER_REPORT_SECTIONS.map((s) => s.id).filter((s) => next.includes(s));
    });

  const allSelected = sections.length === USER_REPORT_SECTIONS.length;
  const displayName = profile?.name?.trim() || profile?.username || "";

  return (
    <ThermalPrintDialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Print employee report"
      subtitle={displayName ? `${displayName} · ${formatYearMonthLabel(safeMonth)}` : undefined}
      status={status}
      errorMessage="Could not load this employee's report."
      onRetry={() => void query.refetch()}
      buildReceipt={buildReceipt}
      blockedReason={sections.length === 0 ? "Select at least one section to print." : null}
      successDescription={(printer) =>
        `${displayName} · ${formatYearMonthLabel(safeMonth)} report sent to ${printer}.`
      }
      options={({ printing }) => (
        <>
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Report month</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                aria-label="Previous month"
                disabled={printing || !canShiftYearMonth(safeMonth, -1, bounds)}
                onClick={() => onMonthChange(shiftYearMonth(safeMonth, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div
                className="flex h-10 flex-1 items-center justify-center rounded-xl border bg-background text-sm font-semibold tabular-nums"
                aria-live="polite"
              >
                {formatYearMonthLabel(safeMonth)}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                aria-label="Next month"
                disabled={printing || !canShiftYearMonth(safeMonth, 1, bounds)}
                onClick={() => onMonthChange(shiftYearMonth(safeMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {query.data && query.data.failed.length > 0 && !allFailed ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Some data could not load ({query.data.failed.join(", ")}). Those sections print as
                "Not available".
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold">Sections</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-xl px-2 text-xs"
                disabled={printing}
                onClick={() =>
                  setSections(allSelected ? [] : USER_REPORT_SECTIONS.map((s) => s.id))
                }
              >
                {allSelected ? "Clear all" : "Select all"}
              </Button>
            </div>
            <div className="grid grid-cols-12 gap-2">
              {USER_REPORT_SECTIONS.map((section) => {
                const checked = sections.includes(section.id);
                const inputId = `report-section-${section.id}`;
                return (
                  <label
                    key={section.id}
                    htmlFor={inputId}
                    className={cn(
                      "col-span-12 flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-colors sm:col-span-6",
                      checked
                        ? "border-sky-300 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-950/30"
                        : "border-border bg-background hover:bg-muted/50",
                      printing && "pointer-events-none opacity-60"
                    )}
                  >
                    <Checkbox
                      id={inputId}
                      checked={checked}
                      disabled={printing}
                      className="mt-0.5 rounded-md"
                      onCheckedChange={(value) => toggleSection(section.id, value === true)}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                        {section.label}
                        {section.id === "bank" ? (
                          <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{section.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    />
  );
}
