import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { Mic, MicOff, Send, X } from "lucide-react";
import { memo } from "react";
import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { EmojiPicker } from "./EmojiPicker";
import { MediaUploader } from "./MediaUploader";

interface MessageComposerProps {
  groupId: string;
  value: string;
  isRecording: boolean;
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
  onMicClick: () => void;
  onMicMouseDown: () => void;
  onMicMouseUp: () => void;
  onPaste: (event: ClipboardEvent) => void;
}

export const MessageComposer = memo(function MessageComposer({
  groupId,
  value,
  isRecording,
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
  onMicClick,
  onMicMouseDown,
  onMicMouseUp,
  onPaste,
}: MessageComposerProps) {
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
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              onClick={onMicClick}
              onMouseDown={onMicMouseDown}
              onMouseUp={onMicMouseUp}
              onTouchStart={onMicMouseDown}
              onTouchEnd={onMicMouseUp}
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex-shrink-0 transition-all duration-200 rounded-xl",
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-lg"
                  : "text-[#8696a0] hover:bg-[#3b4a54] hover:text-[#aebac1]"
              )}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
            <Button
              onClick={onSend}
              disabled={!value.trim()}
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 bg-[#00a884] text-white hover:bg-[#06cf9c] flex-shrink-0 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 rounded-xl"
              title="Send message"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-red-500 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span>Recording... tap microphone to stop</span>
          </div>
        )}
      </div>
    </div>
  );
});
