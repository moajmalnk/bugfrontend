import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  whatsappService,
  type ProjectWhatsAppShareData,
} from "@/services/whatsappService";
import {
  Check,
  ClipboardCopy,
  Loader2,
  Pin,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type ProjectCopyKind = "full" | "pin";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: ProjectWhatsAppShareData }
  | { status: "error" };

interface ProjectCopyDialogProps {
  project: { id: string; name: string } | null;
  onClose: () => void;
  loadData: () => Promise<ProjectWhatsAppShareData>;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

/**
 * Why: Copy on project cards must choose between the full WhatsApp briefing
 * and a short pin message for internal "Bugs | …" groups (no client).
 */
export function ProjectCopyDialog({
  project,
  onClose,
  loadData,
}: ProjectCopyDialogProps) {
  const open = project !== null;
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const [busyKind, setBusyKind] = useState<ProjectCopyKind | null>(null);
  const [copiedKind, setCopiedKind] = useState<ProjectCopyKind | null>(null);
  const requestIdRef = useRef(0);
  const copiedTimerRef = useRef<number | null>(null);

  const resetState = useCallback(() => {
    requestIdRef.current += 1;
    setLoad({ status: "idle" });
    setBusyKind(null);
    setCopiedKind(null);
    if (copiedTimerRef.current != null) {
      window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoad({ status: "loading" });
    try {
      const data = await loadData();
      if (requestId === requestIdRef.current) {
        setLoad({ status: "ready", data });
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setLoad({ status: "error" });
      }
    }
  }, [loadData]);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    void fetchData();
    // Re-run only when a different project opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current != null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (busyKind) return;
    resetState();
    onClose();
  }, [busyKind, onClose, resetState]);

  const handleCopy = useCallback(
    async (kind: ProjectCopyKind) => {
      if (busyKind || load.status !== "ready") return;
      setBusyKind(kind);
      try {
        const text =
          kind === "pin"
            ? whatsappService.formatProjectPinMessage(load.data)
            : whatsappService.formatProjectShareMessage(load.data);

        await writeClipboard(text);

        setCopiedKind(kind);
        if (copiedTimerRef.current != null) {
          window.clearTimeout(copiedTimerRef.current);
        }
        copiedTimerRef.current = window.setTimeout(() => {
          setCopiedKind((current) => (current === kind ? null : current));
          copiedTimerRef.current = null;
        }, 2000);

        toast({
          title: kind === "pin" ? "Pin message copied" : "Project details copied",
          description:
            kind === "pin"
              ? `Paste in WhatsApp group “Bugs | ${load.data.projectName}”, then pin the message.`
              : "Full project briefing is on your clipboard — paste anywhere.",
        });
      } catch (error) {
        console.error("Failed to copy project message:", error);
        toast({
          title: "Copy failed",
          description: "Could not copy the message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setBusyKind(null);
      }
    },
    [busyKind, load]
  );

  const groupLabel = project ? `Bugs | ${project.name}` : "Bugs | …";
  const isLoading = load.status === "loading" || load.status === "idle";
  const isReady = load.status === "ready";
  const isError = load.status === "error";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent
        className="w-[calc(100%-1.5rem)] max-w-[600px] rounded-2xl gap-0 p-0 overflow-hidden"
        showCloseButton={!busyKind}
      >
        <DialogHeader className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6 border-b border-border/60">
          <DialogTitle className="text-lg sm:text-xl pr-8">
            Share project message
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Copy for the internal WhatsApp group{" "}
            <span className="font-medium text-foreground">{groupLabel}</span>
            {" "}
            (testers, developers, team lead, CRM — no client).
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 sm:px-6 sm:py-5 grid grid-cols-12 gap-4">
          {isLoading && (
            <div className="col-span-12 flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm">Loading project details…</p>
            </div>
          )}

          {isError && (
            <div className="col-span-12 flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-destructive">
                Could not load project details.
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => void fetchData()}
              >
                Retry
              </Button>
            </div>
          )}

          {isReady && (
            <>
              <button
                type="button"
                disabled={!!busyKind}
                onClick={() => void handleCopy("full")}
                className={cn(
                  "col-span-12 rounded-2xl border border-border bg-card p-4 text-left transition-all",
                  "hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  "disabled:opacity-60 disabled:pointer-events-none",
                  "grid grid-cols-12 gap-3 items-start"
                )}
              >
                <span className="col-span-12 sm:col-span-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0">
                  {busyKind === "full" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : copiedKind === "full" ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <ClipboardCopy className="h-5 w-5" />
                  )}
                </span>
                <span className="col-span-12 sm:col-span-11 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {copiedKind === "full"
                        ? "Copied full details"
                        : "Copy all project details"}
                    </span>
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Full briefing: timeline, analytics, team, compliance, links —
                    paste into the group or anywhere.
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={!!busyKind}
                onClick={() => void handleCopy("pin")}
                className={cn(
                  "col-span-12 rounded-2xl border border-border bg-card p-4 text-left transition-all",
                  "hover:border-amber-400/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                  "disabled:opacity-60 disabled:pointer-events-none",
                  "grid grid-cols-12 gap-3 items-start"
                )}
              >
                <span className="col-span-12 sm:col-span-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0">
                  {busyKind === "pin" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : copiedKind === "pin" ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Pin className="h-5 w-5" />
                  )}
                </span>
                <span className="col-span-12 sm:col-span-11 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {copiedKind === "pin"
                        ? "Copied pin message"
                        : "Copy pin message"}
                    </span>
                    <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Short status for pinning in{" "}
                    <span className="font-medium text-foreground">
                      {groupLabel}
                    </span>
                    : bugs, deadline, team, compliance. Paste → long-press → Pin.
                  </span>
                </span>
              </button>
            </>
          )}
        </div>

        <div className="px-5 py-3 sm:px-6 border-t border-border/60 flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={!!busyKind}
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
