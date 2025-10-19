import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessagingService } from "@/services/messagingService";
import type { ChatMessage } from "@/types";
import { Star, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface StarredMessagesProps {
  groupId: string;
  onMessageClick: (messageId: string) => void;
}

export const StarredMessages: React.FC<StarredMessagesProps> = ({
  groupId,
  onMessageClick,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [starredMessages, setStarredMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStarredMessages();
    }
  }, [isOpen, groupId]);

  const loadStarredMessages = async () => {
    setIsLoading(true);
    try {
      const messages = await MessagingService.getStarredMessages(groupId);
      setStarredMessages(messages);
    } catch (error) {
      console.error("Error loading starred messages:", error);
      toast({
        title: "Error",
        description: "Failed to load starred messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstar = async (messageId: string) => {
    try {
      await MessagingService.unstarMessage(messageId);
      setStarredMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast({
        title: "Message unstarred",
        description: "Message removed from starred messages",
      });
    } catch (error) {
      console.error("Error unstarring message:", error);
      toast({
        title: "Error",
        description: "Failed to unstar message",
        variant: "destructive",
      });
    }
  };

  const handleMessageClick = (messageId: string) => {
    onMessageClick(messageId);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Star className="h-4 w-4" />
        Starred Messages
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Starred Messages
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : starredMessages.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No starred messages yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Star important messages to find them easily later
                </p>
              </div>
            ) : (
              starredMessages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleMessageClick(message.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {message.sender_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">
                          {message.sender_name}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {MessagingService.formatMessageTime(
                              message.created_at
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnstar(message.id);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Unstar"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {message.message_type === "voice"
                          ? "🎤 Voice message"
                          : message.message_type === "image"
                          ? "📷 Image"
                          : message.message_type === "video"
                          ? "🎥 Video"
                          : message.message_type === "document"
                          ? "📄 Document"
                          : message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

