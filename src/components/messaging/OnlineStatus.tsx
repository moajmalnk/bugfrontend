import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import React from "react";

interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: string | null;
  showLastSeen?: boolean;
  variant?: "dot" | "text" | "badge";
  size?: "sm" | "md" | "lg";
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isOnline,
  lastSeen,
  showLastSeen = true,
  variant = "dot",
  size = "sm",
}) => {
  const formatLastSeen = () => {
    if (!lastSeen) return "Last seen a while ago";
    
    try {
      const date = new Date(lastSeen);
      return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch (error) {
      return "Last seen recently";
    }
  };

  if (variant === "dot") {
    const dotSize = {
      sm: "h-2 w-2",
      md: "h-3 w-3",
      lg: "h-4 w-4",
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${dotSize[size]} rounded-full ${
              isOnline ? "bg-green-500" : "bg-gray-400"
            } ${isOnline ? "animate-pulse" : ""} cursor-help transition-all duration-200 hover:scale-110`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs z-50">
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {isOnline ? "User is online and active" : "User is offline"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isOnline ? "Actively using the system" : formatLastSeen()}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === "text") {
    return (
      <p className="text-xs text-muted-foreground">
        {isOnline ? (
          <span className="text-green-600 dark:text-green-400 font-medium">
            Online
          </span>
        ) : showLastSeen && lastSeen ? (
          formatLastSeen()
        ) : (
          "Offline"
        )}
      </p>
    );
  }

  if (variant === "badge") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isOnline ? "default" : "secondary"}
            className={`text-xs cursor-help transition-all duration-200 hover:scale-105 hover:shadow-md ${
              isOnline ? "bg-green-500 hover:bg-green-600" : ""
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs z-50">
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {isOnline ? "User is online and active" : "User is offline"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isOnline ? "Actively using the system" : formatLastSeen()}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
};

