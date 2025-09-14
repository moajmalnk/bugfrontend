import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { MessagingService } from "@/services/messagingService";
import { PinnedMessage } from "@/types";
import { Clock, MessageCircle, Mic, Pin, PinOff, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface PinnedMessagesProps {
  groupId: string;
  onMessageClick?: (messageId: string) => void;
}

export const PinnedMessages: React.FC<PinnedMessagesProps> = ({
  groupId,
  onMessageClick,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (groupId) {
      loadPinnedMessages();
    }
  }, [groupId]);

  const loadPinnedMessages = async () => {
    setIsLoading(true);
    try {
      const messages = await MessagingService.getPinnedMessages(groupId);
      setPinnedMessages(messages);
    } catch (error) {
      console.error("Error loading pinned messages:", error);
      toast({
        title: "Error",
        description: "Failed to load pinned messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await MessagingService.unpinMessage(messageId);
      setPinnedMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      toast({
        title: "Success",
        description: "Message unpinned successfully",
      });
    } catch (error) {
      console.error("Error unpinning message:", error);
      toast({
        title: "Error",
        description: "Failed to unpin message",
        variant: "destructive",
      });
    }
  };

  const formatPinnedTime = (timestamp: string) => {
    return formatLocalDate(timestamp, "datetime");
  };

  const getMessagePreview = (message: PinnedMessage) => {
    if (message.message_type === "voice") {
      return "🎤 Voice message";
    }
    return message.content?.length > 50
      ? `${message.content.substring(0, 50)}...`
      : message.content;
  };

  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Pinned Messages ({pinnedMessages.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2 text-xs"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded ? (
        <CardContent className="pt-0">
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {pinnedMessages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start justify-between p-2 rounded-lg bg-background/50 border hover:bg-background/80 transition-colors"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onMessageClick?.(message.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary">
                        {message.sender_name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {message.message_type === "voice" ? (
                          <Mic className="h-3 w-3 mr-1" />
                        ) : (
                          <MessageCircle className="h-3 w-3 mr-1" />
                        )}
                        {message.message_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getMessagePreview(message)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Pinned {formatPinnedTime(message.pinned_at)} by{" "}
                        {message.pinned_by_name}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <PinOff className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleUnpinMessage(message.id)}
                          className="text-destructive"
                        >
                          <PinOff className="h-3 w-3 mr-2" />
                          Unpin Message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      ) : (
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">
                {pinnedMessages.length === 1
                  ? getMessagePreview(pinnedMessages[0])
                  : `${pinnedMessages.length} pinned messages`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Latest: {formatPinnedTime(pinnedMessages[0].pinned_at)}
              </div>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnpinMessage(pinnedMessages[0].id)}
                className="h-6 w-6 p-0"
                title="Unpin latest message"
              >
                <PinOff className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
