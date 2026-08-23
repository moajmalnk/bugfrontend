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
        "min-h-screen flex flex-col items-center justify-center px-4 py-8",
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

      <div className="flex w-full max-w-3xl flex-col items-center gap-6">
        <video
          src={BRAND_STATUS_VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden={showOverlay}
          className="w-full max-h-[min(70vh,720px)] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
        />

        {showOverlay && children ? (
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border border-white/10",
              "bg-slate-900/80 backdrop-blur-sm p-6 sm:p-8 text-center shadow-xl"
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
