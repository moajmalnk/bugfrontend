import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDetailedDate } from "@/lib/dateUtils";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import type { Update } from "@/services/updateService";
import { format } from "date-fns";
import { Bell, Calendar, CalendarDays, Clock, File, Flag, Tag, Timer, User } from "lucide-react";
import { Link } from "react-router-dom";

type UpdateDetailsCardProps = {
  update: Update;
  role: string;
  canSeePlanningFields?: boolean;
  getTypeBadgeStyle: (type: string) => string;
  getStatusBadgeStyle: (status: string) => string;
  getUpdatePriorityBadgeStyle: (priority: string) => string;
};

function DetailField({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex min-h-9 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
        <div className="min-w-0 break-words">{children}</div>
      </div>
    </div>
  );
}

export function UpdateDetailsCard({
  update,
  role,
  canSeePlanningFields = false,
  getTypeBadgeStyle,
  getStatusBadgeStyle,
  getUpdatePriorityBadgeStyle,
}: UpdateDetailsCardProps) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-sky-50/30 dark:from-indigo-950/10 dark:via-transparent dark:to-sky-950/10" />
      <CardHeader className="relative pb-3">
        <CardTitle className="text-base sm:text-lg">Update details</CardTitle>
        <p className="text-xs text-muted-foreground">
          Project context, planning fields, and completion summary
        </p>
      </CardHeader>
      <CardContent className="relative space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailField label="Status" icon={Tag}>
            <Badge variant="outline" className={cn("capitalize", getStatusBadgeStyle(update.status))}>
              {update.status}
            </Badge>
          </DetailField>
          <DetailField label="Type" icon={Tag}>
            <Badge variant="outline" className={getTypeBadgeStyle(update.type)}>
              {update.type}
            </Badge>
          </DetailField>
          {canSeePlanningFields &&
            update.update_priority &&
            ["high", "medium", "low"].includes(String(update.update_priority).toLowerCase()) && (
              <DetailField label="Priority" icon={Flag}>
                <Badge
                  variant="outline"
                  className={getUpdatePriorityBadgeStyle(String(update.update_priority))}
                >
                  {String(update.update_priority)}
                </Badge>
              </DetailField>
            )}
          <DetailField label="Project" icon={Bell}>
            <Link
              to={`/${role}/projects/${update.project_id}?tab=updates`}
              className="font-medium text-primary hover:underline"
            >
              {update.project_name || "Project"}
            </Link>
          </DetailField>
          <DetailField label="Created by" icon={User}>
            <span className="font-medium">{update.created_by_name || update.created_by}</span>
          </DetailField>
          <DetailField label="Created on" icon={Calendar}>
            <span className="font-medium">{formatDetailedDate(update.created_at)}</span>
          </DetailField>
          {update.expected_date ? (
            <DetailField label="Expected date" icon={CalendarDays}>
              <span className="font-medium">
                {format(new Date(update.expected_date), "MMM dd, yyyy")}
              </span>
            </DetailField>
          ) : null}
          {update.expected_time ? (
            <DetailField label="Expected time" icon={Clock}>
              <span className="font-medium">{update.expected_time}</span>
            </DetailField>
          ) : null}
          {canSeePlanningFields &&
          update.calculated_hours != null &&
          update.calculated_hours !== "" &&
          !Number.isNaN(Number(update.calculated_hours)) ? (
            <DetailField label="Calculated hours" icon={Timer}>
              <span className="font-medium tabular-nums">
                {Number(update.calculated_hours).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                h
              </span>
            </DetailField>
          ) : null}
        </div>

        {update.status === "completed" ? (
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Completion summary
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField label="Tested">
                <span className="font-medium">
                  {Number(update.completion_tested) === 1 ? "Yes" : "No"}
                </span>
              </DetailField>
              {update.completion_tested_by ? (
                <DetailField label="Tested by" icon={User}>
                  <span className="font-medium">{update.completion_tested_by}</span>
                </DetailField>
              ) : null}
              {update.completion_dev_hours != null &&
              update.completion_dev_hours !== "" &&
              !Number.isNaN(Number(update.completion_dev_hours)) ? (
                <DetailField label="Development hours" icon={Timer}>
                  <span className="font-medium tabular-nums">
                    {Number(update.completion_dev_hours).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    h
                  </span>
                </DetailField>
              ) : null}
              {update.completion_dev_started_at ? (
                <DetailField label="Development started" icon={CalendarDays}>
                  <span className="font-medium">
                    {formatLocalDate(update.completion_dev_started_at, "datetime")}
                  </span>
                </DetailField>
              ) : null}
              {update.completion_dev_ended_at ? (
                <DetailField label="Development ended" icon={CalendarDays}>
                  <span className="font-medium">
                    {formatLocalDate(update.completion_dev_ended_at, "datetime")}
                  </span>
                </DetailField>
              ) : null}
            </div>
            {update.completion_notes ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Completion notes
                </Label>
                <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/70 p-3 text-sm">
                  {update.completion_notes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
