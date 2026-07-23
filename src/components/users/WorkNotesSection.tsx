import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  calendarMonthKey,
  dateMatchesMonthFilter,
  formatCalendarMonthTitle,
  type MonthFilterValue,
} from "@/lib/monthFilter";
import { cn } from "@/lib/utils";
import { parseAdminHoursNote } from "@/pages/adminOvertimeShared";
import { ChevronDown, ChevronUp, FileText, Shield } from "lucide-react";
import { useMemo, useState } from "react";

export type WorkNoteItem = {
  date?: string;
  note: string;
  isAdminUpdate: boolean;
  adminStamp?: string;
  displayNote: string;
};

function normalizeWorkNote(item: unknown): WorkNoteItem | null {
  if (item == null) return null;

  let date = "";
  let note = "";

  if (typeof item === "string") {
    note = item.trim();
  } else if (typeof item === "object") {
    const rec = item as Record<string, unknown>;
    note = String(rec.note ?? rec.notes ?? rec.text ?? rec.message ?? "").trim();
    date = rec.date != null ? String(rec.date).trim() : "";
  } else {
    note = String(item).trim();
  }

  if (!note) return null;

  const admin = parseAdminHoursNote(note);
  const isAdminUpdate =
    Boolean(admin) || note.includes("[ADMIN HOURS ENTRY") || /admin\s+update/i.test(note);

  return {
    date: date || undefined,
    note,
    isAdminUpdate,
    adminStamp: admin?.stamp,
    displayNote: admin?.reason?.trim() ? admin.reason.trim() : note,
  };
}

function notesBadgeClass(count: number): string {
  if (count > 5) {
    return "bg-red-600 text-white border-red-500 shadow-red-500/20";
  }
  if (count > 3) {
    return "bg-amber-500 text-white border-amber-400 shadow-amber-500/20";
  }
  return "bg-blue-600/90 text-white border-blue-500 shadow-blue-500/20";
}

type WorkNotesSectionProps = {
  notes: unknown[];
  className?: string;
  defaultCollapsed?: boolean;
};

/**
 * Full-width Work Notes card with month chips, collapse, and count warning colors.
 * Admin hours / admin work-update notes are highlighted separately.
 */
export function WorkNotesSection({
  notes,
  className,
  defaultCollapsed = false,
}: WorkNotesSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>("all");

  const normalized = useMemo(
    () => notes.map(normalizeWorkNote).filter((n): n is WorkNoteItem => Boolean(n)),
    [notes]
  );

  const monthChips = useMemo(() => {
    const keys = [
      ...new Set(
        normalized
          .map((n) => (n.date ? calendarMonthKey(n.date) : ""))
          .filter(Boolean)
      ),
    ].sort((a, b) => b.localeCompare(a));

    return [
      { value: "all" as MonthFilterValue, label: "All months" },
      ...keys.map((key) => ({
        value: key as MonthFilterValue,
        label: formatCalendarMonthTitle(key),
      })),
    ];
  }, [normalized]);

  const visible = useMemo(
    () => normalized.filter((n) => dateMatchesMonthFilter(n.date, monthFilter)),
    [normalized, monthFilter]
  );

  const adminCount = useMemo(
    () => visible.filter((n) => n.isAdminUpdate).length,
    [visible]
  );

  if (normalized.length === 0) return null;

  const count = visible.length;
  const periodLabel =
    monthFilter === "all" ? "All months" : formatCalendarMonthTitle(monthFilter);

  return (
    <Card
      className={cn(
        "w-full border-border/60 bg-card/60 backdrop-blur",
        className
      )}
    >
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-slate-100 to-blue-100/60 dark:from-slate-800/60 dark:to-blue-900/20 border border-border/50 shrink-0">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-semibold leading-none">
                Work Notes
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Notes submitted in this period
                {monthFilter !== "all" ? ` · ${periodLabel}` : ""}
                {adminCount > 0
                  ? ` · ${adminCount} admin update${adminCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              className={cn(
                "w-fit px-3 py-1 rounded-full border shadow-sm tabular-nums",
                notesBadgeClass(count)
              )}
              title={
                count > 5
                  ? "High note volume (>5)"
                  : count > 3
                    ? "Elevated note volume (>3)"
                    : "Note count"
              }
            >
              {count}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() => setCollapsed((v) => !v)}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Collapse
                </>
              )}
            </Button>
          </div>
        </div>

        {!collapsed && (
          <>
            {monthChips.length > 1 ? (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Filter notes by month"
              >
                {monthChips.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={monthFilter === opt.value ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setMonthFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            ) : null}

            {count === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No notes for {periodLabel}.
              </div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-3">
                {visible.map((n, idx) => (
                  <div key={`${n.date ?? "x"}-${idx}`} className="relative pl-4">
                    <div
                      className={cn(
                        "absolute left-0 top-3 h-full w-px bg-gradient-to-b via-border to-transparent",
                        n.isAdminUpdate
                          ? "from-indigo-500/50"
                          : "from-blue-500/40"
                      )}
                    />
                    <div
                      className={cn(
                        "absolute left-[-3px] top-3 h-2.5 w-2.5 rounded-full ring-4",
                        n.isAdminUpdate
                          ? "bg-indigo-500 ring-indigo-500/15"
                          : "bg-blue-500 ring-blue-500/15"
                      )}
                    />
                    <Card
                      className={cn(
                        "border-border/60 bg-background/40 hover:bg-background/60 transition-colors",
                        n.isAdminUpdate &&
                          "border-indigo-300/60 dark:border-indigo-700/50 bg-indigo-50/30 dark:bg-indigo-950/20"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {n.date ? (
                            <div className="text-[11px] text-muted-foreground">
                              {n.date}
                            </div>
                          ) : null}
                          {n.isAdminUpdate ? (
                            <Badge
                              variant="outline"
                              className="gap-1 text-[10px] border-indigo-300 bg-indigo-100/80 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200"
                            >
                              <Shield className="h-3 w-3" />
                              Admin update
                            </Badge>
                          ) : null}
                        </div>
                        {n.isAdminUpdate && n.adminStamp ? (
                          <p className="text-[10px] font-mono text-indigo-700/80 dark:text-indigo-300/70 mb-1.5 break-all">
                            {n.adminStamp}
                          </p>
                        ) : null}
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {n.displayNote}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
