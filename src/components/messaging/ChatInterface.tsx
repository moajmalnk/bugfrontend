import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MessagingService } from "@/services/messagingService";
import { projectService } from "@/services/projectService";
import type { ChatGroup, ChatMessage, ChatGroupPreviewUpdate, TypingIndicator } from "@/types";
import {
  Check,
  CheckCheck,
  Clock,
  Copy,
  Download,
  Edit,
  Eye,
  FileText,
  Forward,
  Image as ImageIcon,
  Info,
  MessageCircle,
  MoreVertical,
  Pause,
  Pin,
  Play,
  Reply,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AudioWaveform } from "./AudioWaveform";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageImage } from "./ChatMessageImage";
import { ForwardMessage } from "./ForwardMessage";
import { MessageComposer, type VoiceRecordPhase } from "./MessageComposer";
import { MessageEditor } from "./MessageEditor";
import { MessageInfo } from "./MessageInfo";
import { MessageReactions } from "./MessageReactions";
import { MessageStatus } from "./MessageStatus";
import { PinnedMessages } from "./PinnedMessages";

type DocumentPreviewKind = "pdf" | "image" | "video" | "audio" | "text" | "none";

const MAX_CHAT_IMAGE_DROP_BYTES = 100 * 1024 * 1024;

function documentPreviewKind(fileName: string): DocumentPreviewKind {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase()
    : "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
  if (["txt", "csv", "log", "md", "json", "xml"].includes(ext)) return "text";
  return "none";
}

function DocumentTextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setText(null);
    setFailed(false);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("bad response");
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (failed) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8 px-4">
        Could not load a text preview. Use “Open in new tab” or Download.
      </p>
    );
  }
  if (text === null) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
    );
  }
  return (
    <pre className="text-xs sm:text-sm overflow-auto max-h-[70vh] p-4 whitespace-pre-wrap font-mono bg-muted/40 rounded-md m-3 border">
      {text}
    </pre>
  );
}

