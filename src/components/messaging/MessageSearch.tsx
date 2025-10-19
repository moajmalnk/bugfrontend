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
import type { ChatMessage } from "@/types";
import { Search, X } from "lucide-react";
import React, { useState } from "react";

interface MessageSearchProps {
  groupId: string;
  onMessageClick: (messageId: string) => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({
  groupId,
  onMessageClick,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await MessagingService.searchMessages(groupId, query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching messages:", error);
      toast({
        title: "Search failed",
        description: "Failed to search messages",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleMessageClick = (messageId: string) => {
    onMessageClick(messageId);
    setIsOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-9 w-9"
        title="Search messages"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Search Messages</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Search Results */}
            <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Type at least 2 characters to search
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No messages found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try different keywords
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-2">
                    {searchResults.length} result(s) found
                  </div>
                  {searchResults.map((message) => (
                    <div
                      key={message.id}
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleMessageClick(message.id)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium">
                          {message.sender_name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {MessagingService.formatMessageTime(
                            message.created_at
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {highlightMatch(message.content || "", searchQuery)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

