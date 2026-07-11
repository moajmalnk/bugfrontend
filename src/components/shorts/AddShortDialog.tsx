import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  SHORT_CATEGORIES,
  shortsService,
  type CreateShortPayload,
  type ShortCategory,
  type ShortItem,
} from "@/services/shortsService";
import { Clapperboard, Link2, Loader2, Pencil, Upload } from "lucide-react";
import { useEffect, useState } from "react";

interface AddShortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (short: ShortItem) => void;
  onSaved?: (short: ShortItem) => void;
  /** When set, dialog edits this short instead of creating */
  initial?: ShortItem | null;
  projects?: { id: string; name: string }[];
}

const fieldClass =
  "h-11 rounded-xl border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-900/60 focus-visible:ring-violet-500/40";

export function AddShortDialog({
  open,
  onOpenChange,
  onCreated,
  onSaved,
  initial = null,
  projects = [],
}: AddShortDialogProps) {
  const isEdit = !!initial;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ShortCategory>("other");
  const [projectId, setProjectId] = useState<string>("");
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("other");
    setProjectId("");
    setMode("url");
    setSourceUrl("");
    setVideoFile(null);
    setThumbFile(null);
  };

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setCategory((initial.category as ShortCategory) || "other");
      setProjectId(initial.project_id || "");
      setMode(initial.source_type === "upload" ? "upload" : "url");
      setSourceUrl(initial.source_url || "");
      setVideoFile(null);
      setThumbFile(null);
    } else {
      reset();
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    if (!isEdit) {
      if (mode === "url" && !sourceUrl.trim()) {
        toast({ title: "Paste a YouTube, Instagram, or Facebook URL", variant: "destructive" });
        return;
      }
      if (mode === "upload" && !videoFile) {
        toast({ title: "Choose a video file", variant: "destructive" });
        return;
      }
    } else if (mode === "url" && sourceUrl.trim() === "" && initial?.source_type !== "upload") {
      toast({ title: "Video URL is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (isEdit && initial) {
        const payload: Parameters<typeof shortsService.update>[0] = {
          id: initial.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          project_id: projectId || null,
        };

        if (mode === "url") {
          const nextUrl = sourceUrl.trim();
          if (nextUrl && nextUrl !== (initial.source_url || "")) {
            payload.source_url = nextUrl;
          } else if (nextUrl && initial.source_type === "upload") {
            payload.source_url = nextUrl;
          }
        } else if (videoFile) {
          payload.video_path = await shortsService.upload(videoFile, "video");
        }

        if (thumbFile) {
          payload.thumbnail_path = await shortsService.upload(thumbFile, "thumbnail");
        }

        const updated = await shortsService.update(payload);
        toast({ title: "Short updated" });
        onOpenChange(false);
        onSaved?.(updated);
      } else {
        const payload: CreateShortPayload = {
          title: title.trim(),
          description: description.trim() || null,
          category,
          project_id: projectId || null,
          is_published: true,
        };

        if (mode === "url") {
          payload.source_url = sourceUrl.trim();
        } else if (videoFile) {
          payload.video_path = await shortsService.upload(videoFile, "video");
          if (thumbFile) {
            payload.thumbnail_path = await shortsService.upload(thumbFile, "thumbnail");
          }
        }

        const created = await shortsService.create(payload);
        toast({ title: "Short added" });
        reset();
        onOpenChange(false);
        onCreated?.(created);
      }
    } catch (err) {
      toast({
        title: isEdit ? "Failed to update short" : "Failed to add short",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) {
          onOpenChange(next);
          if (!next && !initial) reset();
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,560px)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-gray-200/50 p-0 dark:border-gray-700/50">
        <div className="relative shrink-0 overflow-hidden border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/80 via-transparent to-fuchsia-50/80 dark:from-violet-950/30 dark:via-transparent dark:to-fuchsia-950/30" />
          <DialogHeader className="relative px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg">
                {isEdit ? <Pencil className="h-5 w-5" /> : <Clapperboard className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {isEdit ? "Edit Short" : "Add Short"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-left text-sm text-gray-600 dark:text-gray-400">
                  {isEdit
                    ? "Update details, category, or replace the video link / file."
                    : "Share a YouTube / Instagram / Facebook link or upload a short video."}
                </DialogDescription>
                <div className="mt-2 h-1 w-14 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600" />
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="short-title" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Title
              </Label>
              <Input
                id="short-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Login button alignment bug"
                required
                className={fieldClass}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short-desc" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Description
              </Label>
              <Textarea
                id="short-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes"
                rows={3}
                className="min-h-[88px] rounded-xl border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-900/60 focus-visible:ring-violet-500/40"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ShortCategory)}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200] rounded-xl">
                    {SHORT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Project <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Select
                  value={projectId || "__none__"}
                  onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="z-[200] rounded-xl">
                    <SelectItem value="__none__">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Source</Label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200/60 bg-gray-50/80 p-1.5 dark:border-gray-700/60 dark:bg-gray-900/40">
                <button
                  type="button"
                  onClick={() => setMode("url")}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                    mode === "url"
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-800/80"
                  )}
                >
                  <Link2 className="h-4 w-4" />
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                    mode === "upload"
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-800/80"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              </div>

              {mode === "url" ? (
                <div className="space-y-2 rounded-2xl border border-violet-200/50 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <Label htmlFor="short-url" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Video URL
                  </Label>
                  <Input
                    id="short-url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://www.youtube.com/shorts/..."
                    className={fieldClass}
                  />
                  <p className="text-xs text-muted-foreground">
                    YouTube Shorts, Instagram Reels, or Facebook video links.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-violet-200/50 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <div className="space-y-2">
                    <Label htmlFor="short-video" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {isEdit ? "Replace video (optional)" : "Video file"}
                    </Label>
                    <Input
                      id="short-video"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      className={cn(fieldClass, "cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-violet-700 dark:file:bg-violet-900/40 dark:file:text-violet-200")}
                    />
                    {isEdit && initial?.source_type === "upload" && !videoFile ? (
                      <p className="text-xs text-muted-foreground">Keeping the current uploaded video.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">mp4 / webm / mov</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="short-thumb" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {isEdit ? "Replace thumbnail (optional)" : "Thumbnail (optional)"}
                    </Label>
                    <Input
                      id="short-thumb"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                      className={cn(fieldClass, "cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-violet-700 dark:file:bg-violet-900/40 dark:file:text-violet-200")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200/50 bg-gray-50/50 px-6 py-4 dark:border-gray-700/50 dark:bg-gray-900/40 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 font-semibold text-white shadow-lg hover:from-violet-700 hover:to-fuchsia-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add Short"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
