import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getEffectiveRole } from "@/lib/utils";
import { userService } from "@/services/userService";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  UserRound,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PlayCircle,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

function computePeriodEnd(periodStart: string): string {
  const startDate = new Date(`${periodStart}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return periodStart;
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(5);
  return endDate.toISOString().split("T")[0];
}

function parseYmdDate(value: unknown): Date | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeNote(item: unknown): { date?: string; note: string } | null {
  if (item == null) return null;
  if (typeof item === "string") {
    const note = item.trim();
    return note ? { note } : null;
  }
  if (typeof item === "object") {
    const rec = item as Record<string, unknown>;
    const noteRaw = rec.note ?? rec.notes ?? rec.text ?? rec.message ?? "";
    const note = String(noteRaw ?? "").trim();
    if (!note) return null;
    const date = rec.date != null ? String(rec.date).trim() : "";
    return date ? { date, note } : { note };
  }
  const note = String(item).trim();
  return note ? { note } : null;
}

function formatDailySubmittedAt(
  submissionDate: string,
  createdAt?: string | null,
  checkInTime?: string | null
): string | null {
  const datePart = String(submissionDate || "").trim();
  if (!datePart) return null;

  const formatInstant = (d: Date): string | null => {
    if (Number.isNaN(d.getTime())) return null;
    const dStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const tStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
    return `${dStr} - ${tStr}`;
  };

  const rawCreated =
    createdAt != null && String(createdAt).trim() !== "" ? String(createdAt).trim() : "";
  if (rawCreated) {
    const normalized = rawCreated.includes("T")
      ? rawCreated
      : rawCreated.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
    const s = formatInstant(new Date(normalized));
    if (s) return s;
  }

  const ci = checkInTime != null ? String(checkInTime).trim() : "";
  if (ci) {
    const timeOnly = ci.includes(" ") ? (ci.split(/\s+/).pop() as string) : ci;
    if (/^\d{1,2}:\d{2}/.test(timeOnly)) {
      const s = formatInstant(new Date(`${datePart}T${timeOnly}`));
      if (s) return s;
    }
  }

  return null;
}

export default function UserWorkStatsPeriod() {
  const { userId, periodStart } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const effectiveRole = getEffectiveRole(currentUser || {});

  const label = searchParams.get("label") || "";
  const end = useMemo(
    () => (periodStart ? computePeriodEnd(periodStart) : ""),
    [periodStart]
  );

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [periodDetails, setPeriodDetails] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      if (!userId || !periodStart) return;
      setError(null);
      setIsLoadingStats(true);
      setIsLoadingDetails(true);
      setSelectedPeriod(null);
      setPeriodDetails(null);
      try {
        const stats = await userService.getUserWorkStats(userId);
        const match =
          stats?.period_trend?.find((p: any) => String(p.period) === String(periodStart)) ||
          null;
        setSelectedPeriod(match);
      } catch (err: any) {
        setError(err?.message || "Failed to load work stats");
      } finally {
        setIsLoadingStats(false);
      }

      try {
        const details = await userService.getPeriodDetails(userId, periodStart, end);
        setPeriodDetails(details);
      } catch (err: any) {
        setError(err?.message || "Failed to load period details");
      } finally {
        setIsLoadingDetails(false);
      }
    };
    void run();
  }, [userId, periodStart, end]);

  const headerTitle = useMemo(() => {
    if (label.trim()) return label.trim();
    if (selectedPeriod?.period_name) return selectedPeriod.period_name;
    return periodStart ? periodStart : "Period Details";
  }, [label, selectedPeriod?.period_name, periodStart]);

  const dailyBreakdownTotals = useMemo(() => {
    const subs = periodDetails?.submissions;
    if (!Array.isArray(subs) || subs.length === 0) return null;
    return subs.reduce(
      (acc: any, s: any) => {
        acc.hours += Number(s.hours ?? 0) || 0;
        acc.ot += Number(s.overtime_hours ?? 0) || 0;
        acc.requested += Number(s.requested_extra_hours ?? 0) || 0;
        acc.breakMin += Math.max(0, Number(s.break_minutes ?? 0) || 0);
        return acc;
      },
      { hours: 0, ot: 0, requested: 0, breakMin: 0 }
    );
  }, [periodDetails]);

  const goBack = () => navigate(`/${effectiveRole}/users/${userId}`);

  return (
    <div className="min-h-[calc(100vh-1rem)] px-4 md:px-6 lg:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header (matches Users page style) */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <CalendarDays className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                      {headerTitle}
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Work Statistics & Task Breakdown
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  className="h-11 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-900/40 backdrop-blur hover:bg-white/80 dark:hover:bg-gray-900/60 inline-flex items-center justify-center px-4 text-sm font-medium text-foreground transition-colors"
                  onClick={goBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to user
                </button>
              </div>
            </div>
          </div>
        </div>

        {(isLoadingStats || isLoadingDetails) && (
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <Skeleton className="h-24 col-span-12 sm:col-span-4 rounded-2xl" />
              <Skeleton className="h-24 col-span-12 sm:col-span-4 rounded-2xl" />
              <Skeleton className="h-24 col-span-12 sm:col-span-4 rounded-2xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        )}

        {error && !isLoadingDetails && (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-semibold">Could not load period details</div>
                <div className="text-sm text-muted-foreground">{error}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoadingDetails && selectedPeriod && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-12 sm:col-span-4 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Total Hours
                      </p>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {Number(selectedPeriod.hours || 0).toFixed(1)}h
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Worked during this period
                      </p>
                    </div>
                    <div className="p-3 bg-blue-200/50 dark:bg-blue-900/40 rounded-xl">
                      <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-12 sm:col-span-4 border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Active Days
                      </p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                        {Number(selectedPeriod.days || 0)}d
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Days with work submissions
                      </p>
                    </div>
                    <div className="p-3 bg-green-200/50 dark:bg-green-900/40 rounded-xl">
                      <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-12 sm:col-span-4 border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-100/50 dark:from-violet-950/30 dark:to-purple-900/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Net hours
                      </p>
                      <p className="text-3xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">
                        {(
                          Number(selectedPeriod.hours || 0) +
                          Number(selectedPeriod.overtime_hours || 0)
                        ).toFixed(1)}
                        h
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Total hours + approved OT
                      </p>
                    </div>
                    <div className="p-3 bg-violet-200/50 dark:bg-violet-900/40 rounded-xl">
                      <PlusCircle className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-12 sm:col-span-4 border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/40 dark:from-orange-950/20 dark:to-orange-900/10">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Overtime Hours
                  </p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {Number(selectedPeriod.overtime_hours || 0).toFixed(1)}h
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-12 sm:col-span-4 border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/20 dark:to-amber-900/10">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    OT Requested
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {Number(selectedPeriod.requested_extra_hours || 0).toFixed(1)}h
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-12 sm:col-span-4 border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-cyan-100/40 dark:from-cyan-950/20 dark:to-cyan-900/10">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Break Time
                  </p>
                  <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                    {Math.max(0, Number(selectedPeriod.break_minutes || 0))}m
                  </p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Task Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Task Breakdown
              </h3>
              <div className="grid grid-cols-12 gap-4">
                <Card className="col-span-12 sm:col-span-6 border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Completed
                        </span>
                      </div>
                      <Badge className="bg-red-600 text-white text-lg px-3 py-1">
                        {selectedPeriod.task_counts.completed}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Tasks completed during this period
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-12 sm:col-span-6 border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100/30 dark:from-yellow-950/20 dark:to-yellow-900/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Pending
                        </span>
                      </div>
                      <Badge className="bg-yellow-600 text-white text-lg px-3 py-1">
                        {selectedPeriod.task_counts.pending}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Tasks pending completion
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-12 sm:col-span-6 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Ongoing
                        </span>
                      </div>
                      <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                        {selectedPeriod.task_counts.ongoing}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Tasks currently in progress
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-12 sm:col-span-6 border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Upcoming
                        </span>
                      </div>
                      <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
                        {selectedPeriod.task_counts.upcoming}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Tasks scheduled for later
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Details lists */}
            <Separator />
            <div className="space-y-6">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="space-y-6">
                    {periodDetails?.notes?.length > 0 && (
                      <Card className="border-border/60 bg-card/60 backdrop-blur">
                        <CardContent className="p-5 sm:p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-xl bg-gradient-to-br from-slate-100 to-blue-100/60 dark:from-slate-800/60 dark:to-blue-900/20 border border-border/50">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm sm:text-base font-semibold leading-none">
                                  Work Notes
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Notes submitted in this period
                                </p>
                              </div>
                            </div>
                            <Badge className="w-fit bg-blue-600/90 text-white px-3 py-1 rounded-full">
                              {periodDetails.notes.length}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {periodDetails.notes
                              .map(normalizeNote)
                              .filter(Boolean)
                              .map((n: any, idx: number) => (
                                <div key={idx} className="relative pl-4">
                                  <div className="absolute left-0 top-3 h-full w-px bg-gradient-to-b from-blue-500/40 via-border to-transparent" />
                                  <div className="absolute left-[-3px] top-3 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/15" />
                                  <Card className="border-border/60 bg-background/40 hover:bg-background/60 transition-colors">
                                    <CardContent className="p-4">
                                      {n.date ? (
                                        <div className="text-[11px] text-muted-foreground mb-1">
                                          {n.date}
                                        </div>
                                      ) : null}
                                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                        {n.note}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {Array.isArray(periodDetails?.submissions) &&
                      periodDetails.submissions.length > 0 && (
                        <Card className="border-border/60 bg-card/60 backdrop-blur">
                          <CardContent className="p-5 sm:p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm sm:text-base font-semibold leading-none">
                                Daily Breakdown
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {periodDetails.submissions.length} days summary
                              </p>
                            </div>
                            <Badge className="w-fit bg-emerald-600/90 text-white px-3 py-1 rounded-full">
                              {periodDetails.submissions.length} days
                            </Badge>
                          </div>
                          {dailyBreakdownTotals && (
                            <div className="grid grid-cols-12 gap-3">
                              <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/50 bg-background/40">
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">Total hours</div>
                                    <div className="text-xl font-bold tabular-nums">
                                      {dailyBreakdownTotals.hours.toFixed(1)}h
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Clock className="h-5 w-5" />
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/50 bg-background/40">
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">Approved OT</div>
                                    <div className="text-xl font-bold tabular-nums">
                                      {dailyBreakdownTotals.ot.toFixed(1)}h
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold">
                                    OT
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/50 bg-background/40">
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">OT requested</div>
                                    <div className="text-xl font-bold tabular-nums">
                                      {dailyBreakdownTotals.requested.toFixed(1)}h
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <PlusCircle className="h-5 w-5" />
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/50 bg-background/40">
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">Break minutes</div>
                                    <div className="text-xl font-bold tabular-nums">
                                      {dailyBreakdownTotals.breakMin}m
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                    <Calendar className="h-5 w-5" />
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                          <div className="space-y-2">
                            {periodDetails.submissions.map((submission: any, idx: number) => {
                              const submittedAt = formatDailySubmittedAt(
                                submission.submission_date,
                                submission.created_at,
                                submission.check_in_time
                              );
                              const date = parseYmdDate(submission.submission_date);
                              return (
                                <div
                                  key={idx}
                                  className="rounded-2xl border border-border/60 bg-background/40 hover:bg-background/60 transition-colors"
                                >
                                  <div className="p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="font-semibold">
                                          {date ? format(date, "MMM dd, yyyy") : "—"}
                                        </div>
                                        {submittedAt ? (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            Submitted: {submittedAt}
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="text-right">
                                          <div className="font-semibold tabular-nums text-foreground">
                                            {Number(submission.hours || 0).toFixed(1)}h
                                          </div>
                                          <div className="tabular-nums">
                                            OT {Number(submission.overtime_hours || 0).toFixed(1)}h
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {submission.tasks ? (
                                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2 flex items-center justify-between">
                                          <span className="text-muted-foreground">Completed</span>
                                          <span className="font-semibold">{submission.tasks.completed ?? 0}</span>
                                        </div>
                                        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2 flex items-center justify-between">
                                          <span className="text-muted-foreground">Pending</span>
                                          <span className="font-semibold">{submission.tasks.pending ?? 0}</span>
                                        </div>
                                        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2 flex items-center justify-between">
                                          <span className="text-muted-foreground">Ongoing</span>
                                          <span className="font-semibold">{submission.tasks.ongoing ?? 0}</span>
                                        </div>
                                        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2 flex items-center justify-between">
                                          <span className="text-muted-foreground">Upcoming</span>
                                          <span className="font-semibold">{submission.tasks.upcoming ?? 0}</span>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

