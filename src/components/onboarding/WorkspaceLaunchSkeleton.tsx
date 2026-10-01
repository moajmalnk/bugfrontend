import { Skeleton } from "@/components/ui/skeleton";
import { MainLayoutSkeleton } from "@/components/layout/MainLayoutSkeleton";

const STEP_COUNT = 5;

/**
 * Body of the onboarding wizard while its draft/details hydrate. Mirrors the
 * Address step (photo card + two-column fields) so content swaps in without shift.
 */
export function OnboardingBodySkeleton() {
  return (
    <div className="grid grid-cols-12 gap-x-5 gap-y-5" role="status" aria-label="Loading onboarding">
      <div className="col-span-12 space-y-2">
        <Skeleton className="h-5 w-48 rounded-xl" />
        <Skeleton className="h-4 w-72 max-w-full rounded-xl" />
      </div>
      <div className="col-span-12 rounded-2xl border border-border/60 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto sm:mx-0 shrink-0" />
          <div className="flex-1 space-y-2.5 min-w-0">
            <Skeleton className="h-4 w-28 rounded-xl" />
            <Skeleton className="h-3 w-64 max-w-full rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="col-span-12 md:col-span-6 space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
      ))}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={`r-${i}`} className="col-span-12 md:col-span-4 space-y-2">
          <Skeleton className="h-3.5 w-24 rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/**
 * Why: The welcome-email link signs in, routes, and opens the mandatory wizard.
 * Showing one wizard-shaped skeleton for that whole hand-off (instead of the login
 * form, then the dashboard, then the modal) makes it read as a single step.
 */
export function WorkspaceLaunchSkeleton({ message = "Preparing your workspace…" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[1000]" aria-busy="true">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <MainLayoutSkeleton />
      </div>
      <div className="absolute inset-0 bg-black/80" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-1.5 sm:p-2.5">
        <div className="w-full max-w-[980px] max-h-[min(92dvh,920px)] overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl flex flex-col">
          <div className="px-4 sm:px-8 pt-4 sm:pt-7 pb-3 sm:pb-5 border-b border-border/50 space-y-4 sm:space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                  Employee onboarding
                </p>
                <p className="text-xl sm:text-[1.75rem] font-semibold tracking-tight text-foreground">
                  Set up your workspace
                </p>
                <Skeleton className="h-4 w-80 max-w-full rounded-xl hidden sm:block" />
              </div>
              <Skeleton className="h-14 w-16 rounded-2xl shrink-0" />
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 min-w-0">
                  <div className={i === 0 ? "h-1.5 rounded-full bg-primary/60" : "h-1.5 rounded-full bg-muted"} />
                  <Skeleton className="h-3 w-16 rounded-xl hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-hidden flex-1 min-h-0">
            <OnboardingBodySkeleton />
          </div>
          <div className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 border-t border-border/50 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground flex items-center gap-2" role="status" aria-live="polite">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
              {message}
            </p>
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceLaunchSkeleton;
