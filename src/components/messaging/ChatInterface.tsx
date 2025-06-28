import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Reply, 
  Copy, 
  Trash2, 
  MoreVertical,
  Users,
  Clock,
  MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessagingService } from '@/services/messagingService';
import { ChatGroup, ChatMessage, TypingIndicator } from '@/types';

interface ChatInterfaceProps {
  selectedGroup: ChatGroup | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedGroup }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
      startPolling();
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (page: number = 1, append: boolean = false) => {
    if (!selectedGroup) return;

    setIsLoading(true);
    try {
      const response = await MessagingService.getMessages(selectedGroup.id, page);
      
      if (append) {
        setMessages(prev => [...response.messages, ...prev]);
      } else {
        setMessages(response.messages);
      }
      
      setHasMoreMessages(response.pagination.page < response.pagination.pages);
      setCurrentPage(response.pagination.page);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
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
        setMessages(prev => {
          // Check if message already exists
          if (prev.find(m => m.id === newMessage.id)) {
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);

    try {
      const messageData: any = {
        group_id: selectedGroup.id,
        message_type: 'text',
        content: messageContent
      };

      if (replyToMessage) {
        messageData.message_type = 'reply';
        messageData.reply_to_message_id = replyToMessage.id;
      }

      const sentMessage = await MessagingService.sendMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);
      setReplyToMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedGroup) return;

    try {
      const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
      const uploadResult = await MessagingService.uploadVoiceMessage(file);
      
      const messageData = {
        group_id: selectedGroup.id,
        message_type: 'voice' as const,
        voice_file_path: uploadResult.file_url,
        voice_duration: uploadResult.duration
      };

      const sentMessage = await MessagingService.sendMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive"
      });
    }
  };

  const playVoiceMessage = async (message: ChatMessage) => {
    if (!message.voice_file_path) return;

    try {
      if (isPlaying === message.id) {
        // Stop playing
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(null);
      } else {
        // Start playing
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(message.voice_file_path);
        audioRef.current.onended = () => setIsPlaying(null);
        audioRef.current.onerror = () => {
          setIsPlaying(null);
          toast({
            title: "Error",
            description: "Failed to play voice message",
            variant: "destructive"
          });
        };
        
        await audioRef.current.play();
        setIsPlaying(message.id);
      }
    } catch (error) {
      console.error('Error playing voice message:', error);
      toast({
        title: "Error",
        description: "Failed to play voice message",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    try {
      await MessagingService.deleteMessage(message.id);
      setMessages(prev => prev.filter(m => m.id !== message.id));
      toast({
        title: "Success",
        description: "Message deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard"
    });
  };

  const canDeleteMessage = (message: ChatMessage) => {
    if (isAdmin) return true;
    if (message.sender_id !== currentUser?.id) return false;
    
    const messageTime = new Date(message.created_at).getTime();
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    return (currentTime - messageTime) <= oneHour;
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
    <div className="flex flex-col h-full min-h-0 bg-background rounded-lg shadow-md overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{selectedGroup.name}</CardTitle>
            <span className="text-xs text-muted-foreground">({selectedGroup.member_count} members)</span>
          </div>
          {typingUsers.length > 0 && (
            <div className="text-primary text-xs mt-1 animate-pulse">
              {typingUsers.map(u => u.user_name).join(', ')} typing...
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-6 py-4 space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
        {hasMoreMessages && (
          <div className="flex justify-center mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMessages(currentPage + 1, true)}
              disabled={isLoading}
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
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} w-full`}
            >
              <div className={`flex items-end max-w-[85vw] md:max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isOwnMessage && (
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>
                      {message.sender_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`space-y-1 ${isOwnMessage ? 'mr-2 items-end' : 'ml-2 items-start'} flex flex-col w-full`}>
                  {!isOwnMessage && (
                    <div className="text-xs text-muted-foreground font-medium">
                      {message.sender_name}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 shadow-sm transition-colors break-words whitespace-pre-wrap ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } ${isDeleted ? 'opacity-60 italic' : 'hover:ring-2 hover:ring-primary/20 focus-within:ring-2 focus-within:ring-primary/30'}`}
                  >
                    {isDeleted ? (
                      <div className="text-muted-foreground italic">This message was deleted</div>
                    ) : (
                      <>
                        {/* Reply to message */}
                        {message.reply_to_message_id && (
                          <div className="mb-2 p-2 bg-background/60 rounded text-xs border-l-4 border-primary/30">
                            <div className="font-medium">Replying to {message.reply_sender_name}</div>
                            <div className="text-muted-foreground">
                              {message.reply_type === 'voice' ? '🎤 Voice message' : message.reply_content}
                            </div>
                          </div>
                        )}
                        {/* Message content */}
                        {message.message_type === 'voice' ? (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playVoiceMessage(message)}
                              className="h-8 w-8 p-0"
                            >
                              {isPlaying === message.id ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="text-sm">
                              {message.voice_duration && MessagingService.formatVoiceDuration(message.voice_duration)}
                            </div>
                          </div>
                        ) : (
                          <div>{message.content}</div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{MessagingService.formatMessageTime(message.created_at)}</span>
                    {!isDeleted && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyToMessage(message)}
                          className="h-6 w-6 p-0"
                          title="Reply"
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => copyMessage(message.content || '')}>
                              <Copy className="h-3 w-3 mr-2" />
                              Copy
                            </DropdownMenuItem>
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

      {/* Reply Preview */}
      {replyToMessage && (
        <div className="sticky bottom-20 z-10 p-3 bg-muted/70 border-b flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">Replying to {replyToMessage.sender_name}</span>
            <div className="text-muted-foreground truncate">
              {replyToMessage.message_type === 'voice' 
                ? '🎤 Voice message' 
                : replyToMessage.content
              }
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyToMessage(null)}
          >
            ×
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[120px] resize-none flex-1 rounded-2xl px-4 py-2 shadow-sm"
            rows={1}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading}
            size="icon"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}; 