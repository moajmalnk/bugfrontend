import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  ProfilePhotoResizeModal,
  validateProfilePhotoSource,
} from "@/components/onboarding/ProfilePhotoResizeModal";
import { UserAvatar } from "@/components/users/UserAvatar";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import { User } from "@/types";
import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type EditOwnProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onUpdated: (user: User) => void;
};

export function EditOwnProfileDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: EditOwnProfileDialogProps) {
  const [username, setUsername] = useState(user.username || "");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setUsername(user.username || "");
    const raw = (user.phone || "").replace(/^\+91/, "").replace(/\D/g, "");
    setPhoneDigits(raw.slice(0, 10));
    setProfilePhoto(null);
    setPhotoPreview(null);
    setUsernameError("");
    setSubmitting(false);
  }, [open, user.username, user.phone]);

  useEffect(() => {
    if (!profilePhoto) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(profilePhoto);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhoto]);

  const displayName = user.name || user.username || "User";
  const avatarSrc = photoPreview || resolveAvatarUrl(user.avatar, displayName);

  const validateUsername = (value: string) => {
    if (value.length < 3) return "Username must be at least 3 characters";
    if (value.length > 50) return "Username max 50 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return "Letters, numbers, and underscores only";
    }
    return "";
  };

  const isDirty =
    username.trim() !== (user.username || "").trim() ||
    phoneDigits !== (user.phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10) ||
    !!profilePhoto;

  const isValid =
    !validateUsername(username.trim()) &&
    (phoneDigits.length === 0 || phoneDigits.length === 10);

  const handlePhotoPick = (file: File | null) => {
    if (!file) return;
    const err = validateProfilePhotoSource(file);
    if (err) {
      toast({ title: "Invalid photo", description: err, variant: "destructive" });
      return;
    }
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  };

  const handleSubmit = async () => {
    const userErr = validateUsername(username.trim());
    setUsernameError(userErr);
    if (userErr || !isValid) return;
    if (!isDirty) {
      toast({ title: "No changes", description: "Update a field before saving." });
      return;
    }

    setSubmitting(true);
    try {
      const trimmedUsername = username.trim();
      const currentPhoneDigits = (user.phone || "")
        .replace(/^\+91/, "")
        .replace(/\D/g, "")
        .slice(0, 10);
      const usernameChanged = trimmedUsername !== (user.username || "").trim();
      const phoneChanged = phoneDigits !== currentPhoneDigits;

      const updated = await userService.updateOwnProfile({
        ...(usernameChanged ? { username: trimmedUsername } : {}),
        ...(phoneChanged ? { phone: phoneDigits ? `+91${phoneDigits}` : "" } : {}),
        profile_photo: profilePhoto,
      });
      onUpdated(updated);
      toast({ title: "Profile updated", description: "Your changes were saved." });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not save profile",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl gap-4">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update your username, phone, and profile photo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <UserAvatar
                  name={displayName}
                  avatar={avatarSrc}
                  size="xl"
                  alt={`${displayName} profile photo`}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={submitting}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background shadow-sm hover:bg-muted transition-colors"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Square crop · JPG, PNG, or WebP · max 5MB
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  handlePhotoPick(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="own-profile-username">Username</Label>
              <Input
                id="own-profile-username"
                value={username}
                maxLength={50}
                disabled={submitting}
                className="h-11 rounded-xl"
                onChange={(e) => {
                  const next = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50);
                  setUsername(next);
                  setUsernameError(validateUsername(next.trim()));
                }}
              />
              {usernameError ? (
                <p className="text-xs text-destructive">{usernameError}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="own-profile-phone">Phone</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-11 shrink-0 items-center rounded-xl border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  +91
                </span>
                <Input
                  id="own-profile-phone"
                  inputMode="numeric"
                  value={phoneDigits}
                  maxLength={10}
                  disabled={submitting}
                  placeholder="10-digit mobile"
                  className="h-11 rounded-xl"
                  onChange={(e) => {
                    setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                />
              </div>
              {phoneDigits.length > 0 && phoneDigits.length < 10 ? (
                <p className="text-xs text-destructive">Enter a 10-digit phone number</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Email
              </p>
              <p className="text-sm font-medium truncate mt-0.5">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact an admin to change your email address.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn("rounded-xl")}
              disabled={submitting || !isValid || !isDirty}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfilePhotoResizeModal
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={(next) => {
          setCropOpen(next);
          if (!next && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
        onApply={(file) => {
          setProfilePhoto(file);
          if (cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
          setCropOpen(false);
        }}
      />
    </>
  );
}
