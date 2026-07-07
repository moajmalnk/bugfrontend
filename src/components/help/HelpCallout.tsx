import { AlertCircle, Info, Lightbulb } from "lucide-react";
import type { HelpCalloutVariant } from "@/lib/help/types";
import { cn } from "@/lib/utils";

const VARIANTS: Record<
  HelpCalloutVariant,
  { icon: typeof Info; className: string; iconClass: string }
> = {
  info: {
    icon: Info,
    className:
      "border-blue-200/80 bg-blue-50/80 dark:border-blue-800/60 dark:bg-blue-950/30",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    icon: AlertCircle,
    className:
      "border-amber-200/80 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/30",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  tip: {
    icon: Lightbulb,
    className:
      "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/30",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
};

interface HelpCalloutProps {
  variant: HelpCalloutVariant;
  title?: string;
  text: string;
}

export function HelpCallout({ variant, title, text }: HelpCalloutProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border p-4 sm:p-5 backdrop-blur-sm",
        config.className
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-gray-900/50">
        <Icon className={cn("h-5 w-5", config.iconClass)} />
      </div>
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
