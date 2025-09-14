import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { Copy, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";

interface WhatsAppMessageProps {
  message: string;
  otp?: string;
  phone?: string;
  timestamp?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  showCopyButton?: boolean;
}

export function WhatsAppMessage({
  message,
  otp,
  phone,
  timestamp,
  status = "sent",
  showCopyButton = true,
}: WhatsAppMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyOTP = async () => {
    if (!otp) {
      toast({
        title: "No OTP",
        description: "No OTP found in this message",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      toast({
        title: "OTP Copied",
        description: `OTP ${otp} has been copied to clipboard`,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy OTP to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCopyMessage = async () => {
    if (!message || typeof message !== "string") {
      toast({
        title: "Copy Failed",
        description: "Invalid message format",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Message Copied",
        description: "Message has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "delivered":
        return "text-blue-500";
      case "read":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      case "failed":
        return "✗";
      default:
        return "✓";
    }
  };

  // Extract OTP from message if not provided
  const extractOTP = (msg: string): string | null => {
    if (!msg || typeof msg !== "string") {
      return null;
    }
    const otpMatch = msg.match(/\b\d{6}\b/);
    return otpMatch ? otpMatch[0] : null;
  };

  const extractedOTP = otp || extractOTP(message);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {phone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{phone}</span>
                </div>
              )}
              {timestamp && (
                <span className="text-xs text-muted-foreground">
                  {formatLocalDate(timestamp, "time")}
                </span>
              )}
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 mb-3">
              <p className="text-sm whitespace-pre-wrap">
                {typeof message === "string"
                  ? message
                  : "Invalid message format"}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getStatusColor()}`}>
                  {getStatusIcon()}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {showCopyButton && extractedOTP && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyOTP}
                    className="h-8 px-3 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {copied ? "Copied!" : "Copy OTP"}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyMessage}
                  className="h-8 px-2 text-xs"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
