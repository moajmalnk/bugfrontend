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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { useAuth } from "@/context/AuthContext";
import { extractApiErrorMessage } from "@/lib/apiError";
import { formatDetailedDate } from "@/lib/dateUtils";
import { ENV } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  bugDoubtService,
  type BugDoubt,
  type BugDoubtAttachment,
  type BugDoubtReply,
} from "@/services/bugDoubtService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleHelp,
  Loader2,
  MessageCircleReply,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

const BODY_MAX = 2000;

type MessageKind = "doubt" | "reply";

type ChatMessage = {
  id: string;
  kind: MessageKind;
  doubtId: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
  attachments: BugDoubtAttachment[];
  prefix: string;
};

function audioUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${ENV.API_URL}/audio.php?path=${encodeURIComponent(path)}`;
}

function sameUser(a?: string | null, b?: string | null): boolean {
  return Boolean(a) && Boolean(b) && String(a) === String(b);
}

function VoiceList({
  attachments,
  prefix,
  mine,
  removableIds,
  onRemoveAttachment,
}: {
  attachments: BugDoubtAttachment[];
  prefix: string;
  mine: boolean;
  removableIds?: Set<string>;
  onRemoveAttachment?: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  if (!attachments?.length) return null;
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {attachments.map((att) => {
        const id = `${prefix}-${att.id}`;
        const canRemove =
          Boolean(onRemoveAttachment) &&
          (!removableIds || removableIds.has(att.id));
        return (
          <WhatsAppVoiceMessage
            key={att.id}
            id={id}
            audioSource={audioUrl(att.file_path)}
            duration={att.duration || 0}
            fileName={att.file_name || "voice-note.webm"}
            accent={mine ? "sent" : "received"}
            layout="form"
            isActive={activeId === id}
            onPlay={(voiceId) => setActiveId(voiceId)}
            onPause={(voiceId) => {
              if (voiceId === activeId) setActiveId(null);
            }}
            onRemove={
              canRemove ? () => onRemoveAttachment?.(att.id) : undefined
            }
          />
        );
      })}
    </div>
  );
}

function ChatBubble({
  message,
  mine,
  canManage,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasText = Boolean(message.body.trim());
  const hasVoice = (message.attachments || []).length > 0;

  return (
    <div
      className={cn(
        "group flex w-full min-w-0",
        mine ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 max-w-[85%] sm:max-w-[75%] gap-2",
          mine ? "flex-row-reverse" : "flex-row"
        )}
      >
        {!mine ? (
          <span className="mt-5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <User className="h-4 w-4" />
          </span>
        ) : null}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-1",
            mine ? "items-end" : "items-start"
          )}
        >
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 px-1 text-xs",
              mine ? "flex-row-reverse" : "flex-row"
            )}
          >
            <span className="font-medium text-foreground">
              {mine ? "You" : message.name || "Unknown"}
            </span>
            <span className="text-muted-foreground">
              {formatDetailedDate(message.createdAt)}
            </span>
            {canManage ? (
              <div
                className={cn(
                  "flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                  mine ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                  aria-label="Edit message"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-xl text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                  aria-label="Delete message"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
          {hasText ? (
            <div
              className={cn(
                "w-fit max-w-full rounded-2xl border px-3 py-2 text-sm shadow-sm",
                mine
                  ? "rounded-br-md border-emerald-500/30 bg-emerald-600 text-white"
                  : "rounded-bl-md border-border/60 bg-muted/70 text-foreground dark:bg-slate-800/90"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
            </div>
          ) : null}
          {hasVoice ? (
            <VoiceList
              attachments={message.attachments}
              prefix={message.prefix}
              mine={mine}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReplyComposer({
  doubtId,
  onDone,
}: {
  doubtId: string;
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const [voice, setVoice] = useState<RecordedVoiceNote | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      bugDoubtService.reply(
        doubtId,
        body.trim(),
        voice ? { blob: voice.blob, duration: voice.duration } : null
      ),
    onSuccess: () => {
      toast({ title: "Reply sent" });
      setBody("");
      setVoice(null);
      queryClient.invalidateQueries({ queryKey: ["bug-doubts"] });
      onDone();
    },
    onError: (error) => {
      toast({
        title: "Reply not saved",
        description: extractApiErrorMessage(error, "Failed to submit reply"),
        variant: "destructive",
      });
    },
  });

  const isValid = body.trim().length > 0 || voice !== null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mutation.isPending || !isValid) return;
    mutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`doubt-reply-${doubtId}`}>Reply</Label>
        <Textarea
          id={`doubt-reply-${doubtId}`}
          value={body}
          maxLength={BODY_MAX}
          disabled={mutation.isPending}
          placeholder="Reply with text and/or voice"
          onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
          className="min-h-[80px] rounded-xl"
        />
      </div>
      {voice ? (
        <WhatsAppVoiceMessage
          id={`reply-preview-${doubtId}`}
          audioSource={voice.blob}
          duration={voice.duration}
          waveform={voice.waveform}
          accent="sent"
          layout="form"
          onRemove={() => setVoice(null)}
        />
      ) : (
        <WhatsAppVoiceRecorder
          onComplete={(note) => setVoice(note)}
          disabled={mutation.isPending}
          maxDuration={300}
        />
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={mutation.isPending || !isValid}
          className="rounded-xl"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send reply"
          )}
        </Button>
      </div>
    </form>
  );
}

function EditMessageDialog({
  open,
  message,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  message: ChatMessage | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState("");
  const [keptAttachments, setKeptAttachments] = useState<BugDoubtAttachment[]>(
    []
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [voice, setVoice] = useState<RecordedVoiceNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const baselineRef = useRef({ body: "", removed: [] as string[] });
  const historyPushed = useRef(false);
  const closingRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!open || !message) {
      setBody("");
      setKeptAttachments([]);
      setRemovedIds([]);
      setVoice(null);
      setSaving(false);
      setUnsavedOpen(false);
      return;
    }
    const nextBody = message.body || "";
    const nextKept = [...(message.attachments || [])];
    setBody(nextBody);
    setKeptAttachments(nextKept);
    setRemovedIds([]);
    setVoice(null);
    baselineRef.current = { body: nextBody, removed: [] };
    window.history.pushState({ modal: "edit-doubt-message" }, "");
    historyPushed.current = true;
    closingRef.current = false;
    const onPop = () => {
      if (closingRef.current) {
        closingRef.current = false;
        return;
      }
      historyPushed.current = false;
      if (dirtyRef.current) {
        window.history.pushState({ modal: "edit-doubt-message" }, "");
        historyPushed.current = true;
        setUnsavedOpen(true);
        return;
      }
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, message, onOpenChange]);

  const isDirty =
    body.trim() !== baselineRef.current.body.trim() ||
    removedIds.length > 0 ||
    voice !== null;
  dirtyRef.current = isDirty;

  const isValid =
    body.trim().length > 0 || keptAttachments.length > 0 || voice !== null;

  const closeClean = () => {
    closingRef.current = true;
    if (
      historyPushed.current &&
      window.history.state?.modal === "edit-doubt-message"
    ) {
      historyPushed.current = false;
      window.history.back();
    }
    onOpenChange(false);
  };

  const requestClose = () => {
    if (saving) return;
    if (isDirty) {
      setUnsavedOpen(true);
      return;
    }
    closeClean();
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!message || saving || !isValid) return;
    setSaving(true);
    try {
      const payload = {
        body: body.trim(),
        voice: voice
          ? { blob: voice.blob, duration: voice.duration }
          : null,
        removeAttachmentIds: removedIds,
      };
      if (message.kind === "doubt") {
        await bugDoubtService.updateDoubt(message.id, payload);
      } else {
        await bugDoubtService.updateReply(message.id, payload);
      }
      toast({ title: "Message updated" });
      onSaved();
      closeClean();
    } catch (error) {
      toast({
        title: "Update failed",
        description: extractApiErrorMessage(error, "Could not save changes"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
      >
        <DialogContent className="max-w-[600px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {message?.kind === "reply" ? "reply" : "doubt"}
            </DialogTitle>
            <DialogDescription>
              Update the text and voice. Empty messages are not allowed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid grid-cols-12 gap-4">
            <div className="col-span-12 flex flex-col gap-2">
              <Label htmlFor="edit-doubt-body">Description</Label>
              <Textarea
                id="edit-doubt-body"
                value={body}
                maxLength={BODY_MAX}
                disabled={saving}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                className="min-h-[100px] rounded-xl"
              />
              <p className="text-right text-xs text-muted-foreground">
                {body.length}/{BODY_MAX}
              </p>
            </div>
            <div className="col-span-12 flex flex-col gap-2">
              <Label>Voice message</Label>
              {keptAttachments.length > 0 ? (
                <VoiceList
                  attachments={keptAttachments}
                  prefix={`edit-${message?.id || "msg"}`}
                  mine
                  onRemoveAttachment={(id) => {
                    setKeptAttachments((prev) =>
                      prev.filter((att) => att.id !== id)
                    );
                    setRemovedIds((prev) =>
                      prev.includes(id) ? prev : [...prev, id]
                    );
                  }}
                />
              ) : null}
              {voice ? (
                <WhatsAppVoiceMessage
                  id={`edit-new-voice-${message?.id || "msg"}`}
                  audioSource={voice.blob}
                  duration={voice.duration}
                  waveform={voice.waveform}
                  accent="sent"
                  layout="form"
                  onRemove={() => setVoice(null)}
                />
              ) : (
                <WhatsAppVoiceRecorder
                  onComplete={(note) => setVoice(note)}
                  disabled={saving}
                  maxDuration={300}
                />
              )}
            </div>
            <DialogFooter className="col-span-12 gap-2 sm:gap-2">
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
                type="submit"
                className="rounded-xl"
                disabled={saving || !isValid}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Discard your edits to this message?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 rounded-xl">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={() => {
                setUnsavedOpen(false);
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

function toChatMessages(doubt: BugDoubt): ChatMessage[] {
  const asked: ChatMessage = {
    id: doubt.id,
    kind: "doubt",
    doubtId: doubt.id,
    userId: doubt.asked_by,
    name: doubt.asked_by_name || "Unknown",
    body: doubt.body || "",
    createdAt: doubt.created_at,
    attachments: doubt.attachments || [],
    prefix: `doubt-${doubt.id}`,
  };
  const replies: ChatMessage[] = (doubt.replies || []).map(
    (reply: BugDoubtReply) => ({
      id: reply.id,
      kind: "reply" as const,
      doubtId: doubt.id,
      userId: reply.user_id,
      name: reply.user_name || "Unknown",
      body: reply.body || "",
      createdAt: reply.created_at,
      attachments: reply.attachments || [],
      prefix: `reply-${reply.id}`,
    })
  );
  return [asked, ...replies];
}

function DoubtThread({
  doubt,
  currentUserId,
  isAdmin,
  readOnly = false,
}: {
  doubt: BugDoubt;
  currentUserId?: string;
  isAdmin: boolean;
  readOnly?: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const messages = toChatMessages(doubt);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bug-doubts"] });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "doubt") {
        await bugDoubtService.deleteDoubt(deleteTarget.id);
      } else {
        await bugDoubtService.deleteReply(deleteTarget.id);
      }
      toast({ title: "Message deleted" });
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: extractApiErrorMessage(error, "Could not delete message"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 sm:p-4">
      <div
        className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
        style={{
          scrollbarColor: "hsl(var(--muted-foreground) / 0.35) transparent",
        }}
      >
        {messages.map((message) => {
          const mine = sameUser(message.userId, currentUserId);
          const canManage =
            !readOnly && (mine || isAdmin);
          return (
            <ChatBubble
              key={`${message.kind}-${message.id}`}
              message={message}
              mine={mine}
              canManage={canManage}
              onEdit={() => setEditTarget(message)}
              onDelete={() => setDeleteTarget(message)}
            />
          );
        })}
      </div>

      {replyOpen && !readOnly ? (
        <ReplyComposer doubtId={doubt.id} onDone={() => setReplyOpen(false)} />
      ) : !readOnly ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setReplyOpen(true)}
          >
            <MessageCircleReply className="mr-2 h-4 w-4" />
            Reply
          </Button>
        </div>
      ) : null}

      <EditMessageDialog
        open={Boolean(editTarget)}
        message={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={refresh}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.kind === "reply" ? "reply" : "doubt"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "doubt"
                ? "This permanently removes the doubt and all of its replies."
                : "This permanently removes this reply and its voice notes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export function BugDoubtClearingCard({
  bugId,
  readOnly = false,
}: {
  bugId: string;
  readOnly?: boolean;
}) {
  const { currentUser } = useAuth();
  const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";
  const { data: doubts = [], isLoading, isError } = useQuery({
    queryKey: ["bug-doubts", bugId, readOnly],
    queryFn: () =>
      bugDoubtService.list(bugId, { skipErrorHandler: readOnly }),
    enabled: !!bugId,
    staleTime: 15_000,
    retry: readOnly ? false : 2,
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <Skeleton className="h-6 w-40 rounded-xl" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return null;
  }

  if (doubts.length === 0) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/40 via-transparent to-indigo-50/30 dark:from-violet-950/20 dark:via-transparent dark:to-indigo-950/10" />
      <CardHeader className="relative">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <CircleHelp className="h-5 w-5" />
          Doubt clearing ({doubts.length})
          {readOnly ? (
            <span className="text-xs font-medium text-muted-foreground">
              · Read-only
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4">
          {doubts.map((doubt) => (
            <DoubtThread
              key={doubt.id}
              doubt={doubt}
              currentUserId={currentUser?.id}
              isAdmin={isAdmin}
              readOnly={readOnly}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
