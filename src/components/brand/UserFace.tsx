import { BrandAvatar } from "@/components/brand/BrandAvatar";
import { hasUploadedAvatar, resolveAvatarUrl } from "@/lib/avatarUrl";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type UserFaceProps = {
  avatar?: string | null;
  name?: string | null;
  className?: string;
  alt?: string;
  /** When set, real photos open a preview on click. */
  onPreview?: () => void;
};

/**
 * Why: Profile / sidebar faces must stay readable in dark mode.
 * - No photo → BrandAvatar (black mark on white plate)
 * - Real photo → same white plate + object-contain (black logo crops stay visible)
 */
export function UserFace({
  avatar,
  name,
  className,
  alt,
  onPreview,
}: UserFaceProps) {
  const displayName = (name || "User").trim() || "User";
  const label = alt || `${displayName}'s profile photo`;
  const hasPhoto = hasUploadedAvatar(avatar);
  const src = hasPhoto ? resolveAvatarUrl(avatar, displayName) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatar]);

  if (!src || failed) {
    return <BrandAvatar className={className} alt={label} />;
  }

  const shellClass = cn("overflow-hidden bg-white", className);

  const img = (
    <img
      key={src}
      src={src}
      alt={label}
      className="h-full w-full object-contain p-[12%]"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );

  if (onPreview) {
    return (
      <button
        type="button"
        className={cn(
          shellClass,
          "cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        )}
        aria-label={`View ${label}`}
        onClick={onPreview}
      >
        {img}
      </button>
    );
  }

  return <span className={shellClass}>{img}</span>;
}
