import { useRef, type KeyboardEvent } from "react";
import { Ban, Info, Lock, UserRoundCheck, UserRoundPen } from "lucide-react";
import { cn, ONBOARDING_MODE_OPTIONS } from "@/lib/utils";
import type { OnboardingMode } from "@/types";

const MODE_ICONS: Record<OnboardingMode, typeof Lock> = {
  required: Lock,
  optional: UserRoundPen,
  off: Ban,
};

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

type OnboardingModeFieldProps = {
  value: OnboardingMode;
  /** Role default, marked with a "Default" tag so admins see what "no override" means. */
  defaultMode: OnboardingMode;
  onChange: (mode: OnboardingMode) => void;
  /** Saved mode when editing an existing user; omit when creating one. */
  savedMode?: OnboardingMode;
  /** True when the user already submitted the wizard at least once. */
  hasSubmitted?: boolean;
  disabled?: boolean;
};

/**
 * Explains what saving the selected mode does to this person right now, so a
 * switch to Required (dashboard lock) or Off is never a surprise.
 */
function impactMessage(
  value: OnboardingMode,
  savedMode: OnboardingMode | undefined,
  hasSubmitted: boolean
): string | null {
  if (savedMode === undefined) {
    if (value === "required") return "They set a password and complete onboarding on first sign-in.";
    if (value === "optional") return "They can fill onboarding from Profile whenever they are ready.";
    return null;
  }
  if (value === savedMode) return null;
  if (value === "required") {
    return hasSubmitted
      ? "Records are already submitted, so the dashboard stays unlocked."
      : "They will be locked into the onboarding wizard until it is submitted.";
  }
  if (value === "optional") {
    return savedMode === "required" && !hasSubmitted
      ? "The onboarding lock is lifted. They can finish it later from Profile."
      : "They can fill or update onboarding from Profile any time.";
  }
  return "The wizard, reminders and HR verification stop. Saved records are kept.";
}

/**
 * Why: admins decide per person whether onboarding (documents, bank details,
 * password) locks the dashboard, is available on Profile, or is off. A labelled
 * radio group with roving tabindex + arrow keys (WAI-ARIA radio pattern) keeps
 * the choice explicit and keyboard operable, matching StandardsAccessField.
 */
export function OnboardingModeField({
  value,
  defaultMode,
  onChange,
  savedMode,
  hasSubmitted = false,
  disabled,
}: OnboardingModeFieldProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = ONBOARDING_MODE_OPTIONS.find((o) => o.value === value);
  const impact = impactMessage(value, savedMode, hasSubmitted);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = NEXT_KEYS.has(event.key) ? 1 : PREV_KEYS.has(event.key) ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const count = ONBOARDING_MODE_OPTIONS.length;
    const nextIndex = (index + step + count) % count;
    onChange(ONBOARDING_MODE_OPTIONS[nextIndex].value);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p id="onboarding-mode-label" className="text-sm font-semibold text-foreground">
            Employee onboarding
          </p>
          <p className="text-xs text-muted-foreground">
            Address, statutory documents, bank details and HR verification.
          </p>
        </div>
      </div>

      <div role="radiogroup" aria-labelledby="onboarding-mode-label" className="grid grid-cols-12 gap-2">
        {ONBOARDING_MODE_OPTIONS.map((option, index) => {
          const isSelected = value === option.value;
          const Icon = MODE_ICONS[option.value];
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "col-span-4 flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? option.value === "off"
                    ? "border-destructive/60 bg-destructive/10 text-foreground"
                    : "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted/50"
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {option.label}
              </span>
              {defaultMode === option.value ? (
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
      {impact ? (
        <p
          className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
          aria-live="polite"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0">{impact}</span>
        </p>
      ) : null}
    </div>
  );
}
