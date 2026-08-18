import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { extractApiErrorMessage } from "@/lib/apiError";
import { bugDoubtService } from "@/services/bugDoubtService";
import { CircleHelp, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

const BODY_MAX = 2000;

type AskDoubtDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bugId: string;
  onCreated?: () => void;
};

export function AskDoubtDialog({
  open,
  onOpenChange,
  bugId,
  onCreated,
}: AskDoubtDialogProps) {
  const [body, setBody] = useState("");
  const [voice, setVoice] = useState<RecordedVoiceNote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const historyPushed = useRef(false);
  const closingRef = useRef(false);
  const isDirtyRef = useRef(false);

  const isDirty = body.trim().length > 0 || voice !== null;
  const isValid = isDirty;
  isDirtyRef.current = isDirty;

  const resetForm = () => {
    setBody("");
    setVoice(null);
    setSubmitting(false);
  };

  const closeClean = () => {
    closingRef.current = true;
    if (historyPushed.current && window.history.state?.modal === "ask-doubt") {
      historyPushed.current = false;
      window.history.back();
    }
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
      setUnsavedOpen(false);
      return;
    }
    window.history.pushState({ modal: "ask-doubt" }, "");
    historyPushed.current = true;
    closingRef.current = false;
    const onPop = () => {
      if (closingRef.current) {
        closingRef.current = false;
        return;
      }
      historyPushed.current = false;
      if (isDirtyRef.current) {
        window.history.pushState({ modal: "ask-doubt" }, "");
        historyPushed.current = true;
        setUnsavedOpen(true);
        return;
      }
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onOpenChange]);

  const requestClose = () => {
    if (submitting) return;
    if (isDirty) {
      setUnsavedOpen(true);
      return;
    }
    closeClean();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !isValid) return;
    setSubmitting(true);
    try {
      await bugDoubtService.create(
        bugId,
        body.trim(),
        voice
          ? { blob: voice.blob, duration: voice.duration }
          : null
      );
      toast({
        title: "Doubt sent",
        description: "The person who raised this bug has been notified.",
      });
      resetForm();
      onCreated?.();
      closeClean();
    } catch (error) {
      toast({
        title: "Doubt not saved",
        description: extractApiErrorMessage(error, "Failed to submit doubt"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent
          className="sm:max-w-[600px] rounded-2xl gap-4"
          showCloseButton={!submitting}
        >
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
                <CircleHelp className="h-4 w-4" />
              </span>
              Ask a doubt
            </DialogTitle>
            <DialogDescription>
              Describe what is unclear. You can also add a voice message. This
              is sent to the person who raised the bug.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doubt-body">Description</Label>
              <Textarea
                id="doubt-body"
                value={body}
                maxLength={BODY_MAX}
                disabled={submitting}
                placeholder="What do you need clarified?"
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                className="min-h-[120px] rounded-xl"
              />
              <span className="text-xs text-muted-foreground tabular-nums self-end">
                {body.length}/{BODY_MAX}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Voice message</Label>
              <WhatsAppVoiceRecorder
                onComplete={(note) => setVoice(note)}
                disabled={submitting}
                maxDuration={300}
              />
              {voice && (
                <WhatsAppVoiceMessage
                  id="ask-doubt-preview"
                  audioSource={voice.blob}
                  duration={voice.duration}
                  waveform={voice.waveform}
                  accent="sent"
                  onRemove={() => setVoice(null)}
                />
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={submitting}
                onClick={requestClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !isValid}
                className="rounded-xl"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader className="text-left space-y-2">
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Discard them and close this dialog?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl mt-0">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setUnsavedOpen(false);
                resetForm();
                closeClean();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
