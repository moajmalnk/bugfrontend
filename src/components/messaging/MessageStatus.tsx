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
          <span title="Sent">
            <Check className={`${iconSize} text-muted-foreground`} />
          </span>
        );
      case "delivered":
        return (
          <span title="Delivered">
            <CheckCheck className={`${iconSize} text-muted-foreground`} />
          </span>
        );
      case "read":
        return (
          <span title="Read">
            <CheckCheck className={`${iconSize} text-blue-500`} />
          </span>
        );
      case "failed":
        return (
          <span title="Failed">
            <XCircle className={`${iconSize} text-destructive`} />
          </span>
        );
      default:
        return (
          <span title="Sending">
            <Clock className={`${iconSize} text-muted-foreground`} />
          </span>
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

