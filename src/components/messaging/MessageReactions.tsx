import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Smile, 
  Plus,
  Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessagingService } from '@/services/messagingService';
import { MessageReaction, EmojiReaction } from '@/types';

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  onReactionUpdate: (reactions: MessageReaction[]) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onReactionUpdate
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isAddingReaction, setIsAddingReaction] = useState(false);

  const commonEmojis = MessagingService.getCommonEmojis();

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: []
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user_name);
    return acc;
  }, {} as Record<string, EmojiReaction>);

  const handleAddReaction = async (emoji: string) => {
    if (!currentUser) return;

    setIsAddingReaction(true);
    try {
      const newReaction = await MessagingService.addReaction(messageId, emoji);
      onReactionUpdate([...reactions, newReaction]);
      toast({
        title: "Success",
        description: "Reaction added"
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive"
      });
    } finally {
      setIsAddingReaction(false);
    }
  };

  const handleRemoveReaction = async (emoji: string) => {
    if (!currentUser) return;

    try {
      await MessagingService.removeReaction(messageId, emoji);
      const updatedReactions = reactions.filter(
        r => !(r.emoji === emoji && r.user_id === currentUser.id)
      );
      onReactionUpdate(updatedReactions);
      toast({
        title: "Success",
        description: "Reaction removed"
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast({
        title: "Error",
        description: "Failed to remove reaction",
        variant: "destructive"
      });
    }
  };

  const hasUserReacted = (emoji: string) => {
    return reactions.some(r => r.emoji === emoji && r.user_id === currentUser?.id);
  };

  const handleReactionClick = (emoji: string) => {
    if (hasUserReacted(emoji)) {
      handleRemoveReaction(emoji);
    } else {
      handleAddReaction(emoji);
    }
  };

  if (reactions.length === 0) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted/50"
              disabled={isAddingReaction}
            >
              <Smile className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg hover:bg-muted/50"
                  onClick={() => handleAddReaction(emoji)}
                  disabled={isAddingReaction}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {Object.values(groupedReactions).map((group) => (
        <Button
          key={group.emoji}
          variant={hasUserReacted(group.emoji) ? "secondary" : "ghost"}
          size="sm"
          className={`h-6 px-2 text-xs ${
            hasUserReacted(group.emoji) 
              ? 'bg-primary/20 text-primary hover:bg-primary/30' 
              : 'hover:bg-muted/50'
          }`}
          onClick={() => handleReactionClick(group.emoji)}
          disabled={isAddingReaction}
        >
          <span className="mr-1">{group.emoji}</span>
          <span>{group.count}</span>
        </Button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted/50"
            disabled={isAddingReaction}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {commonEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 text-lg hover:bg-muted/50 ${
                  hasUserReacted(emoji) ? 'bg-primary/20 text-primary' : ''
                }`}
                onClick={() => handleReactionClick(emoji)}
                disabled={isAddingReaction}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Show users who reacted */}
      {Object.values(groupedReactions).map((group) => (
        <Popover key={`users-${group.emoji}`}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted/50"
            >
              <Users className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              <div className="text-xs font-medium mb-2">
                {group.emoji} {group.count} reaction{group.count !== 1 ? 's' : ''}
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {group.users.map((userName, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      {userName}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}; 