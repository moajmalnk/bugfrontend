import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import type { ChatGroup, ChatMessage, TypingIndicator } from "@/types";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { memo } from "react";
import { MessageSearch } from "./MessageSearch";
import { StarredMessages } from "./StarredMessages";

interface ChatHeaderProps {
  selectedGroup: ChatGroup;
  typingUsers: TypingIndicator[];
  onBackToChatList?: () => void;
  onOpenGroupMembers?: () => void;
  onMessageClick: (message: ChatMessage) => void;
}

export const ChatHeader = memo(function ChatHeader({
  selectedGroup,
  typingUsers,
  onBackToChatList,
  onOpenGroupMembers,
  onMessageClick,
}: ChatHeaderProps) {
  return (
    <div className="flex-shrink-0 z-20 bg-[#202c33] border-b border-[#2a3942]">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {onBackToChatList && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackToChatList}
                className="md:hidden h-9 w-9 text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef] rounded-full flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <AvatarFallback className="bg-[#6b7c85] text-white font-semibold text-sm">
                {selectedGroup.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium text-[#e9edef] truncate leading-tight">
                {selectedGroup.name}
              </CardTitle>
              <div className="text-xs text-[#8696a0] mt-0.5">
                {typingUsers.length > 0 ? (
                  <span className="text-[#00a884] animate-pulse font-medium">
                    {typingUsers.map((user) => user.user_name).join(", ")} typing...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 shrink-0" />
                    {selectedGroup.member_count} members
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0 text-[#aebac1]">
            {onOpenGroupMembers && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef]"
                title="Members"
                aria-label="Manage members"
                onClick={onOpenGroupMembers}
              >
                <UserPlus className="h-5 w-5" />
              </Button>
            )}
            <MessageSearch groupId={selectedGroup.id} onMessageClick={onMessageClick} />
            <StarredMessages groupId={selectedGroup.id} onMessageClick={onMessageClick} />
          </div>
        </div>
      </div>
    </div>
  );
});