function DocumentPreviewBody({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const kind = documentPreviewKind(fileName);
  if (kind === "pdf") {
    return (
      <iframe
        title={fileName}
        src={`${url}#navpanes=0`}
        className="w-full min-h-[70vh] border-0 bg-background"
      />
    );
  }
  if (kind === "image") {
    return (
      <div className="flex justify-center p-3">
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-[70vh] object-contain rounded-md"
        />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="p-3 flex justify-center">
        <video
          src={url}
          controls
          className="max-w-full max-h-[70vh] rounded-md bg-black"
        />
      </div>
    );
  }
  if (kind === "audio") {
    return (
      <div className="p-6 flex justify-center">
        <audio src={url} controls className="w-full max-w-md" />
      </div>
    );
  }
  if (kind === "text") {
    return <DocumentTextPreview url={url} />;
  }
  return (
    <div className="text-center py-10 px-4 space-y-3">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-60" />
      <p className="text-sm text-muted-foreground">
        No inline preview for this file type. Open in a new tab or download.
      </p>
    </div>
  );
}

interface ChatInterfaceProps {
  selectedGroup: ChatGroup | null;
  onBackToChatList?: () => void;
  /** Show back arrow on compact (single-pane) layouts. */
  showBackButton?: boolean;
  /** Update sidebar preview locally — no full group list reload. */
  onChatActivity?: (update: ChatGroupPreviewUpdate) => void;
  /** Open the same member-management dialog as the sidebar (group managers only). */
  onOpenGroupMembers?: () => void;
}

function getMessagePreview(message: Pick<ChatMessage, "message_type" | "content">): string {
  switch (message.message_type) {
    case "voice":
      return "Voice message";
    case "image":
      return "Photo";
    case "video":
      return "Video";
    case "document":
      return "Document";
    case "audio":
      return "Audio";
    default:
      return message.content?.trim() || "Message";
  }
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedGroup,
  onBackToChatList,
  showBackButton = false,
  onChatActivity,
  onOpenGroupMembers,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [voicePhase, setVoicePhase] = useState<VoiceRecordPhase>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [reviewDuration, setReviewDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [editMessage, setEditMessage] = useState<ChatMessage | null>(null);
  const [messageInfo, setMessageInfo] = useState<ChatMessage | null>(null);
  const [messagePendingDelete, setMessagePendingDelete] =
    useState<ChatMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<ChatGroup[]>([]);
  const [pinnedMessagesKey, setPinnedMessagesKey] = useState(0);
  const [documentPreview, setDocumentPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const voiceStopIntentRef = useRef<"review" | "cancel" | "send">("send");
  const pendingVoiceBlobRef = useRef<Blob | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sidebarBumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageDropDepthRef = useRef(0);
  const chatDropZoneRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === "admin";
  const [isImageDropActive, setIsImageDropActive] = useState(false);
  const [isImageDropUploading, setIsImageDropUploading] = useState(false);

  const updateSidebarPreview = (message: ChatMessage) => {
    if (!selectedGroup || !onChatActivity) return;
    onChatActivity({
      groupId: selectedGroup.id,
      preview: getMessagePreview(message),
      senderId: String(message.sender_id),
      senderName: message.sender_name || "You",
      lastMessageAt: message.created_at,
    });
  };

  const scheduleSidebarPreview = (message: ChatMessage) => {
    if (!onChatActivity) return;
    if (sidebarBumpTimerRef.current) clearTimeout(sidebarBumpTimerRef.current);
    sidebarBumpTimerRef.current = setTimeout(() => {
      updateSidebarPreview(message);
      sidebarBumpTimerRef.current = null;
    }, 400);
  };

  const displaySenderLabel = (name?: string | null) => {
    if (!name || name === "0") return "Member";
    return name;
  };

  const messageDayKey = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const formatMessageDay = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = messageDayKey(new Date().toISOString());
    const yesterday = messageDayKey(
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    );
    const key = messageDayKey(timestamp);

    if (key === today) return "Today";
    if (key === yesterday) return "Yesterday";

    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const shouldShowDateSeparator = (message: ChatMessage, index: number) => {
    if (index === 0) return true;
    return messageDayKey(message.created_at) !== messageDayKey(messages[index - 1].created_at);
  };

  const isBugBotIdentity = (value?: string | null) => {
    if (!value) return false;
    const normalized = String(value).trim().toLowerCase();
    return normalized === "bugbot" || normalized.includes("bugbot");
  };

  const isBugBotMessage = (message: ChatMessage) =>
    isBugBotIdentity(message.sender_name) ||
    isBugBotIdentity(message.sender_email) ||
    isBugBotIdentity(message.sender_id);

  const normalizeDeliveryStatus = (
    s: ChatMessage["delivery_status"]
  ): "sent" | "delivered" | "read" | "failed" => {
    if (s === "delivered" || s === "read" || s === "failed" || s === "sent")
      return s;
    return "sent";
  };

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
      startPolling();
      loadAvailableGroups();
    } else {
      setMessages([]);
      setCurrentPage(1);
      setHasMoreMessages(true);
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
    }

    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
      if (sidebarBumpTimerRef.current) {
        clearTimeout(sidebarBumpTimerRef.current);
        sidebarBumpTimerRef.current = null;
      }
    };
  }, [selectedGroup]);

  const loadAvailableGroups = async () => {
    try {
      // Load all projects and their groups for forwarding
      const allProjects = await projectService.getProjects();
      let allGroups: ChatGroup[] = [];
      for (const project of allProjects) {
        const groups = await MessagingService.getGroupsByProject(project.id);
        allGroups = allGroups.concat(groups);
      }
      setAvailableGroups(allGroups.filter(g => g.id !== selectedGroup?.id));
    } catch (error) {
      console.error("Error loading available groups:", error);
    }
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [newMessage]);

  const loadMessages = async (page: number = 1, append: boolean = false) => {
    if (!selectedGroup) return;

    if (append) {
      setIsLoadingMore(true);
    }
    try {
      const response = await MessagingService.getMessages(
        selectedGroup.id,
        page
      );

      const visibleMessages = response.messages.filter((m) => !isBugBotMessage(m));

      if (append) {
        shouldAutoScrollRef.current = false;
        setMessages((prev) => [...visibleMessages, ...prev]);
      } else {
        shouldAutoScrollRef.current = true;
        setMessages(visibleMessages);
      }

      setHasMoreMessages(response.pagination.page < response.pagination.pages);
      setCurrentPage(response.pagination.page);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      if (append) {
        setIsLoadingMore(false);
      }
    }
  };

  const startPolling = () => {
    if (!selectedGroup) return;

    pollingCleanupRef.current = MessagingService.startMessagePolling(
      selectedGroup.id,
      (newMessage) => {
        setMessages((prev) => {
          if (isBugBotMessage(newMessage)) {
            return prev;
          }

          // Check if message already exists
          if (prev.find((m) => m.id === newMessage.id)) {
            return prev;
          }
          shouldAutoScrollRef.current = isNearBottom();
          scheduleSidebarPreview(newMessage);
          return [...prev, newMessage];
        });
      },
      (typingUsers) => {
        setTypingUsers(typingUsers);
      },
      2500,
      (polledMessages) => {
        const ownId = String(currentUser?.id ?? "");
        if (!ownId) return;

        setMessages((prev) => {
          const updates = new Map(
            polledMessages
              .filter((message) => String(message.sender_id) === ownId)
              .map((message) => [message.id, message])
          );

          if (updates.size === 0) return prev;

          return prev.map((message) => {
            const updated = updates.get(message.id);
            if (!updated) return message;

            return {
              ...message,
              delivery_status: updated.delivery_status ?? message.delivery_status,
              read_status: updated.read_status ?? message.read_status,
              voice_played_count:
                updated.voice_played_count ?? message.voice_played_count,
            };
          });
        });
      }
    );
  };

  const isNearBottom = () => {
    const el = scrollAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    const replySnapshot = replyToMessage;
    const now = new Date().toISOString();
    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      group_id: selectedGroup.id,
      sender_id: String(currentUser?.id ?? ""),
      message_type: replySnapshot ? "reply" : "text",
      content: messageContent,
      reply_to_message_id: replySnapshot?.id,
      reply_content: replySnapshot?.content,
      reply_type: replySnapshot?.message_type,
      reply_sender_name: replySnapshot?.sender_name,
      is_deleted: false,
      is_pinned: false,
      delivery_status: "sent",
      created_at: now,
      updated_at: now,
      sender_name:
        (currentUser as any)?.username ||
        (currentUser as any)?.name ||
        currentUser?.email ||
        "You",
      sender_email: currentUser?.email || "",
      sender_role: currentUser?.role || "",
      reactions: [],
    };

    setNewMessage("");
    setIsTyping(false);
    setReplyToMessage(null);
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    updateSidebarPreview(optimisticMessage);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const messageData: any = {
        group_id: selectedGroup.id,
        message_type: "text",
        content: messageContent,
      };

      if (replySnapshot) {
        messageData.message_type = "reply";
        messageData.reply_to_message_id = replySnapshot?.id;
      }

      const sentMessage = await MessagingService.sendMessage(messageData);
      shouldAutoScrollRef.current = true;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticId ? sentMessage : message
        )
      );
      updateSidebarPreview(sentMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setNewMessage(messageContent);
      setReplyToMessage(replySnapshot);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (!isTyping) {
      setIsTyping(true);
      MessagingService.updateTyping(selectedGroup!.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      MessagingService.updateTyping(selectedGroup!.id, false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const resetVoiceRecording = () => {
    clearRecordingTimer();
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    pendingVoiceBlobRef.current = null;
    recordingStartedAtRef.current = 0;
    setRecordingDuration(0);
    setReviewDuration(0);
    setVoicePhase("idle");
  };

  const startRecording = async () => {
    setIsPlaying(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        clearRecordingTimer();

        const intent = voiceStopIntentRef.current;
        const blob = new Blob(audioChunks, { type: mimeType });
        audioChunksRef.current = audioChunks;

        if (intent === "cancel" || blob.size === 0) {
          resetVoiceRecording();
          return;
        }

        if (intent === "review") {
          pendingVoiceBlobRef.current = blob;
          const elapsed = Math.max(
            1,
            Math.round((Date.now() - recordingStartedAtRef.current) / 1000)
          );
          setReviewDuration(elapsed);
          setRecordingDuration(0);
          setVoicePhase("review");
          mediaRecorderRef.current = null;
          return;
        }

        void sendVoiceMessage(blob).finally(() => resetVoiceRecording());
      };

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = audioChunks;
      recordingStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();
      voiceStopIntentRef.current = "send";
      mediaRecorder.start(250);
      setVoicePhase("recording");
      setRecordingDuration(0);

      clearRecordingTimer();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(
          Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
        );
      }, 250);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          voiceStopIntentRef.current = "review";
          mediaRecorderRef.current.stop();
        }
      }, 120000);
    } catch (error) {
      console.error("Error starting recording:", error);
      resetVoiceRecording();
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      voiceStopIntentRef.current = "review";
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      voiceStopIntentRef.current = "cancel";
      mediaRecorderRef.current.stop();
      return;
    }
    resetVoiceRecording();
  };

  const sendReviewedVoice = async () => {
    const blob = pendingVoiceBlobRef.current;
    if (!blob) {
      resetVoiceRecording();
      return;
    }
    setVoicePhase("idle");
    pendingVoiceBlobRef.current = null;
    try {
      await sendVoiceMessage(blob);
    } finally {
      resetVoiceRecording();
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedGroup) return;

    try {
      // Convert Blob to File
      const audioFile = new File([audioBlob], "voice-message.webm", {
        type: "audio/webm",
      });
      const { file_url, duration } = await MessagingService.uploadVoiceMessage(
        audioFile
      );

      const messageData = {
        group_id: selectedGroup.id,
        message_type: "voice" as const,
        voice_file_path: file_url,
        voice_duration: duration,
      };

      const sentMessage = await MessagingService.sendMessage(messageData);
      shouldAutoScrollRef.current = true;
      setMessages((prev) => [...prev, sentMessage]);
      updateSidebarPreview(sentMessage);
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive",
      });
    }
  };

  const playVoiceMessage = async (message: ChatMessage) => {
    if (!message.voice_file_path) return;

    if (isPlaying === message.id) {
      setIsPlaying(null);
      return;
    }

    setIsPlaying(message.id);

    if (String(message.sender_id) !== String(currentUser?.id ?? "")) {
      try {
        await MessagingService.markVoicePlayed(message.id);
      } catch (error) {
        console.error("Failed to mark voice as played:", error);
      }
    }
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    try {
      await MessagingService.deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      setMessagePendingDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteMessage = async () => {
    if (!messagePendingDelete) return;
    setIsDeletingMessage(true);
    try {
      await handleDeleteMessage(messagePendingDelete);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handlePinMessage = async (message: ChatMessage) => {
    try {
      await MessagingService.pinMessage(message.id);
      // Trigger pinned messages refresh
      setPinnedMessagesKey(prev => prev + 1);
    } catch (error) {
      console.error("Error pinning message:", error);
      toast({
        title: "Error",
        description: "Failed to pin message",
        variant: "destructive",
      });
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Success",
      description: "Message copied to clipboard",
    });
  };

  const canDeleteMessage = (message: ChatMessage) => {
    if (isAdmin) return true;
    if (String(message.sender_id) !== String(currentUser?.id ?? ""))
      return false;

    const messageTime = new Date(message.created_at).getTime();
    const currentTime = new Date().getTime();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    return currentTime - messageTime <= oneHour;
  };

  const formatMentions = (content: string) => {
    return content.replace(
      /@(\w+)/g,
      '<span class="text-primary font-medium">@$1</span>'
    );
  };

  const getReadReceipts = (message: ChatMessage) => {
    if (!showReadReceipts || !message.read_status) return null;

    const readCount = message.read_status.length;
    const totalMembers = selectedGroup?.member_count || 0;

    if (readCount === 0)
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    if (readCount === totalMembers - 1)
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    return <Check className="h-3 w-3 text-muted-foreground" />;
  };

  const handleMessageClick = (messageId: string) => {
    // Scroll to the specific message
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => {
        messageElement.classList.remove("ring-2", "ring-primary/50");
      }, 2000);
    }
  };

  const handleStarMessage = async (messageId: string, isStarred: boolean) => {
    try {
      if (isStarred) {
        await MessagingService.unstarMessage(messageId);
        toast({
          title: "Message unstarred",
          description: "Removed from starred messages",
        });
      } else {
        await MessagingService.starMessage(messageId);
        toast({
          title: "Message starred",
          description: "Added to starred messages",
        });
      }
      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_starred: !isStarred } : m
        )
      );
    } catch (error) {
      console.error("Error starring message:", error);
      toast({
        title: "Error",
        description: "Failed to star message",
        variant: "destructive",
      });
    }
  };

  const handleMediaUploadSuccess = async (mediaData: any) => {
    try {
      const sentMessage = MessagingService.mergeMediaMessage(
        await MessagingService.sendMessage(mediaData),
        mediaData
      );
      shouldAutoScrollRef.current = true;
      setMessages((prev) => [...prev, sentMessage]);
      updateSidebarPreview(sentMessage);
    } catch (error) {
      console.error("Error sending media:", error);
      toast({
        title: "Error",
        description: "Failed to send media",
        variant: "destructive",
      });
    }
  };

  const sendImageFiles = useCallback(async (files: File[]) => {
    if (!selectedGroup || isImageDropUploading) return;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({
        title: "No images to send",
        description:
          "Drop or paste image files (for example PNG or JPEG) in the chat.",
        variant: "destructive",
      });
      return;
    }

    const caption = newMessage.trim() || undefined;
    setIsImageDropUploading(true);
    try {
      let sentAny = false;
      let lastSentMessage: ChatMessage | null = null;
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (file.size > MAX_CHAT_IMAGE_DROP_BYTES) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 100MB limit.`,
            variant: "destructive",
          });
          continue;
        }
        const upload = await MessagingService.uploadMedia(file, selectedGroup.id);
        const messageData = {
          group_id: selectedGroup.id,
          message_type: "image" as const,
          content: i === 0 ? caption : undefined,
          media_type: "image" as const,
          media_file_path: upload.file_url,
          media_file_name: file.name,
          media_file_size: file.size,
          media_thumbnail: upload.thumbnail_url,
        };
        const sentMessage = MessagingService.mergeMediaMessage(
          await MessagingService.sendMessage(messageData),
          messageData
        );
        shouldAutoScrollRef.current = true;
        setMessages((prev) => [...prev, sentMessage]);
        lastSentMessage = sentMessage;
        sentAny = true;
      }
      if (caption && sentAny) {
        setNewMessage("");
        setIsTyping(false);
        MessagingService.updateTyping(selectedGroup.id, false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      if (sentAny && lastSentMessage) {
        updateSidebarPreview(lastSentMessage);
        toast({
          title: imageFiles.length > 1 ? "Images sent" : "Image sent",
          description:
            imageFiles.length > 1
              ? `${imageFiles.length} images uploaded.`
              : undefined,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload failed",
        description:
          err instanceof Error ? err.message : "Could not send image(s).",
        variant: "destructive",
      });
    } finally {
      setIsImageDropUploading(false);
    }
  }, [isImageDropUploading, newMessage, selectedGroup, toast]);

  const handleChatImageDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("Files")) return;
    imageDropDepthRef.current += 1;
    setIsImageDropActive(true);
  };

  const handleChatImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageDropDepthRef.current = Math.max(0, imageDropDepthRef.current - 1);
    if (imageDropDepthRef.current === 0) setIsImageDropActive(false);
  };

  const handleChatImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleChatImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageDropDepthRef.current = 0;
    setIsImageDropActive(false);
    await sendImageFiles(Array.from(e.dataTransfer.files));
  };

  const handleChatImagePaste = (e: React.ClipboardEvent) => {
    const files: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length === 0) return;
    e.preventDefault();
    void sendImageFiles(files);
  };

  useEffect(() => {
    if (!selectedGroup) return;

    const handleDocumentPaste = (e: ClipboardEvent) => {
      if (isImageDropUploading) return;
      if (textareaRef.current && e.target === textareaRef.current) return;

      const target = e.target as HTMLElement | null;
      const zone = chatDropZoneRef.current;
      if (zone && target && !zone.contains(target)) return;

      if (target) {
        const foreignField = target.closest(
          'input, textarea, [contenteditable="true"]'
        );
        if (foreignField && foreignField !== textareaRef.current) return;
      }

      const files: File[] = [];
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      void sendImageFiles(files);
    };

    document.addEventListener("paste", handleDocumentPaste);
    return () => document.removeEventListener("paste", handleDocumentPaste);
  }, [selectedGroup, isImageDropUploading, sendImageFiles]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const openDocumentPreview = (message: ChatMessage) => {
    const url = MessagingService.resolveMediaUrl(message.media_file_path);
    if (!url) {
      toast({
        title: "Cannot preview",
        description: "This attachment has no file URL.",
        variant: "destructive",
      });
      return;
    }
    setDocumentPreview({
      url,
      fileName: message.media_file_name || "Attachment",
    });
  };

  const downloadDocumentPreview = () => {
    if (!documentPreview) return;
    const a = document.createElement("a");
    a.href = documentPreview.url;
    a.download = documentPreview.fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!selectedGroup) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-0">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4" />
          <p>Select a chat group to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background hide-scrollbar">
      <ChatHeader
        selectedGroup={selectedGroup}
        typingUsers={typingUsers}
        onBackToChatList={showBackButton ? onBackToChatList : undefined}
        onOpenGroupMembers={onOpenGroupMembers}
        onMessageClick={(message) => handleMessageClick(message.id)}
      />

      {/* Pinned Messages - Fixed below header */}
      <div className="flex-shrink-0">
        <PinnedMessages
          key={pinnedMessagesKey}
          groupId={selectedGroup.id}
          onMessageClick={handleMessageClick}
        />
      </div>

      <div
        ref={chatDropZoneRef}
        data-chat-drop-zone
        tabIndex={-1}
        className="relative flex flex-1 flex-col min-h-0 overflow-hidden outline-none"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest(
              'textarea, input, button, a, [role="button"], [data-radix-collection-item]'
            )
          ) {
            return;
          }
          chatDropZoneRef.current?.focus({ preventScroll: true });
        }}
        onDragEnter={handleChatImageDragEnter}
        onDragLeave={handleChatImageDragLeave}
        onDragOver={handleChatImageDragOver}
        onDrop={handleChatImageDrop}
        onPaste={handleChatImagePaste}
      >
        {isImageDropActive && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-500/15">
            <span className="rounded-xl bg-white/95 dark:bg-gray-900/95 border border-emerald-200/60 dark:border-emerald-800/60 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-lg">
              Drop image to send
            </span>
          </div>
        )}

      {/* Messages Area - Scrollable */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4 py-2 space-y-0.5 bg-gradient-to-b from-gray-50/80 to-blue-50/30 dark:from-gray-950/50 dark:to-blue-950/20 hide-scrollbar"
      >
        {hasMoreMessages && (
          <div className="flex justify-center mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMessages(currentPage + 1, true)}
              disabled={isLoadingMore}
              className="text-xs px-3 py-1.5 h-8 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              Load More Messages
            </Button>
          </div>
        )}
        {messages.map((message, index) => {
          const isOwnMessage =
            String(message.sender_id) === String(currentUser?.id ?? "");
          const isDeleted = Boolean(message.is_deleted);
          const isPinned = Boolean(message.is_pinned);
          const isEdited = Boolean(message.is_edited);
          const replyToId = message.reply_to_message_id;
          const hasReply =
            replyToId != null && String(replyToId).trim() !== "";
          return (
            <React.Fragment key={message.id}>
              {shouldShowDateSeparator(message, index) && (
                <div className="sticky top-2 z-10 flex justify-center py-2 pointer-events-none">
                  <span className="rounded-lg bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 px-3 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 shadow-sm">
                    {formatMessageDay(message.created_at)}
                  </span>
                </div>
              )}
            <div
              id={`message-${message.id}`}
              className={`flex ${
                isOwnMessage ? "justify-end" : "justify-start"
              } w-full px-1 group transition-all`}
            >
              <div
                className={`flex items-end max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ${
                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {!isOwnMessage && (
                  <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 mr-2 flex-shrink-0">
                    <AvatarFallback className="text-xs font-semibold">
                      {displaySenderLabel(message.sender_name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`space-y-0 ${
                    isOwnMessage ? "mr-2 items-end" : "ml-2 items-start"
                  } flex flex-col w-full min-w-0`}
                >
                  {!isOwnMessage && (
                    <div className="text-xs text-muted-foreground font-medium px-1 mb-0.5">
                      {displaySenderLabel(message.sender_name)}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 shadow-sm transition-colors break-all whitespace-pre-wrap max-w-full overflow-hidden border ${
                      isOwnMessage
                        ? "bg-gradient-to-br from-blue-600 to-emerald-600 text-white border-blue-500/30"
                        : "bg-white/90 dark:bg-gray-800/90 text-foreground border-gray-200/60 dark:border-gray-700/60"
                    } ${
                      isDeleted
                        ? "opacity-60 italic"
                        : "hover:ring-1 hover:ring-primary/20"
                    } ${isPinned ? "ring-2 ring-yellow-400/50" : ""}`}
                  >
                    {isDeleted ? (
                      <div className="text-muted-foreground italic">
                        This message was deleted
                      </div>
                    ) : (
                      <>
                        {/* Pinned indicator */}
                        {isPinned && (
                          <div className="flex items-center gap-1 mb-2 text-xs text-yellow-600 dark:text-yellow-400">
                            <Pin className="h-3 w-3" />
                            <span>Pinned by {message.pinned_by_name}</span>
                          </div>
                        )}

                        {/* Reply to message */}
                        {hasReply && (
                          <div
                            className={cn(
                              "mb-2 p-2 rounded text-xs border-l-4",
                              isOwnMessage
                                ? "bg-white/15 border-white/50"
                                : "bg-background/60 border-primary/30"
                            )}
                          >
                            <div className="font-medium">
                              Replying to {displaySenderLabel(message.reply_sender_name)}
                            </div>
                            <div
                              className={cn(
                                isOwnMessage
                                  ? "text-white/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              {message.reply_type === "voice"
                                ? "🎤 Voice message"
                                : message.reply_content}
                            </div>
                          </div>
                        )}

                        {/* Message content */}
                        {message.message_type === "voice" ? (
                          <AudioWaveform
                            audioUrl={MessagingService.resolveVoiceUrl(message.voice_file_path)}
                            duration={message.voice_duration}
                            isPlaying={isPlaying === message.id}
                            onPlayPause={() => playVoiceMessage(message)}
                          />
                        ) : message.message_type === "image" ? (
                          <div>
                            <ChatMessageImage message={message} />
                            {Boolean(message.content) && (
                              <div className="mt-2 text-sm leading-relaxed">{message.content}</div>
                            )}
                          </div>
                        ) : message.message_type === "video" ? (
                          <div>
                            <video
                              src={MessagingService.resolveMediaUrl(message.media_file_path)}
                              controls
                              className="max-w-full rounded-lg max-h-80 sm:max-h-96 shadow-sm"
                            />
                            {Boolean(message.content) && (
                              <div className="mt-2 text-sm leading-relaxed">{message.content}</div>
                            )}
                          </div>
                        ) : message.message_type === "document" ? (
                          <button
                            type="button"
                            onClick={() => openDocumentPreview(message)}
                            className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg shadow-sm w-full text-left hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {message.media_file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(message.media_file_size)}
                              </p>
                            </div>
                            <span
                              className="flex-shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground"
                              title="View"
                              aria-hidden
                            >
                              <Eye className="h-4 w-4" />
                            </span>
                          </button>
                        ) : message.is_forwarded ? (
                          <div>
                            <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground italic">
                              <Forward className="h-3 w-3" />
                              <span>Forwarded</span>
                            </div>
                            <div
                              className="text-sm leading-relaxed break-all word-break-all overflow-wrap-anywhere"
                              dangerouslySetInnerHTML={{
                                __html: formatMentions(message.content || ""),
                              }}
                            />
                          </div>
                        ) : (
                          <div>
                            <div
                              className="text-sm leading-relaxed break-all word-break-all overflow-wrap-anywhere"
                              dangerouslySetInnerHTML={{
                                __html: formatMentions(message.content || ""),
                              }}
                            />
                            {isEdited && (
                              <span
                                className={cn(
                                  "text-xs italic ml-1",
                                  isOwnMessage
                                    ? "text-white/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                (edited)
                              </span>
                            )}
                          </div>
                        )}
                        {!isDeleted && (
                          <div
                            className={cn(
                              "flex items-center gap-1.5 mt-1 pt-0.5 border-t shrink-0 justify-end text-[11px]",
                              isOwnMessage
                                ? "border-white/20 text-white/80"
                                : "border-gray-200/60 dark:border-gray-700/60 text-gray-500 dark:text-gray-400"
                            )}
                          >
                            <span className="tabular-nums whitespace-nowrap">
                              {MessagingService.formatMessageTime(message.created_at)}
                            </span>
                            {isOwnMessage && (
                              <span className="[&_svg]:!text-white/80">
                                <MessageStatus
                                  status={normalizeDeliveryStatus(message.delivery_status)}
                                  receiptLabel={
                                    message.message_type === "voice" ? "played" : "read"
                                  }
                                  size="sm"
                                />
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Reactions: show chips always; add-reaction control on hover when none */}
                  {!isDeleted &&
                    (Array.isArray(message.reactions) &&
                    message.reactions.length > 0 ? (
                      <MessageReactions
                        messageId={message.id}
                        reactions={message.reactions}
                        onReactionUpdate={(updatedReactions) => {
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === message.id
                                ? { ...m, reactions: updatedReactions }
                                : m
                            )
                          );
                        }}
                      />
                    ) : (
                      <div
                        className={`w-full mt-0 flex ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <MessageReactions
                          messageId={message.id}
                          reactions={[]}
                          onReactionUpdate={(updatedReactions) => {
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === message.id
                                  ? { ...m, reactions: updatedReactions }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                    ))}

                  <div
                    className={`flex items-center gap-1 mt-0 px-1 ${
                      isOwnMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isDeleted && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyToMessage(message)}
                          className="h-6 w-6 p-0 hover:bg-primary/10 rounded-lg transition-all duration-200"
                          title="Reply"
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-primary/10 rounded-lg transition-all duration-200"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-48 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                            {/* Star */}
                            <DropdownMenuItem
                              onClick={() => handleStarMessage(message.id, message.is_starred || false)}
                              className="text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <Star className={`h-4 w-4 mr-3 ${message.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                              {message.is_starred ? "Unstar" : "Star"}
                            </DropdownMenuItem>
                            
                            {/* Forward */}
                            <DropdownMenuItem
                              onClick={() => setForwardMessage(message)}
                              className="text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <Forward className="h-4 w-4 mr-3" />
                              Forward
                            </DropdownMenuItem>
                            
                            {/* Edit - only for own text messages */}
                            {isOwnMessage &&
                              message.message_type === "text" &&
                              !isEdited && (
                              <DropdownMenuItem
                                onClick={() => setEditMessage(message)}
                                className="text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            
                            {/* Message Info - only for own messages */}
                            {isOwnMessage && (
                              <DropdownMenuItem
                                onClick={() => setMessageInfo(message)}
                                className="text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Info className="h-4 w-4 mr-3" />
                                Message Info
                              </DropdownMenuItem>
                            )}
                            
                            {message.message_type !== "voice" && (
                              <DropdownMenuItem
                                onClick={() => copyMessage(message.content || "")}
                                className="text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Copy className="h-4 w-4 mr-3" />
                                Copy
                              </DropdownMenuItem>
                            )}
                            {isAdmin && !isPinned && (
                              <DropdownMenuItem
                                onClick={() => handlePinMessage(message)}
                                className="text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Pin className="h-4 w-4 mr-3" />
                                Pin Message
                              </DropdownMenuItem>
                            )}
                            {canDeleteMessage(message) && (
                              <DropdownMenuItem
                                onClick={() => setMessagePendingDelete(message)}
                                className="text-sm px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer
        groupId={selectedGroup.id}
        value={newMessage}
        voicePhase={voicePhase}
        recordingDuration={recordingDuration}
        reviewDuration={reviewDuration}
        isImageDropUploading={isImageDropUploading}
        replyToMessage={replyToMessage}
        textareaRef={textareaRef}
        displaySenderLabel={displaySenderLabel}
        onChange={handleTyping}
        onKeyPress={handleKeyPress}
        onSend={handleSendMessage}
        onClearReply={() => setReplyToMessage(null)}
        onEmojiSelect={(emoji) => {
          setNewMessage((prev) => prev + emoji);
          textareaRef.current?.focus();
        }}
        onUploadSuccess={handleMediaUploadSuccess}
        onVoiceStart={startRecording}
        onVoicePause={pauseRecording}
        onVoiceCancel={cancelVoiceRecording}
        onVoiceSend={sendReviewedVoice}
        onPaste={handleChatImagePaste}
      />
      </div>

      {/* Forward Message Dialog */}
      {forwardMessage && (
        <ForwardMessage
          message={forwardMessage}
          availableGroups={availableGroups}
          onForwardSuccess={() => {
            setForwardMessage(null);
          }}
        />
      )}

      {/* Edit Message Dialog */}
      {editMessage && (
        <MessageEditor
          message={editMessage}
          open={!!editMessage}
          hideTrigger
          onOpenChange={(open) => {
            if (!open) setEditMessage(null);
          }}
          onEditSuccess={(updatedContent) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === editMessage.id
                  ? { ...m, content: updatedContent, is_edited: true, edited_at: new Date().toISOString() }
                  : m
              )
            );
            setEditMessage(null);
          }}
        />
      )}

      {/* Message Info Dialog */}
      {messageInfo && (
        <MessageInfo
          message={messageInfo}
          groupMemberCount={selectedGroup.member_count}
          open={!!messageInfo}
          hideTrigger
          onOpenChange={(open) => {
            if (!open) setMessageInfo(null);
          }}
        />
      )}

      <Dialog
        open={!!documentPreview}
        onOpenChange={(open) => {
          if (!open) setDocumentPreview(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-4xl w-[calc(100vw-1.5rem)] sm:max-w-4xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden"
        >
          {documentPreview ? (
            <>
              <DialogHeader className="relative z-10 flex flex-row items-center gap-2 space-y-0 border-b bg-background px-4 py-3 pr-3 text-left shrink-0">
                <DialogTitle className="text-base truncate leading-tight flex-1 min-w-0">
                  {documentPreview.fileName}
                </DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-md text-foreground hover:bg-muted"
                  aria-label="Close preview"
                  onClick={() => setDocumentPreview(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogHeader>
              <div className="flex-1 min-h-[200px] overflow-auto bg-muted/20">
                <DocumentPreviewBody
                  url={documentPreview.url}
                  fileName={documentPreview.fileName}
                />
              </div>
              <div className="px-4 py-3 border-t shrink-0 flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(documentPreview.url, "_blank", "noopener,noreferrer")
                  }
                >
                  Open in new tab
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadDocumentPreview()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!messagePendingDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingMessage) {
            setMessagePendingDelete(null);
          }
        }}
      >
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The message will be removed for everyone in
              this chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMessage}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeletingMessage}
              onClick={() => void confirmDeleteMessage()}
            >
              {isDeletingMessage ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
