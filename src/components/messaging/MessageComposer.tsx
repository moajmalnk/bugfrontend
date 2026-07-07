import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { Mic, Pause, Send, Trash2, X } from "lucide-react";
import { memo } from "react";
import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { EmojiPicker } from "./EmojiPicker";
import { MediaUploader } from "./MediaUploader";

export type VoiceRecordPhase = "idle" | "recording" | "review";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface MessageComposerProps {
  groupId: string;
  value: string;
  voicePhase: VoiceRecordPhase;
  recordingDuration: number;
  reviewDuration: number;
  isImageDropUploading: boolean;
  replyToMessage: ChatMessage | null;
  textareaRef: RefObject<HTMLTextAreaElement>;
  displaySenderLabel: (name?: string | null) => string;
  onChange: (value: string) => void;
  onKeyPress: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onClearReply: () => void;
  onEmojiSelect: (emoji: string) => void;
  onUploadSuccess: (mediaData: any) => void;
  onVoiceStart: () => void;
  onVoicePause: () => void;
  onVoiceCancel: () => void;
  onVoiceSend: () => void;
  onPaste: (event: ClipboardEvent) => void;
}

export const MessageComposer = memo(function MessageComposer({
  groupId,
  value,
  voicePhase,
  recordingDuration,
  reviewDuration,
  isImageDropUploading,
  replyToMessage,
  textareaRef,
  displaySenderLabel,
  onChange,
  onKeyPress,
  onSend,
  onClearReply,
  onEmojiSelect,
  onUploadSuccess,
  onVoiceStart,
  onVoicePause,
  onVoiceCancel,
  onVoiceSend,
  onPaste,
}: MessageComposerProps) {
  const isVoiceActive = voicePhase !== "idle";

  return (
    <div className="flex-shrink-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200/60 dark:border-gray-700/60">
      {replyToMessage && (
        <div className="px-3 sm:px-4 py-2 bg-blue-50/80 dark:bg-blue-950/30 border-b border-blue-200/60 dark:border-blue-800/50 flex items-center justify-between gap-2 min-w-0">
          <div className="text-sm flex-1 min-w-0 border-l-4 border-emerald-600 pl-3">
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              Replying to {displaySenderLabel(replyToMessage.sender_name)}
            </span>
            <div className="text-gray-500 dark:text-gray-400 text-xs truncate">
              {replyToMessage.message_type === "voice"
                ? "Voice message"
                : replyToMessage.content}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearReply}
            className="h-8 w-8 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
        {voicePhase === "recording" && (
          <div className="flex items-center gap-3 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 px-3 py-2.5 sm:px-4">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="min-w-[3rem] text-sm font-medium tabular-nums text-gray-900 dark:text-white">
              {formatDuration(recordingDuration)}
            </span>
            <div className="flex flex-1 items-center gap-0.5 overflow-hidden px-1">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="w-0.5 shrink-0 rounded-full bg-emerald-500/70 animate-pulse"
                  style={{
                    height: `${10 + ((i * 7 + recordingDuration) % 18)}px`,
                    animationDelay: `${(i % 5) * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onVoiceCancel}
              className="h-9 w-9 shrink-0 rounded-xl text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500"
              title="Cancel recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={onVoicePause}
              className="h-9 w-9 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Pause recording"
            >
              <Pause className="h-4 w-4" />
            </Button>
          </div>
        )}

        {voicePhase === "review" && (
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 px-3 py-2.5 sm:px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Mic className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Voice message</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {formatDuration(reviewDuration)} · Ready to send
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onVoiceCancel}
              className="h-9 w-9 shrink-0 rounded-xl text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500"
              title="Delete recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={onVoiceSend}
              className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:from-blue-700 hover:to-emerald-700"
              title="Send voice message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {voicePhase === "idle" && (
          <div className="flex items-end gap-2 min-w-0">
            <div className="flex-1 min-w-0 relative rounded-2xl">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyPress={onKeyPress}
                onPaste={onPaste}
                placeholder="Type a message"
                disabled={isImageDropUploading}
                className="min-h-[40px] sm:min-h-[44px] max-h-[120px] resize-none rounded-2xl px-3 sm:px-4 py-2 shadow-sm border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors text-sm disabled:opacity-60"
                rows={1}
              />
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <EmojiPicker onEmojiSelect={onEmojiSelect} size="md" />
              <MediaUploader groupId={groupId} onUploadSuccess={onUploadSuccess} />
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoiceStart}
                disabled={isVoiceActive}
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex-shrink-0 transition-all duration-200 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Record voice message"
              >
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                onClick={onSend}
                disabled={!value.trim()}
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:from-blue-700 hover:to-emerald-700 flex-shrink-0 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 rounded-xl"
                )}
                title="Send message"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
