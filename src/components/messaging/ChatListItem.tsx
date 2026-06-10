import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ChatGroup } from "@/types";
import { Edit, MoreVertical, Trash2, UserPlus } from "lucide-react";
import { memo } from "react";

interface ChatListItemProps {
  group: ChatGroup;
  isSelected: boolean;
  subtitle: string;
  timeLabel: string | null;
  canManageMembers: boolean;
  canEditOrDelete: boolean;
  onSelect: (group: ChatGroup) => void;
  onManageMembers: (groupId: string) => void;
  onEditGroup: (group: ChatGroup) => void;
  onDeleteGroup: (groupId: string) => void;
}

export const ChatListItem = memo(function ChatListItem({
  group,
  isSelected,
  subtitle,
  timeLabel,
  canManageMembers,
  canEditOrDelete,
  onSelect,
  onManageMembers,
  onEditGroup,
  onDeleteGroup,
}: ChatListItemProps) {
  const hasActions = canManageMembers || canEditOrDelete;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(group)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect(group);
      }}
      className={cn(
        "group/chat flex items-center gap-3 px-3 py-3 cursor-pointer outline-none transition-colors border-b border-[#222d34]",
        isSelected ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
      )}
      aria-selected={isSelected}
    >
      <Avatar className="h-12 w-12 flex-shrink-0 rounded-full">
        <AvatarFallback className="bg-[#6b7c85] text-white text-lg font-medium">
          {group.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-[#e9edef] truncate leading-tight">
            {group.name}
          </span>
          {timeLabel ? (
            <span className="text-[11px] text-[#8696a0] shrink-0 tabular-nums pt-0.5 max-w-[4.5rem] text-right">
              {timeLabel}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[#8696a0] truncate mt-0.5 leading-snug">
          {subtitle}
        </p>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px] text-[#667781] truncate">
            {group.projectName}
            {typeof group.member_count === "number"
              ? ` · ${group.member_count} members`
              : ""}
            {!group.is_member ? " · Not a member" : ""}
          </span>

          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full text-[#8696a0] hover:bg-[#3b4a54] hover:text-[#e9edef] opacity-100 sm:opacity-0 sm:group-hover/chat:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Chat options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-[#233138] border-[#2a3942] text-[#e9edef]"
              >
                {canManageMembers && (
                  <DropdownMenuItem
                    className="focus:bg-[#2a3942] cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      onManageMembers(group.id);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Members
                  </DropdownMenuItem>
                )}
                {canEditOrDelete && (
                  <>
                    <DropdownMenuItem
                      className="focus:bg-[#2a3942] cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditGroup(group);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit group
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-[#3f1f1f] text-red-300 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteGroup(group.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete group
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
});
