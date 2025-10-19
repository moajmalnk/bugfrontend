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
import { ChatGroup, ChatMessage } from "@/types";
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
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="h-5 w-5" />
              Forward Message
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Message Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">
                {message.sender_name}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2">
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

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Groups List */}
            <div className="space-y-2 overflow-y-auto max-h-[40vh] pr-2">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No groups found
                  </p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroups.includes(group.id)
                        ? "bg-primary/10 border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleGroupToggle(group.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      className="rounded"
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {group.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {group.name}
                      </p>
                      {group.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Count */}
            {selectedGroups.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded">
                <span className="text-sm font-medium">
                  {selectedGroups.length} group(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGroups([])}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedGroups([]);
                  setSearchQuery("");
                }}
                disabled={isForwarding}
              >
                Cancel
              </Button>
              <Button
                onClick={handleForward}
                disabled={selectedGroups.length === 0 || isForwarding}
              >
                <Send className="h-4 w-4 mr-2" />
                {isForwarding ? "Forwarding..." : "Forward"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

