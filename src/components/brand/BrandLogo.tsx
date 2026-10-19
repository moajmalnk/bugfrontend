import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Square bug mark. The default is the full BugRicer wordmark. */
  mark?: boolean;
};

/**
 * Why: Light and dark surfaces need opposite inks. One component keeps the
 * new wordmark in sync everywhere the old bug tile used to stand in for the logo.
 */
export function BrandLogo({ className, mark = false }: BrandLogoProps) {
  const black = mark ? "/brand/bugricer-mark-black.png" : "/brand/bugricer-wordmark-black.png";
  const white = mark ? "/brand/bugricer-mark-white.png" : "/brand/bugricer-wordmark-white.png";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-start overflow-visible",
        className
      )}
    >
      <img
        src={black}
        alt="BugRicer"
        className="h-full w-auto max-h-full max-w-full object-contain object-left dark:hidden"
        decoding="async"
      />
      <img
        src={white}
        alt=""
        className="hidden h-full w-auto max-h-full max-w-full object-contain object-left dark:block"
        decoding="async"
      />
    </span>
  );
}
