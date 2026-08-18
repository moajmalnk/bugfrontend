import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CircleHelp, Loader2, MessageCircleReply, User } from "lucide-react";
import { FormEvent, useState } from "react";

const BODY_MAX = 2000;

type ChatMessage = {
  id: string;
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
}: {
  attachments: BugDoubtAttachment[];
  prefix: string;
  mine: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  if (!attachments?.length) return null;
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {attachments.map((att) => {
        const id = `${prefix}-${att.id}`;
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
          />
        );
      })}
    </div>
  );
}

function ChatBubble({
  message,
  mine,
}: {
  message: ChatMessage;
  mine: boolean;
}) {
  const hasText = Boolean(message.body.trim());
  const hasVoice = (message.attachments || []).length > 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
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

function toChatMessages(doubt: BugDoubt): ChatMessage[] {
  const asked: ChatMessage = {
    id: doubt.id,
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
}: {
  doubt: BugDoubt;
  currentUserId?: string;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const messages = toChatMessages(doubt);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 sm:p-4">
      <div
        className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
        style={{
          scrollbarColor: "hsl(var(--muted-foreground) / 0.35) transparent",
        }}
      >
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            mine={sameUser(message.userId, currentUserId)}
          />
        ))}
      </div>

      {replyOpen ? (
        <ReplyComposer doubtId={doubt.id} onDone={() => setReplyOpen(false)} />
      ) : (
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
      )}
    </article>
  );
}

export function BugDoubtClearingCard({ bugId }: { bugId: string }) {
  const { currentUser } = useAuth();
  const { data: doubts = [], isLoading, isError } = useQuery({
    queryKey: ["bug-doubts", bugId],
    queryFn: () => bugDoubtService.list(bugId),
    enabled: !!bugId,
    staleTime: 15_000,
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

  if (isError || doubts.length === 0) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/40 via-transparent to-indigo-50/30 dark:from-violet-950/20 dark:via-transparent dark:to-indigo-950/10" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <CircleHelp className="h-5 w-5" />
          Doubt clearing ({doubts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="relative grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4">
          {doubts.map((doubt) => (
            <DoubtThread
              key={doubt.id}
              doubt={doubt}
              currentUserId={currentUser?.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
