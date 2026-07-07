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
    <div className="flex-shrink-0 z-20 bg-[#202c33] border-t border-[#2a3942]">
      {replyToMessage && (
        <div className="px-3 sm:px-4 py-2 bg-[#2a3942] border-b border-[#3b4a54] flex items-center justify-between">
          <div className="text-sm flex-1 min-w-0 border-l-4 border-[#00a884] pl-3">
            <span className="font-medium text-[#00a884]">
              Replying to {displaySenderLabel(replyToMessage.sender_name)}
            </span>
            <div className="text-[#8696a0] text-xs truncate">
              {replyToMessage.message_type === "voice"
                ? "Voice message"
                : replyToMessage.content}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearReply}
            className="h-8 w-8 text-[#8696a0] hover:bg-[#3b4a54] rounded-lg transition-all duration-200"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
        {voicePhase === "recording" && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#2a3942] border border-[#3b4a54] px-3 py-2.5 sm:px-4">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="min-w-[3rem] text-sm font-medium tabular-nums text-[#e9edef]">
              {formatDuration(recordingDuration)}
            </span>
            <div className="flex flex-1 items-center gap-0.5 overflow-hidden px-1">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="w-0.5 shrink-0 rounded-full bg-[#00a884]/70 animate-pulse"
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
              className="h-9 w-9 shrink-0 rounded-xl text-[#8696a0] hover:bg-[#3b4a54] hover:text-red-400"
              title="Cancel recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={onVoicePause}
              className="h-9 w-9 shrink-0 rounded-xl bg-[#3b4a54] text-[#e9edef] hover:bg-[#4a5c66]"
              title="Pause recording"
            >
              <Pause className="h-4 w-4" />
            </Button>
          </div>
        )}

        {voicePhase === "review" && (
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-[#2a3942] border border-[#00a884]/40 px-3 py-2.5 sm:px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884]/15">
              <Mic className="h-4 w-4 text-[#00a884]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#e9edef]">Voice message</p>
              <p className="text-xs text-[#8696a0] tabular-nums">
                {formatDuration(reviewDuration)} · Ready to send
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onVoiceCancel}
              className="h-9 w-9 shrink-0 rounded-xl text-[#8696a0] hover:bg-[#3b4a54] hover:text-red-400"
              title="Delete recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={onVoiceSend}
              className="h-9 w-9 shrink-0 rounded-xl bg-[#00a884] text-white hover:bg-[#06cf9c]"
              title="Send voice message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {voicePhase === "idle" && (
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0 relative rounded-2xl">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyPress={onKeyPress}
                onPaste={onPaste}
                placeholder="Type a message"
                disabled={isImageDropUploading}
                className="min-h-[40px] sm:min-h-[44px] max-h-[120px] resize-none rounded-2xl px-3 sm:px-4 py-2 shadow-sm border border-[#3b4a54] bg-[#2a3942] text-[#e9edef] placeholder:text-[#8696a0] focus:bg-[#2a3942] focus:border-[#00a884] transition-colors text-sm disabled:opacity-60"
                rows={1}
              />
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <EmojiPicker onEmojiSelect={onEmojiSelect} size="md" />
              <MediaUploader groupId={groupId} onUploadSuccess={onUploadSuccess} />
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoiceStart}
                disabled={isVoiceActive}
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex-shrink-0 transition-all duration-200 rounded-xl text-[#8696a0] hover:bg-[#3b4a54] hover:text-[#aebac1]"
                title="Record voice message"
              >
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                onClick={onSend}
                disabled={!value.trim()}
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 bg-[#00a884] text-white hover:bg-[#06cf9c] flex-shrink-0 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 rounded-xl"
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
