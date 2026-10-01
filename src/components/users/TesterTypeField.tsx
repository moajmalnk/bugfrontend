import { useRef, type HTMLAttributes, type KeyboardEvent } from "react";
import { Briefcase, Building2 } from "lucide-react";
import { cn, TESTER_TYPE_OPTIONS } from "@/lib/utils";
import type { TesterType } from "@/types";

type TesterTypeFieldProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "role"> & {
  value?: string | null;
  onChange: (value: TesterType) => void;
  disabled?: boolean;
  invalid?: boolean;
};

const ICONS: Record<TesterType, typeof Briefcase> = {
  codo: Briefcase,
  client: Building2,
};

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * Why: Tester type decides whether a tester is CODO workforce (BugUpdate,
 * check-in, weekly report, leave) or an external client reviewer. A labelled
 * radio group makes the choice explicit; roving tabindex + arrow keys follow
 * the WAI-ARIA radio pattern so it is fully keyboard operable.
 */
export function TesterTypeField({
  value,
  onChange,
  disabled,
  invalid,
  className,
  ...rest
}: TesterTypeFieldProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = TESTER_TYPE_OPTIONS.findIndex((o) => o.value === value);
  const focusableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = NEXT_KEYS.has(event.key) ? 1 : PREV_KEYS.has(event.key) ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const count = TESTER_TYPE_OPTIONS.length;
    const nextIndex = (index + step + count) % count;
    onChange(TESTER_TYPE_OPTIONS[nextIndex].value);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div
      aria-label="Tester type"
      aria-required="true"
      aria-invalid={invalid || undefined}
      {...rest}
      role="radiogroup"
      className={cn("grid grid-cols-12 gap-4", className)}
    >
      {TESTER_TYPE_OPTIONS.map((option, index) => {
        const selected = value === option.value;
        const Icon = ICONS[option.value];
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === focusableIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "col-span-12 sm:col-span-6 flex min-h-11 min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background text-foreground hover:bg-muted/50",
              invalid && !selected && "border-destructive"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
