import { useHtmlDark } from "@/hooks/useHtmlDark";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Square bug mark. The default is the full BugRicer wordmark. */
  mark?: boolean;
};

/**
 * Why: Light and dark surfaces need opposite inks. Follow `html.dark` so the
 * asset always matches the visible theme (avoids nested ThemeProvider drift).
 */
export function BrandLogo({ className, mark = false }: BrandLogoProps) {
  const isDark = useHtmlDark();
  const src = mark
    ? isDark
      ? "/brand/bugricer-mark-white.png"
      : "/brand/bugricer-mark-black.png"
    : isDark
      ? "/brand/bugricer-wordmark-white.png"
      : "/brand/bugricer-wordmark-black.png";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-start overflow-visible",
        className
      )}
    >
      <img
        src={src}
        alt="BugRicer"
        className="h-full w-auto max-h-full max-w-full object-contain object-left"
        decoding="async"
      />
    </span>
  );
}
