import { Coffee, Clock, LogIn, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function formatWorkTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : value.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T"));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatBreakHours(minutes: number): string {
  if (minutes <= 0) return "0h";
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: "emerald" | "cyan" | "blue" | "amber";
}) {
  const accents = {
    emerald:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400",
    cyan: "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200 [&_svg]:text-cyan-600 dark:[&_svg]:text-cyan-400",
    blue: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200 [&_svg]:text-blue-600 dark:[&_svg]:text-blue-400",
    amber:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400",
  };

  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs sm:text-sm",
        accents[accent]
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium opacity-80">{label}</span>
      <span className="whitespace-nowrap font-semibold">{value}</span>
    </div>
  );
}

interface ActiveTodayWorkSummaryProps {
  checkInTime?: string | null;
  breakMinutes?: number;
  hoursWorked?: number;
  checkoutTime?: string | null;
}

export function ActiveTodayWorkSummary({
  checkInTime,
  breakMinutes = 0,
  hoursWorked = 0,
  checkoutTime,
}: ActiveTodayWorkSummaryProps) {
  const checkInLabel = formatWorkTime(checkInTime);
  const checkoutLabel = formatWorkTime(checkoutTime);
  const workedLabel = Number.isInteger(hoursWorked) ? `${hoursWorked}h` : `${hoursWorked.toFixed(1)}h`;

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {checkInLabel ? (
        <SummaryPill icon={LogIn} label="Check in" value={checkInLabel} accent="emerald" />
      ) : null}
      <SummaryPill icon={Coffee} label="Break" value={formatBreakHours(breakMinutes)} accent="cyan" />
      <SummaryPill icon={Clock} label="Worked" value={workedLabel} accent="blue" />
      {checkoutLabel ? (
        <SummaryPill icon={LogOut} label="Checkout" value={checkoutLabel} accent="amber" />
      ) : null}
    </div>
  );
}
