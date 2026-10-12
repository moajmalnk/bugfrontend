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
import { Skeleton } from "@/components/ui/skeleton";
import { bugService } from "@/services/bugService";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type DuplicateOriginal = {
  id: string;
  title: string;
};

type LoadStatus = "idle" | "loading" | "success" | "empty" | "error";

type DuplicateOfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  excludeBugId: string;
  onConfirm: (bug: DuplicateOriginal) => Promise<void>;
};

/**
 * Why: Marking a bug Duplicate must name the original in the same project.
 * Cancel leaves the current status unchanged.
 */
export function DuplicateOfDialog({
  open,
  onOpenChange,
  projectId,
  excludeBugId,
  onConfirm,
}: DuplicateOfDialogProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<DuplicateOriginal[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [selected, setSelected] = useState<DuplicateOriginal | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      setResults([]);
      setSelected(null);
      setLoadStatus("idle");
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    if (!projectId) {
      setResults([]);
      setLoadStatus("empty");
      return;
    }
    let cancelled = false;
    setLoadStatus("loading");
    bugService
      .getBugs({
        projectId,
        search: debounced || undefined,
        page: 1,
        limit: 20,
      })
      .then((res) => {
        if (cancelled) return;
        const bugs = (res.bugs || [])
          .filter((bug) => String(bug.id) !== String(excludeBugId))
          .map((bug) => ({
            id: String(bug.id),
            title: bug.title?.trim() || "Untitled bug",
          }));
        setResults(bugs);
        setLoadStatus(bugs.length ? "success" : "empty");
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setLoadStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, debounced, excludeBugId, retry]);

  const requestClose = () => {
    if (saving) return;
    if (selected && !window.confirm("You have unsaved changes.")) return;
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await onConfirm(selected);
      setSelected(null);
      onOpenChange(false);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Mark as duplicate</DialogTitle>
          <DialogDescription>
            Choose the original bug in this project. Cancel keeps the current status.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Input
            value={query}
            maxLength={200}
            placeholder="Search by title"
            className="rounded-xl"
            disabled={saving}
            onChange={(event) => setQuery(event.target.value.slice(0, 200))}
          />

          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            {loadStatus === "loading" && (
              <div className="grid gap-2 p-3">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            )}
            {loadStatus === "empty" && (
              <p className="p-4 text-sm text-muted-foreground">
                No other bugs in this project match that title.
              </p>
            )}
            {loadStatus === "error" && (
              <div className="grid gap-3 p-4">
                <p className="text-sm text-destructive">
                  Could not load bugs. Try again.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry
                </Button>
              </div>
            )}
            {loadStatus === "success" && (
              <div className="grid gap-2 p-2">
                {results.map((bug) => {
                  const isSelected = selected?.id === bug.id;
                  return (
                    <button
                      key={bug.id}
                      type="button"
                      disabled={saving}
                      onClick={() => setSelected(bug)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm text-foreground",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-muted"
                      )}
                    >
                      <span className="line-clamp-2">{bug.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={saving}
            onClick={requestClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={!selected || saving || loadStatus === "loading"}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
