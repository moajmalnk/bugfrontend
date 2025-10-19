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
import { Check, CheckCheck, Info } from "lucide-react";
import React, { useEffect, useState } from "react";

interface MessageInfoProps {
  message: ChatMessage;
  groupMemberCount: number;
}

interface DeliveryInfo {
  delivered: Array<{ user_id: string; user_name: string; timestamp: string }>;
  read: Array<{ user_id: string; user_name: string; timestamp: string }>;
  pending: Array<{ user_id: string; user_name: string }>;
}

export const MessageInfo: React.FC<MessageInfoProps> = ({
  message,
  groupMemberCount,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDeliveryInfo();
    }
  }, [isOpen, message.id]);

  const loadDeliveryInfo = async () => {
    setIsLoading(true);
    try {
      const info = await MessagingService.getMessageInfo(message.id);
      setDeliveryInfo(info);
    } catch (error) {
      console.error("Error loading message info:", error);
      toast({
        title: "Error",
        description: "Failed to load message info",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        title="Message info"
      >
        <Info className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Message Info
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Message Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                Sent: {MessagingService.formatMessageTime(message.created_at)}
              </p>
              <p className="text-sm line-clamp-2">
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
              {message.is_edited && (
                <p className="text-xs text-muted-foreground mt-1">
                  Edited: {MessagingService.formatMessageTime(message.edited_at!)}
                </p>
              )}
            </div>

            {/* Delivery Status */}
            <div className="space-y-3 overflow-y-auto max-h-[50vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : deliveryInfo ? (
                <>
                  {/* Read */}
                  {deliveryInfo.read.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCheck className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold">
                          Read ({deliveryInfo.read.length})
                        </h3>
                      </div>
                      <div className="space-y-2 ml-6">
                        {deliveryInfo.read.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {user.user_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {user.user_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {MessagingService.formatMessageTime(
                                  user.timestamp
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivered */}
                  {deliveryInfo.delivered.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCheck className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">
                          Delivered ({deliveryInfo.delivered.length})
                        </h3>
                      </div>
                      <div className="space-y-2 ml-6">
                        {deliveryInfo.delivered.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {user.user_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {user.user_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {MessagingService.formatMessageTime(
                                  user.timestamp
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending */}
                  {deliveryInfo.pending.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">
                          Pending ({deliveryInfo.pending.length})
                        </h3>
                      </div>
                      <div className="space-y-2 ml-6">
                        {deliveryInfo.pending.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {user.user_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {user.user_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Not yet delivered
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="pt-3 border-t">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-blue-500/10 rounded">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {deliveryInfo.read.length}
                        </p>
                        <p className="text-muted-foreground">Read</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="font-semibold">
                          {deliveryInfo.delivered.length}
                        </p>
                        <p className="text-muted-foreground">Delivered</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="font-semibold">
                          {deliveryInfo.pending.length}
                        </p>
                        <p className="text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No delivery information available
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

