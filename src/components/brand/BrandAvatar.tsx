import { DEFAULT_AVATAR_LOGO } from "@/lib/avatarUrl";
import { cn } from "@/lib/utils";

type BrandAvatarProps = {
  className?: string;
  /** Extra classes on the inner img (padding, object-fit). */
  imgClassName?: string;
  alt?: string;
};

/**
 * Why: Default face when a user has no photo. Always black mark on a white
 * plate so the bug stays readable on both light and dark chrome (a white mark
 * on slate still fails when an uploaded black logo is shown on a dark tile).
 */
export function BrandAvatar({
  className,
  imgClassName,
  alt = "BugRicer",
}: BrandAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden bg-white",
        className
      )}
    >
      <img
        src={DEFAULT_AVATAR_LOGO}
        alt={alt}
        className={cn("h-full w-full object-contain p-[14%]", imgClassName)}
        decoding="async"
      />
    </span>
  );
}
