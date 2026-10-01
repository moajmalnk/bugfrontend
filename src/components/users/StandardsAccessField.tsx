import { useRef, type KeyboardEvent } from "react";
import { BookOpenCheck, ClipboardCheck, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { cn, STANDARDS_MODE_OPTIONS, type StandardsFeature } from "@/lib/utils";
import type { StandardsMode } from "@/types";

const MODE_ICONS: Record<StandardsMode, typeof ShieldCheck> = {
  required: ShieldCheck,
  optional: BookOpenCheck,
  hidden: EyeOff,
};

const FEATURES: Array<{
  feature: StandardsFeature;
  label: string;
  hint: string;
  icon: typeof ClipboardCheck;
}> = [
  {
    feature: "codo",
    label: "CODO Rules",
    hint: "Engineering standards for their role.",
    icon: ClipboardCheck,
  },
  {
    feature: "cursor_tips",
    label: "Cursor Tips",
    hint: "Cursor modes, commands and workflow habits.",
    icon: Sparkles,
  },
];

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

type StandardsAccessFieldProps = {
  codoMode: StandardsMode;
  cursorTipsMode: StandardsMode;
  /** Role defaults, marked with a "Default" tag so admins see what NULL would mean. */
  defaults: Record<StandardsFeature, StandardsMode>;
  onChange: (feature: StandardsFeature, mode: StandardsMode) => void;
  disabled?: boolean;
};

/**
 * Why: admins decide per person whether CODO Rules and Cursor Tips are
 * mandatory (acknowledgement gate), readable only, or hidden. Each feature is
 * a labelled radio group with roving tabindex + arrow keys (WAI-ARIA radio
 * pattern) so the choice is explicit and keyboard operable.
 */
export function StandardsAccessField({
  codoMode,
  cursorTipsMode,
  defaults,
  onChange,
  disabled,
}: StandardsAccessFieldProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    feature: StandardsFeature,
    index: number
  ) => {
    const step = NEXT_KEYS.has(event.key) ? 1 : PREV_KEYS.has(event.key) ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const count = STANDARDS_MODE_OPTIONS.length;
    const nextIndex = (index + step + count) % count;
    onChange(feature, STANDARDS_MODE_OPTIONS[nextIndex].value);
    refs.current[`${feature}:${nextIndex}`]?.focus();
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {FEATURES.map(({ feature, label, hint, icon: FeatureIcon }) => {
        const value = feature === "codo" ? codoMode : cursorTipsMode;
        const selected = STANDARDS_MODE_OPTIONS.find((o) => o.value === value);
        const labelId = `standards-${feature}-label`;
        return (
          <div
            key={feature}
            className="col-span-12 space-y-3 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FeatureIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p id={labelId} className="text-sm font-semibold text-foreground">
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            </div>

            <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-12 gap-2">
              {STANDARDS_MODE_OPTIONS.map((option, index) => {
                const isSelected = value === option.value;
                const Icon = MODE_ICONS[option.value];
                return (
                  <button
                    key={option.value}
                    ref={(el) => {
                      refs.current[`${feature}:${index}`] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    disabled={disabled}
                    onClick={() => onChange(feature, option.value)}
                    onKeyDown={(event) => handleKeyDown(event, feature, index)}
                    className={cn(
                      "col-span-4 flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      isSelected
                        ? option.value === "hidden"
                          ? "border-destructive/60 bg-destructive/10 text-foreground"
                          : "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {option.label}
                    </span>
                    {defaults[feature] === option.value ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Default
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {selected?.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
