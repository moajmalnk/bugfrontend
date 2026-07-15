import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons that mirror the real app shell so the loading state keeps the
 * exact same geometry as the loaded UI (no layout shift when content arrives).
 */

const NAV_WIDTHS = ["w-24", "w-20", "w-16", "w-24", "w-20", "w-28", "w-24", "w-20"];
const ADMIN_WIDTHS = ["w-16", "w-20", "w-24", "w-28", "w-20"];

function SidebarSkeleton() {
  return (
    <div className="h-full flex flex-col bg-card/95 border-r border-border/50">
      {/* Header: logo + brand + notification bell */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 space-y-6 overflow-hidden">
        <div className="space-y-1">
          {NAV_WIDTHS.map((width, i) => (
            <div key={i} className="flex items-center gap-3 h-10 px-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className={`h-3.5 ${width}`} />
            </div>
          ))}
        </div>

        {/* Administration section */}
        <div className="space-y-1 border-t border-border/50 pt-4">
          <div className="flex items-center gap-3 h-10 px-3">
            <div className="h-5 w-5" />
            <Skeleton className="h-3 w-28" />
          </div>
          {ADMIN_WIDTHS.map((width, i) => (
            <div key={i} className="flex items-center gap-3 h-10 px-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className={`h-3.5 ${width}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Profile footer */}
      <div className="flex-shrink-0 p-3 border-t border-border/50 bg-muted/30">
        <div className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}

function MobileTopBarSkeleton() {
  return (
    <div className="lg:hidden flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b sticky top-0 z-40 bg-background pt-[calc(0.625rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Content-only skeleton: page header, toolbar, stat tiles and a card grid.
 * Used as the Suspense fallback for lazy pages (renders inside the shell).
 */
export function PageSkeleton() {
  return (
    <div
      className="min-w-0 w-full px-3 py-4 sm:p-4 md:p-6 lg:p-8"
      role="status"
      aria-label="Loading page"
    >
      <div className="max-w-7xl mx-auto w-full min-w-0 space-y-6 animate-in fade-in duration-300">
        {/* Page header: title + subtitle, primary action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <Skeleton className="h-7 w-48 sm:w-64" />
            <Skeleton className="h-4 w-64 sm:w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Toolbar: search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * Full app-shell skeleton shown while auth is resolving, before the real
 * layout can render. Mirrors MainLayout: desktop sidebar, mobile top bar,
 * and the page content area.
 */
export function MainLayoutSkeleton() {
  return (
    <div
      className="flex h-screen supports-[height:100dvh]:h-[100dvh] min-w-0 overflow-hidden bg-background"
      role="status"
      aria-label="Loading BugRicer"
    >
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 min-w-0">
        <SidebarSkeleton />
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <MobileTopBarSkeleton />
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}
