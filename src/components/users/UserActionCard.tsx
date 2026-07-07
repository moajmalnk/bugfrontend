import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export type UserActionTone = "default" | "warning" | "danger" | "success";

export const UserActionCard = forwardRef<
  HTMLButtonElement,
  {
    icon: LucideIcon;
    label: string;
    tone?: UserActionTone;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function UserActionCard(
  { icon: Icon, label, tone = "default", className, disabled, ...props },
  ref
) {
  const toneStyles: Record<UserActionTone, string> = {
    default:
      "bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80",
    warning:
      "bg-amber-100/90 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 hover:bg-amber-200/90 dark:hover:bg-amber-950/70",
    danger:
      "bg-red-100/90 dark:bg-red-950/50 text-red-950 dark:text-red-100 hover:bg-red-200/90 dark:hover:bg-red-950/70",
    success:
      "bg-emerald-100/90 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-200/90 dark:hover:bg-emerald-950/70",
  };

  const iconStyles: Record<UserActionTone, string> = {
    default: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
    warning: "bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100",
    danger: "bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-100",
    success: "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100",
  };

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(
        "w-full min-h-[4.5rem] rounded-3xl px-4 py-4 flex items-center gap-3 transition-colors border-0",
        toneStyles[tone],
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full shrink-0",
          iconStyles[tone]
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold text-left">{label}</span>
    </button>
  );
});
