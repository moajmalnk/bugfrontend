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
    <div className="flex-shrink-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {onBackToChatList && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackToChatList}
                className="h-9 w-9 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex-shrink-0"
                aria-label="Back to chat list"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 ring-2 ring-blue-600/20">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-emerald-600 text-white font-semibold text-sm">
                {selectedGroup.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white truncate leading-tight">
                {selectedGroup.name}
              </CardTitle>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {typingUsers.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 animate-pulse font-medium">
                    {typingUsers.map((user) => user.user_name).join(", ")} typing...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 min-w-0">
                    <Users className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {selectedGroup.member_count} members
                      {selectedGroup.projectName
                        ? ` · ${selectedGroup.projectName}`
                        : ""}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400">
            {onOpenGroupMembers && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
