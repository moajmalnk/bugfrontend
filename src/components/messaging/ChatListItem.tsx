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
        "group/chat flex items-center gap-3 px-3 py-3 cursor-pointer outline-none transition-all border-b border-gray-200/50 dark:border-gray-700/50 min-w-0",
        isSelected
          ? "bg-gradient-to-r from-blue-50/90 to-emerald-50/70 dark:from-blue-950/40 dark:to-emerald-950/30 border-l-2 border-l-blue-600"
          : "hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
      )}
      aria-selected={isSelected}
    >
      <Avatar className="h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 ring-2 ring-blue-600/10">
        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-emerald-600 text-white text-base font-semibold">
          {group.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <span className="font-semibold text-gray-900 dark:text-white truncate leading-tight min-w-0">
            {group.name}
          </span>
          {timeLabel ? (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 tabular-nums pt-0.5">
              {timeLabel}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5 leading-snug">
          {subtitle}
        </p>
        <div className="flex items-center justify-between gap-2 mt-1 min-w-0">
          <span className="text-[11px] text-gray-500 dark:text-gray-500 truncate min-w-0">
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
                  className="h-8 w-8 shrink-0 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-100 sm:opacity-0 sm:group-hover/chat:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Chat options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canManageMembers && (
                  <DropdownMenuItem
                    className="cursor-pointer"
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
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditGroup(group);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit group
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
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
