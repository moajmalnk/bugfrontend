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
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Info className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
              <span className="text-xl font-semibold">Message Info</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
            {/* Message Preview */}
            <div className="relative p-4 bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 rounded-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Message Details
                  </p>
                </div>
                <div className="pl-4 border-l-2 border-primary/30 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Sent: {MessagingService.formatMessageTime(message.created_at)}
                  </p>
                  <p className="text-sm break-words whitespace-pre-wrap line-clamp-3">
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
              </div>
            </div>

            {/* Delivery Status */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary"></div>
                  <p className="text-sm text-muted-foreground">Loading delivery info...</p>
                </div>
              ) : deliveryInfo ? (
                <>
                  {/* Read */}
                  {deliveryInfo.read.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500">
                          <CheckCheck className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Read
                        </h3>
                        <span className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                          {deliveryInfo.read.length}
                        </span>
                      </div>
                      <div className="space-y-2 ml-3">
                        {deliveryInfo.read.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <Avatar className="h-9 w-9 flex-shrink-0 border-2 border-background shadow-sm">
                              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500/20 to-blue-400/10 text-blue-600 dark:text-blue-400 font-semibold">
                                {user.user_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border/50 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted-foreground/20">
                          <CheckCheck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Delivered
                        </h3>
                        <span className="ml-auto text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-full">
                          {deliveryInfo.delivered.length}
                        </span>
                      </div>
                      <div className="space-y-2 ml-3">
                        {deliveryInfo.delivered.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <Avatar className="h-9 w-9 flex-shrink-0 border-2 border-background shadow-sm">
                              <AvatarFallback className="text-xs bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 font-semibold">
                                {user.user_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20">
                          <Check className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Pending
                        </h3>
                        <span className="ml-auto text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                          {deliveryInfo.pending.length}
                        </span>
                      </div>
                      <div className="space-y-2 ml-3">
                        {deliveryInfo.pending.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <Avatar className="h-9 w-9 flex-shrink-0 border-2 border-background shadow-sm">
                              <AvatarFallback className="text-xs bg-gradient-to-br from-yellow-500/20 to-yellow-400/10 text-yellow-600 dark:text-yellow-400 font-semibold">
                                {user.user_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
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
                </>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <Info className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No delivery information available</p>
                    <p className="text-xs text-muted-foreground">Delivery status will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Summary */}
          {!isLoading && deliveryInfo && (
            <div className="border-t bg-muted/30 px-6 py-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold mx-auto mb-2">
                    {deliveryInfo.read.length}
                  </div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Read</p>
                </div>
                <div className="p-3 bg-muted border border-border/50 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted-foreground/20 text-foreground text-sm font-bold mx-auto mb-2">
                    {deliveryInfo.delivered.length}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Delivered</p>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm font-bold mx-auto mb-2">
                    {deliveryInfo.pending.length}
                  </div>
                  <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Pending</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

