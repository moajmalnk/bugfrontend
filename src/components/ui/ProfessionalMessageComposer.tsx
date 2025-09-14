import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, FileText, MessageCircle, Send, User } from "lucide-react";
import { useEffect, useState } from "react";
import { MessageTemplateSelector } from "./MessageTemplateSelector";
import { UserPhoneSelector } from "./UserPhoneSelector";

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: "otp" | "notification" | "reminder" | "custom";
  description?: string;
}

interface ProfessionalMessageComposerProps {
  onSendMessage: (phone: string, message: string) => Promise<void>;
  onSendVoiceNote?: (
    phone: string,
    audioBlob: Blob,
    duration: number
  ) => Promise<void>;
  showVoiceNotes?: boolean;
  showTemplates?: boolean;
  showBulkSend?: boolean;
}

export function ProfessionalMessageComposer({
  onSendMessage,
  showTemplates = true,
  showBulkSend = false,
}: ProfessionalMessageComposerProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messagePreview, setMessagePreview] = useState("");

  // Update message preview when message or selected user changes
  useEffect(() => {
    if (selectedUser && message) {
      const preview = message
        .replace(/{USER_NAME}/g, selectedUser.name)
        .replace(/{USER_EMAIL}/g, selectedUser.email)
        .replace(/{USER_PHONE}/g, selectedUser.phone)
        .replace(/{USER_ROLE}/g, selectedUser.role);
      setMessagePreview(preview);
    } else {
      setMessagePreview(message);
    }
  }, [message, selectedUser]);

  const handleSendMessage = async () => {
    if (!selectedUser) {
      toast({
        title: "No Recipient Selected",
        description: "Please select a recipient first",
        variant: "destructive",
      });
      return;
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      toast({
        title: "No Message Content",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const finalMessage = messagePreview || message;
      await onSendMessage(selectedUser.phone, finalMessage);

      // Reset form after successful send
      setMessage("");
      setMessagePreview("");
      setSelectedUser(null);

      toast({
        title: "Message Sent",
        description: `Message sent to ${selectedUser.name}`,
      });
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setMessage(template.content);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Professional Message Composer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipient Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Recipient
          </Label>
          <UserPhoneSelector
            selectedUserId={selectedUser?.id}
            onUserSelect={setSelectedUser}
          />
        </div>

        {/* Message Template Selection */}
        {showTemplates && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Message Template
            </Label>
            <MessageTemplateSelector onTemplateSelect={handleTemplateSelect} />
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-2">
          <Label htmlFor="message">Message Content</Label>
          <Textarea
            id="message"
            placeholder="Type your message here... Use {USER_NAME}, {USER_EMAIL}, {USER_PHONE}, {USER_ROLE} for personalization"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        {/* Message Preview */}
        {messagePreview && messagePreview !== message && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Message Preview
            </Label>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm whitespace-pre-wrap">{messagePreview}</p>
            </div>
          </div>
        )}

        {/* Send Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSendMessage}
            disabled={
              isSending ||
              !selectedUser ||
              !(message && typeof message === "string" && message.trim())
            }
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
