import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessagingService } from "@/services/messagingService";
import type { ChatGroup, ChatMessage } from "@/types";
import { Forward, Search, Send } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ForwardMessageProps {
  message: ChatMessage;
  availableGroups: ChatGroup[];
  onForwardSuccess: () => void;
}

export const ForwardMessage: React.FC<ForwardMessageProps> = ({
  message,
  availableGroups,
  onForwardSuccess,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const filteredGroups = availableGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleForward = async () => {
    if (selectedGroups.length === 0) {
      toast({
        title: "No groups selected",
        description: "Please select at least one group to forward to",
        variant: "destructive",
      });
      return;
    }

    setIsForwarding(true);
    try {
      await MessagingService.forwardMessage(message.id, selectedGroups);
      
      toast({
        title: "Message forwarded",
        description: `Forwarded to ${selectedGroups.length} group(s)`,
      });

      setIsOpen(false);
      setSelectedGroups([]);
      setSearchQuery("");
      onForwardSuccess();
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast({
        title: "Forward failed",
        description: "Failed to forward message",
        variant: "destructive",
      });
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Forward className="h-4 w-4" />
        Forward
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Forward className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
              <span className="text-xl font-semibold">Forward Message</span>
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
                    Message to forward
                  </p>
                </div>
                <div className="pl-4 border-l-2 border-primary/30 space-y-1">
                  <p className="text-sm font-semibold break-words text-foreground">
                    {message.sender_name}
                  </p>
                  <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap line-clamp-3">
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

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Select destination groups
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-border/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Groups List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Available Groups ({filteredGroups.length})
                </p>
                {selectedGroups.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedGroups([])}
                    className="h-7 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
                {filteredGroups.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">No groups found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your search</p>
                    </div>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        selectedGroups.includes(group.id)
                          ? "bg-primary/10 border-primary/50 shadow-sm"
                          : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                      }`}
                      onClick={() => handleGroupToggle(group.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                        className="rounded flex-shrink-0 w-4 h-4 text-primary border-border/50 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      />
                      <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {group.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {group.name}
                        </p>
                        {group.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>
                      {selectedGroups.includes(group.id) && (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t bg-muted/30 px-6 py-4">
            {selectedGroups.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {selectedGroups.length}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {selectedGroups.length === 1 ? "1 group" : `${selectedGroups.length} groups`} selected
                </span>
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedGroups([]);
                  setSearchQuery("");
                }}
                disabled={isForwarding}
                className="w-full sm:w-auto h-11 border-border/50 hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleForward}
                disabled={selectedGroups.length === 0 || isForwarding}
                className="w-full sm:w-auto h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
              >
                <Send className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {isForwarding ? "Forwarding..." : selectedGroups.length > 0 ? `Forward to ${selectedGroups.length} ${selectedGroups.length === 1 ? "group" : "groups"}` : "Forward"}
                </span>
                <span className="sm:hidden">
                  {isForwarding ? "Forwarding..." : "Forward"}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

