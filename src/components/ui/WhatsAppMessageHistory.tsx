import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Copy, MessageCircle, Search } from "lucide-react";
import { useState } from "react";
import { ProfessionalMessageComposer } from "./ProfessionalMessageComposer";
import { WhatsAppMessage } from "./WhatsAppMessage";

interface WhatsAppMessageData {
  id: string;
  phone: string;
  message: string;
  timestamp: string;
  status: string;
  otp?: string;
  expires_at?: string;
}

interface WhatsAppMessageHistoryProps {
  messages: WhatsAppMessageData[];
  onSendMessage: (phone: string, message: string) => Promise<void>;
  showSendForm?: boolean;
  title?: string;
}

export function WhatsAppMessageHistory({
  messages,
  onSendMessage,
  showSendForm = false,
  title = "WhatsApp Messages",
}: WhatsAppMessageHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const filteredMessages = messages.filter(
    (msg) =>
      msg.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyAllOTPs = async () => {
    const otps = messages
      .map((msg) => msg.otp)
      .filter((otp) => otp && otp.trim() !== "")
      .join(", ");

    if (otps) {
      try {
        await navigator.clipboard.writeText(otps);
        toast({
          title: "OTPs Copied",
          description: "All OTPs have been copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy OTPs to clipboard",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No OTPs Found",
        description: "No OTPs found in the messages",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            {title}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages or phone numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {showSendForm && onSendMessage && (
              <Button
                variant="outline"
                onClick={() => setShowComposer(!showComposer)}
                className="flex items-center gap-2"
              >
                {showComposer ? "Hide Composer" : "New Message"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Professional Message Composer */}
      {showComposer && showSendForm && onSendMessage && (
        <div className="px-6 pb-6">
          <ProfessionalMessageComposer
            onSendMessage={onSendMessage}
            showTemplates={true}
            showBulkSend={false}
          />
        </div>
      )}

      <CardContent className="space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "No messages found matching your search"
              : "No messages yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Copy All OTPs Button */}
            {messages.some((msg) => msg.otp) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllOTPs}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy All OTPs
                </Button>
              </div>
            )}

            {/* Messages List */}
            <div className="space-y-3">
              {filteredMessages.map((messageData) => (
                <WhatsAppMessage
                  key={messageData.id}
                  message={messageData.message}
                  otp={messageData.otp}
                  phone={messageData.phone}
                  timestamp={messageData.timestamp}
                  status={
                    messageData.status as
                      | "sent"
                      | "delivered"
                      | "read"
                      | "failed"
                  }
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
