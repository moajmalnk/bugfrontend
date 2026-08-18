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
import { extractApiErrorMessage } from "@/lib/apiError";
import { formatDetailedDate } from "@/lib/dateUtils";
import { ENV } from "@/lib/env";
import {
  bugDoubtService,
  type BugDoubt,
  type BugDoubtAttachment,
} from "@/services/bugDoubtService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Loader2, MessageCircleReply, User } from "lucide-react";
import { FormEvent, useState } from "react";

const BODY_MAX = 2000;

function audioUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${ENV.API_URL}/audio.php?path=${encodeURIComponent(path)}`;
}

function VoiceList({
  attachments,
  prefix,
}: {
  attachments: BugDoubtAttachment[];
  prefix: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  if (!attachments?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {attachments.map((att) => {
        const id = `${prefix}-${att.id}`;
        return (
          <WhatsAppVoiceMessage
            key={att.id}
            id={id}
            audioSource={audioUrl(att.file_path)}
            duration={att.duration || 0}
            fileName={att.file_name || "voice-note.webm"}
            accent="received"
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
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
      <WhatsAppVoiceRecorder
        onComplete={(note) => setVoice(note)}
        disabled={mutation.isPending}
        maxDuration={300}
      />
      {voice && (
        <WhatsAppVoiceMessage
          id={`reply-preview-${doubtId}`}
          audioSource={voice.blob}
          duration={voice.duration}
          waveform={voice.waveform}
          accent="sent"
          onRemove={() => setVoice(null)}
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

function DoubtThread({ doubt }: { doubt: BugDoubt }) {
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-4">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300 shrink-0">
          <User className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {doubt.asked_by_name || "Unknown"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDetailedDate(doubt.created_at)}
          </p>
        </div>
      </div>
      {doubt.body.trim() ? (
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {doubt.body}
        </p>
      ) : null}
      <VoiceList attachments={doubt.attachments || []} prefix={`doubt-${doubt.id}`} />

      {(doubt.replies || []).length > 0 && (
        <div className="flex flex-col gap-3 border-l-2 border-violet-200 dark:border-violet-800 pl-3">
          {doubt.replies.map((reply) => (
            <div key={reply.id} className="flex flex-col gap-2 rounded-xl bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {reply.user_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDetailedDate(reply.created_at)}
                </p>
              </div>
              {reply.body.trim() ? (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {reply.body}
                </p>
              ) : null}
              <VoiceList
                attachments={reply.attachments || []}
                prefix={`reply-${reply.id}`}
              />
            </div>
          ))}
        </div>
      )}

      {replyOpen ? (
        <ReplyComposer doubtId={doubt.id} onDone={() => setReplyOpen(false)} />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="rounded-xl self-start"
          onClick={() => setReplyOpen(true)}
        >
          <MessageCircleReply className="mr-2 h-4 w-4" />
          Reply
        </Button>
      )}
    </article>
  );
}

export function BugDoubtClearingCard({ bugId }: { bugId: string }) {
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
    <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/40 via-transparent to-indigo-50/30 dark:from-violet-950/20 dark:via-transparent dark:to-indigo-950/10" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <CircleHelp className="h-5 w-5" />
          Doubt clearing ({doubts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-4">
        {doubts.map((doubt) => (
          <DoubtThread key={doubt.id} doubt={doubt} />
        ))}
      </CardContent>
    </Card>
  );
}
