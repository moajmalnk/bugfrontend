import { cn } from "@/lib/utils";
import { BRAND_STATUS_VIDEO_SRC } from "@/lib/brandStatusVideoCache";
import type { ReactNode } from "react";

export type BrandStatusVideoVariant = "boot" | "404" | "offline";

const VARIANT_HEADINGS: Record<Exclude<BrandStatusVideoVariant, "boot">, string> = {
  "404": "This page doesn't exist",
  offline: "Connection lost",
};

type BrandStatusVideoScreenProps = {
  variant: BrandStatusVideoVariant;
  children?: ReactNode;
  className?: string;
};

export function BrandStatusVideoScreen({
  variant,
  children,
  className,
}: BrandStatusVideoScreenProps) {
  const showOverlay = variant !== "boot";

  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col items-center justify-center",
        "px-3 py-4 sm:px-6 sm:py-8",
        "bg-[#0f172a] text-slate-100",
        className
      )}
    >
      {variant === "boot" ? (
        <h1 className="sr-only">
          BugRicer — Advanced Bug Tracking &amp; Project Management Platform
        </h1>
      ) : (
        <h1 className="sr-only">{VARIANT_HEADINGS[variant]}</h1>
      )}

      {/* Why: One shared column so the brand video and status card align on every breakpoint. */}
      <div className="flex w-full max-w-xl flex-col items-stretch gap-4 sm:gap-6">
        <video
          src={BRAND_STATUS_VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden={showOverlay}
          className={cn(
            "w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10",
            showOverlay
              ? "max-h-[min(38vh,320px)] sm:max-h-[min(42vh,400px)]"
              : "max-h-[min(70vh,720px)]"
          )}
        />

        {showOverlay && children ? (
          <div
            className={cn(
              "w-full rounded-2xl border border-white/10",
              "bg-slate-900/80 backdrop-blur-sm p-5 sm:p-8 text-center shadow-xl"
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
