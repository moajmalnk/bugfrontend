import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/users/UserAvatar";
import { cn } from "@/lib/utils";
import {
  BIRTHDAY_WISH_MAX_LENGTH,
  type BirthdayPerson,
  type BirthdayWish,
} from "@/services/userService";
import { formatDistanceToNowStrict } from "date-fns";
import { Heart, Loader2, MessageCircleHeart, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const HISTORY_OVERLAY = "birthday-wish";

const QUICK_WISHES = [
  "Happy birthday! Have a wonderful day.",
  "Wishing you a fantastic year ahead!",
  "Many happy returns of the day!",
  "Enjoy your special day — you deserve it!",
];

/** Server stores IST wall-clock time without an offset. */
function parseIstDateTime(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value.replace(" ", "T")}+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function relativeTime(value: string): string {
  const date = parseIstDateTime(value);
  if (!date) return "";
  if (Date.now() - date.getTime() < 60_000) return "just now";
  return `${formatDistanceToNowStrict(date)} ago`;
}

function wishersSummary(wishes: BirthdayWish[], total: number): string {
  const names = wishes.map((w) => (w.is_mine ? "You" : w.username));
  if (total === 0) return "";
  if (total === 1) return `${names[0]} sent a wish`;
  if (total === 2) return `${names[0]} and ${names[1]} sent wishes`;
  return `${names[0]}, ${names[1]} and ${total - 2} other${total - 2 === 1 ? "" : "s"} sent wishes`;
}

function AvatarStack({ wishes, max = 5 }: { wishes: BirthdayWish[]; max?: number }) {
  const shown = wishes.slice(0, max);
  const extra = wishes.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((wish) => (
        <UserAvatar
          key={wish.id}
          name={wish.username}
          avatar={wish.avatar}
          size="sm"
          className="ring-2 ring-background rounded-full"
        />
      ))}
      {extra > 0 ? (
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground ring-2 ring-background">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Why: wishes used to be write-only (a notification the celebrant could miss).
 * The celebrant now sees every wish with its note; teammates see who joined in.
 */
export function BirthdayWishWall({ person }: { person: BirthdayPerson }) {
  const wishes = person.wishes ?? [];
  const total = person.wish_count ?? wishes.length;

  if (!person.is_self) {
    if (total === 0) {
      return (
        <p className="text-xs text-muted-foreground">
          Be the first to wish {person.username} today.
        </p>
      );
    }
    const mine = wishes.find((w) => w.is_mine);
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <AvatarStack wishes={wishes} />
          <p className="min-w-0 text-xs text-muted-foreground">
            {wishersSummary(wishes, total)}
          </p>
        </div>
        {mine?.message ? (
          <p className="max-w-full truncate rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-foreground">
            <span className="text-muted-foreground">Your note: </span>
            {mine.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      aria-labelledby={`wishes-${person.id}`}
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-rose-500/20 bg-background/60 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`wishes-${person.id}`}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <MessageCircleHeart className="h-4 w-4 text-rose-500" />
          Wishes for you
          <span className="rounded-xl bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
            {total}
          </span>
        </h3>
        {total > 0 ? <AvatarStack wishes={wishes} max={6} /> : null}
      </div>

      {total === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 shrink-0 text-rose-400" />
          Wishes from your teammates will appear here as they arrive.
        </div>
      ) : (
        <ul className="custom-scrollbar grid max-h-72 grid-cols-12 gap-3 overflow-y-auto pr-1">
          {wishes.map((wish) => (
            <li
              key={wish.id}
              className="col-span-12 flex min-w-0 items-start gap-3 rounded-xl border border-border/60 bg-card p-3 md:col-span-6"
            >
              <UserAvatar name={wish.username} avatar={wish.avatar} size="md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {wish.username}
                  </span>
                  <time
                    className="shrink-0 text-[11px] text-muted-foreground"
                    dateTime={parseIstDateTime(wish.created_at)?.toISOString()}
                  >
                    {relativeTime(wish.created_at)}
                  </time>
                </div>
                <p className="break-words text-sm text-muted-foreground">
                  {wish.message || "Wished you a happy birthday."}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type ComposerProps = {
  person: BirthdayPerson | null;
  initialMessage?: string;
  onClose: () => void;
  onSend: (person: BirthdayPerson, message: string) => Promise<void>;
};

/** Medium (600px) composer: optional note, quick suggestions, dirty-close guard. */
export function BirthdayWishComposer({ person, initialMessage = "", onClose, onSend }: ComposerProps) {
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const open = person !== null;
  const editing = Boolean(person?.already_wished);
  const dirty = message.trim() !== initialMessage.trim();
  const remaining = BIRTHDAY_WISH_MAX_LENGTH - message.length;
  const tooLong = remaining < 0;
  const canSubmit = !sending && !tooLong && (!editing || (dirty && message.trim() !== ""));

  useEffect(() => {
    setMessage(initialMessage);
  }, [person?.id, initialMessage]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const ignoreNextPop = useRef(false);

  // Browser Back closes the composer instead of leaving the dashboard.
  useEffect(() => {
    if (!open) return;
    if (window.history.state?.overlay !== HISTORY_OVERLAY) {
      window.history.pushState({ ...(window.history.state ?? {}), overlay: HISTORY_OVERLAY }, "");
    }
    const onPop = () => {
      if (ignoreNextPop.current) {
        ignoreNextPop.current = false;
        return;
      }
      if (dirtyRef.current && !window.confirm("Discard your unsent birthday wish?")) {
        window.history.pushState({ ...(window.history.state ?? {}), overlay: HISTORY_OVERLAY }, "");
        return;
      }
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.overlay === HISTORY_OVERLAY) {
        // Our own back() also fires popstate; a remount (StrictMode) must not treat it as a close.
        ignoreNextPop.current = true;
        window.history.back();
      }
    };
  }, [open]);

  const requestClose = () => {
    if (sendingRef.current) return;
    if (dirtyRef.current && !window.confirm("Discard your unsent birthday wish?")) return;
    setMessage("");
    onClose();
  };

  const submit = async () => {
    if (!person || !canSubmit || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await onSend(person, message.trim());
      setMessage("");
      onClose();
    } catch {
      // Caller shows the error toast; keep the draft so nothing is lost.
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? requestClose() : undefined)}>
      <DialogContent className="max-w-[600px] rounded-2xl border-border/60 p-5 sm:p-6">
        {person ? (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 flex items-center gap-3">
              <UserAvatar name={person.username} avatar={person.avatar} size="lg" />
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-semibold text-foreground">
                  {editing ? "Edit your birthday note" : `Wish ${person.username} a happy birthday`}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Only {person.username} sees your note. The team sees that you wished.
                </DialogDescription>
              </div>
            </div>

            <div className="col-span-12 flex flex-wrap gap-2">
              {QUICK_WISHES.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setMessage(text)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs transition-colors",
                    message === text
                      ? "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {text}
                </button>
              ))}
            </div>

            <div className="col-span-12 flex flex-col gap-1.5">
              <label htmlFor="birthday-wish-message" className="text-sm font-medium text-foreground">
                Personal note <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="birthday-wish-message"
                dir="auto"
                value={message}
                maxLength={BIRTHDAY_WISH_MAX_LENGTH}
                rows={4}
                placeholder={`Write something nice for ${person.username}…`}
                className="resize-none rounded-xl"
                onChange={(e) => setMessage(e.target.value.slice(0, BIRTHDAY_WISH_MAX_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
                }}
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn("text-muted-foreground", tooLong && "text-destructive")}>
                  {tooLong ? "Your note is too long." : "Ctrl/⌘ + Enter to send"}
                </span>
                <span className={cn("tabular-nums text-muted-foreground", remaining < 20 && "text-amber-600 dark:text-amber-400")}>
                  {remaining}
                </span>
              </div>
            </div>

            <div className="col-span-12 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-xl" disabled={sending} onClick={requestClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-600/90"
                disabled={!canSubmit}
                onClick={() => void submit()}
              >
                {sending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                {editing ? "Update note" : "Send wish"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
