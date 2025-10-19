import { Check, CheckCheck, Clock, XCircle } from "lucide-react";
import React from "react";

interface MessageStatusProps {
  status: "sent" | "delivered" | "read" | "failed";
  size?: "sm" | "md";
  showText?: boolean;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  size = "sm",
  showText = false,
}) => {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  const renderIcon = () => {
    switch (status) {
      case "sent":
        return (
          <Check
            className={`${iconSize} text-muted-foreground`}
            title="Sent"
          />
        );
      case "delivered":
        return (
          <CheckCheck
            className={`${iconSize} text-muted-foreground`}
            title="Delivered"
          />
        );
      case "read":
        return (
          <CheckCheck
            className={`${iconSize} text-blue-500`}
            title="Read"
          />
        );
      case "failed":
        return (
          <XCircle
            className={`${iconSize} text-destructive`}
            title="Failed"
          />
        );
      default:
        return (
          <Clock
            className={`${iconSize} text-muted-foreground`}
            title="Sending"
          />
        );
    }
  };

  if (showText) {
    return (
      <div className="flex items-center gap-1">
        {renderIcon()}
        <span className="text-xs text-muted-foreground capitalize">
          {status}
        </span>
      </div>
    );
  }

  return renderIcon();
};

