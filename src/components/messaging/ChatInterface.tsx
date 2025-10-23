import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessagingService } from "@/services/messagingService";
import { projectService } from "@/services/projectService";
import type { ChatGroup, ChatMessage, TypingIndicator } from "@/types";
import {
  Check,
  CheckCheck,
  Clock,
  Copy,
  Edit,
  FileText,
  Forward,
  Image as ImageIcon,
  Info,
  MessageCircle,
  Mic,
  MicOff,
  MoreVertical,
  Pause,
  Pin,
  Play,
  Reply,
  Send,
  Star,
  Trash2,
  Video,
  ArrowLeft,
  Search,
  Filter,
  Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { AudioWaveform } from "./AudioWaveform";
import { EmojiPicker } from "./EmojiPicker";
import { ForwardMessage } from "./ForwardMessage";
import { MediaUploader } from "./MediaUploader";
import { MessageEditor } from "./MessageEditor";
import { MessageInfo } from "./MessageInfo";
import { MessageReactions } from "./MessageReactions";
import { MessageSearch } from "./MessageSearch";
import { MessageStatus } from "./MessageStatus";
import { PinnedMessages } from "./PinnedMessages";
import { StarredMessages } from "./StarredMessages";

interface ChatInterfaceProps {
  selectedGroup: ChatGroup | null;
  onBackToChatList?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedGroup,
  onBackToChatList,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [editMessage, setEditMessage] = useState<ChatMessage | null>(null);
  const [messageInfo, setMessageInfo] = useState<ChatMessage | null>(null);
  const [availableGroups, setAvailableGroups] = useState<ChatGroup[]>([]);
  const [pinnedMessagesKey, setPinnedMessagesKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = currentUser?.role === "admin";

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
    scrollToBottom();
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

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const loadMessages = async (page: number = 1, append: boolean = false) => {
    if (!selectedGroup) return;

    setIsLoading(true);
    try {
      const response = await MessagingService.getMessages(
        selectedGroup.id,
        page
      );

      console.log("📨 Loaded messages:", response.messages);
      console.log("📨 First message sender_name:", response.messages[0]?.sender_name);

      if (append) {
        setMessages((prev) => [...response.messages, ...prev]);
      } else {
        setMessages(response.messages);
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
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    if (!selectedGroup) return;

    pollingCleanupRef.current = MessagingService.startMessagePolling(
      selectedGroup.id,
      (newMessage) => {
        console.log("🔔 New message from polling:", newMessage);
        console.log("🔔 New message sender_name:", newMessage.sender_name);
        setMessages((prev) => {
          // Check if message already exists
          if (prev.find((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      },
      (typingUsers) => {
        setTypingUsers(typingUsers);
      },
      3000
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsTyping(false);

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

      if (replyToMessage) {
        messageData.message_type = "reply";
        messageData.reply_to_message_id = replyToMessage.id;
      }

      const sentMessage = await MessagingService.sendMessage(messageData);
      setMessages((prev) => [...prev, sentMessage]);
      setReplyToMessage(null);
    } catch (error) {
      console.error("Error sending message:", error);
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

  const startRecording = async () => {
    try {
      // Request permissions immediately for faster UX
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // Higher quality
          channelCount: 1, // Mono for smaller file size
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // Optimize for voice
      });
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = audioChunks;
      mediaRecorder.start(1000); // Collect data every second for better UX
      setIsRecording(true);

      // Auto-stop after 2 minutes for better UX
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 120000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Long press to start recording immediately
  const handleMicMouseDown = () => {
    if (!isRecording) {
      const timer = setTimeout(() => {
        startRecording();
      }, 500); // Start recording after 500ms long press
      setLongPressTimer(timer);
    }
  };

  const handleMicMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMicClick = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
      setMessages((prev) => [...prev, sentMessage]);
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

    // Toggle play/pause state - AudioWaveform handles the actual playback
    if (isPlaying === message.id) {
      setIsPlaying(null);
    } else {
      // Stop any other playing audio
      setIsPlaying(message.id);
    }
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    try {
      await MessagingService.deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const handlePinMessage = async (message: ChatMessage) => {
    try {
      await MessagingService.pinMessage(message.id);
      // Trigger pinned messages refresh
      setPinnedMessagesKey(prev => prev + 1);
      toast({
        title: "Success",
        description: "Message pinned successfully",
      });
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
    if (message.sender_id !== currentUser?.id) return false;

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
      const sentMessage = await MessagingService.sendMessage(mediaData);
      setMessages((prev) => [...prev, sentMessage]);
      toast({
        title: "Success",
        description: "Media sent successfully",
      });
    } catch (error) {
      console.error("Error sending media:", error);
      toast({
        title: "Error",
        description: "Failed to send media",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
      {/* Professional Header - Fixed/Sticky */}
      <div className="relative overflow-hidden flex-shrink-0 z-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Back button for mobile */}
              {onBackToChatList && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBackToChatList}
                  className="md:hidden h-9 w-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              
              {/* Group Avatar */}
              <div className="relative">
                <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-blue-500/20 shadow-lg">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                    {selectedGroup.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>
              
              {/* Group Info */}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {selectedGroup.name}
                </CardTitle>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {typingUsers.length > 0 ? (
                    <span className="text-blue-600 dark:text-blue-400 animate-pulse font-medium">
                      {typingUsers.map((u) => u.user_name).join(", ")} typing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {selectedGroup.member_count} members
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-1">
              <MessageSearch
                groupId={selectedGroup.id}
                onMessageClick={handleMessageClick}
              />
              <StarredMessages
                groupId={selectedGroup.id}
                onMessageClick={handleMessageClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Messages - Fixed below header */}
      <div className="flex-shrink-0">
        <PinnedMessages
          key={pinnedMessagesKey}
          groupId={selectedGroup.id}
          onMessageClick={handleMessageClick}
        />
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4 py-2 space-y-1 bg-[#efeae2] dark:bg-[#0b141a] hide-scrollbar">
        {hasMoreMessages && (
          <div className="flex justify-center mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMessages(currentPage + 1, true)}
              disabled={isLoading}
              className="text-xs"
            >
              Load More Messages
            </Button>
          </div>
        )}
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUser?.id;
          const isDeleted = message.is_deleted;
          return (
            <div
              key={message.id}
              id={`message-${message.id}`}
              className={`flex ${
                isOwnMessage ? "justify-end" : "justify-start"
              } w-full px-1 group transition-all`}
            >
              <div
                className={`flex items-end max-w-[90%] xs:max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ${
                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {!isOwnMessage && (
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mr-2 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {message.sender_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`space-y-1 ${
                    isOwnMessage ? "mr-2 items-end" : "ml-2 items-start"
                  } flex flex-col w-full`}
                >
                  {!isOwnMessage && (
                    <div className="text-xs text-muted-foreground font-medium px-1">
                      {message.sender_name}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 shadow-sm transition-colors break-all whitespace-pre-wrap max-w-full overflow-hidden ${
                      isOwnMessage
                        ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-foreground"
                        : "bg-white dark:bg-[#202c33] text-foreground"
                    } ${
                      isDeleted
                        ? "opacity-60 italic"
                        : "hover:ring-1 hover:ring-primary/20"
                    } ${message.is_pinned ? "ring-2 ring-yellow-400/50" : ""}`}
                  >
                    {isDeleted ? (
                      <div className="text-muted-foreground italic">
                        This message was deleted
                      </div>
                    ) : (
                      <>
                        {/* Pinned indicator */}
                        {message.is_pinned && (
                          <div className="flex items-center gap-1 mb-2 text-xs text-yellow-600 dark:text-yellow-400">
                            <Pin className="h-3 w-3" />
                            <span>Pinned by {message.pinned_by_name}</span>
                          </div>
                        )}

                        {/* Reply to message */}
                        {message.reply_to_message_id && (
                          <div className="mb-2 p-2 bg-background/60 rounded text-xs border-l-4 border-primary/30">
                            <div className="font-medium">
                              Replying to {message.reply_sender_name}
                            </div>
                            <div className="text-muted-foreground">
                              {message.reply_type === "voice"
                                ? "🎤 Voice message"
                                : message.reply_content}
                            </div>
                          </div>
                        )}

                        {/* Message content */}
                        {message.message_type === "voice" ? (
                          <AudioWaveform
                            audioUrl={message.voice_file_path || ""}
                            duration={message.voice_duration}
                            isPlaying={isPlaying === message.id}
                            onPlayPause={() => playVoiceMessage(message)}
                          />
                        ) : message.message_type === "image" ? (
                          <div>
                            <img
                              src={message.media_file_path}
                              alt={message.media_file_name || "Image"}
                              className="max-w-full rounded-lg max-h-96 object-contain"
                              loading="lazy"
                            />
                            {message.content && (
                              <div className="mt-2 text-sm">{message.content}</div>
                            )}
                          </div>
                        ) : message.message_type === "video" ? (
                          <div>
                            <video
                              src={message.media_file_path}
                              controls
                              className="max-w-full rounded-lg max-h-96"
                            />
                            {message.content && (
                              <div className="mt-2 text-sm">{message.content}</div>
                            )}
                          </div>
                        ) : message.message_type === "document" ? (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                            <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {message.media_file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(message.media_file_size)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(message.media_file_path, '_blank')}
                              className="flex-shrink-0"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </Button>
                          </div>
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
                            {message.is_edited && (
                              <span className="text-xs text-muted-foreground italic ml-1">
                                (edited)
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message reactions */}
                  {!isDeleted &&
                    message.reactions &&
                    message.reactions.length > 0 && (
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
                    )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 px-1">
                    <span>
                      {MessagingService.formatMessageTime(message.created_at)}
                    </span>
                    {isOwnMessage && !isDeleted && (
                      <MessageStatus
                        status={message.delivery_status || "sent"}
                        size="sm"
                      />
                    )}
                    {!isDeleted && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyToMessage(message)}
                          className="h-6 w-6 p-0 hover:bg-primary/10"
                          title="Reply"
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-primary/10"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {/* Star */}
                            <DropdownMenuItem
                              onClick={() => handleStarMessage(message.id, message.is_starred || false)}
                            >
                              <Star className={`h-3 w-3 mr-2 ${message.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                              {message.is_starred ? "Unstar" : "Star"}
                            </DropdownMenuItem>
                            
                            {/* Forward */}
                            <DropdownMenuItem
                              onClick={() => setForwardMessage(message)}
                            >
                              <Forward className="h-3 w-3 mr-2" />
                              Forward
                            </DropdownMenuItem>
                            
                            {/* Edit - only for own text messages */}
                            {isOwnMessage && message.message_type === "text" && !message.is_edited && (
                              <DropdownMenuItem
                                onClick={() => setEditMessage(message)}
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            
                            {/* Message Info - only for own messages */}
                            {isOwnMessage && (
                              <DropdownMenuItem
                                onClick={() => setMessageInfo(message)}
                              >
                                <Info className="h-3 w-3 mr-2" />
                                Message Info
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => copyMessage(message.content || "")}
                            >
                              <Copy className="h-3 w-3 mr-2" />
                              Copy
                            </DropdownMenuItem>
                            {isAdmin && !message.is_pinned && (
                              <DropdownMenuItem
                                onClick={() => handlePinMessage(message)}
                              >
                                <Pin className="h-3 w-3 mr-2" />
                                Pin Message
                              </DropdownMenuItem>
                            )}
                            {canDeleteMessage(message) && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteMessage(message)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
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
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Fixed/Sticky */}
      <div className="flex-shrink-0 z-20 bg-[#202c33] dark:bg-[#202c33] border-t border-[#2a3942] dark:border-[#2a3942]">
        {/* Reply Preview */}
        {replyToMessage && (
          <div className="px-4 py-2 bg-[#2a3942] dark:bg-[#2a3942] border-b border-[#3b4a54] flex items-center justify-between">
            <div className="text-sm flex-1 min-w-0">
              <span className="font-medium text-[#00a884]">
                Replying to {replyToMessage.sender_name}
              </span>
              <div className="text-[#8696a0] text-xs truncate">
                {replyToMessage.message_type === "voice"
                  ? "🎤 Voice message"
                  : replyToMessage.content}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReplyToMessage(null)}
              className="h-8 w-8 text-[#8696a0] hover:bg-[#3b4a54]"
            >
              ×
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-[120px] resize-none rounded-2xl px-3 sm:px-4 py-2 shadow-sm border border-[#3b4a54] bg-[#2a3942] dark:bg-[#2a3942] text-[#e9edef] placeholder:text-[#8696a0] focus:bg-[#2a3942] focus:border-[#00a884] transition-colors text-sm"
                rows={1}
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Emoji Picker */}
              <EmojiPicker
                onEmojiSelect={(emoji) => {
                  setNewMessage((prev) => prev + emoji);
                  textareaRef.current?.focus();
                }}
                size="md"
              />
              
              {/* Media Uploader */}
              <MediaUploader
                groupId={selectedGroup.id}
                onUploadSuccess={handleMediaUploadSuccess}
              />
              
              {/* Voice Recording Button */}
              <Button
                variant={isRecording ? "destructive" : "ghost"}
                size="icon"
                onClick={handleMicClick}
                onMouseDown={handleMicMouseDown}
                onMouseUp={handleMicMouseUp}
                onTouchStart={handleMicMouseDown}
                onTouchEnd={handleMicMouseUp}
                className={`h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-all duration-200 ${
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-lg"
                    : "text-[#8696a0] hover:bg-[#3b4a54] hover:text-[#aebac1]"
                }`}
                title={
                  isRecording
                    ? "Stop recording (2 min max)"
                    : "Record voice message (tap or long press to start)"
                }
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
              
              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 bg-[#00a884] text-white hover:bg-[#06cf9c] flex-shrink-0 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                title="Send message"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-red-500 animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <span>Recording... Tap microphone to stop</span>
            </div>
          )}
        </div>
      </div>

      {/* Forward Message Dialog */}
      {forwardMessage && (
        <ForwardMessage
          message={forwardMessage}
          availableGroups={availableGroups}
          onForwardSuccess={() => {
            setForwardMessage(null);
            toast({
              title: "Success",
              description: "Message forwarded successfully",
            });
          }}
        />
      )}

      {/* Edit Message Dialog */}
      {editMessage && (
        <MessageEditor
          message={editMessage}
          onEditSuccess={(updatedContent) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === editMessage.id
                  ? { ...m, content: updatedContent, is_edited: true, edited_at: new Date().toISOString() }
                  : m
              )
            );
            setEditMessage(null);
            toast({
              title: "Success",
              description: "Message edited successfully",
            });
          }}
        />
      )}

      {/* Message Info Dialog */}
      {messageInfo && (
        <MessageInfo
          message={messageInfo}
          groupMemberCount={selectedGroup.member_count}
        />
      )}
    </div>
  );
};
