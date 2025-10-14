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
    <div className="w-full space-y-6">
      {/* Recipient Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-green-50/50 dark:from-blue-950/20 dark:to-green-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
          <div className="p-2 bg-blue-500 rounded-lg">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <Label className="text-sm font-semibold text-gray-900 dark:text-white">Recipient</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Select who will receive this message</p>
          </div>
        </div>
        <UserPhoneSelector
          selectedUserId={selectedUser?.id}
          onUserSelect={setSelectedUser}
        />
      </div>

      {/* Message Template Selection */}
      {showTemplates && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
            <div className="p-2 bg-purple-500 rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-semibold text-gray-900 dark:text-white">Message Template</Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Choose from predefined templates</p>
            </div>
          </div>
          <MessageTemplateSelector onTemplateSelect={handleTemplateSelect} />
        </div>
      )}

      {/* Message Content */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
          <div className="p-2 bg-green-500 rounded-lg">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <Label htmlFor="message" className="text-sm font-semibold text-gray-900 dark:text-white">Message Content</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Use variables like {`{USER_NAME}`}, {`{USER_EMAIL}`}, {`{USER_PHONE}`}, {`{USER_ROLE}`} for personalization</p>
          </div>
        </div>
        <Textarea
          id="message"
          placeholder="Type your message here... Use {USER_NAME}, {USER_EMAIL}, {USER_PHONE}, {USER_ROLE} for personalization"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[120px] border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
        />
      </div>

      {/* Message Preview */}
      {messagePreview && messagePreview !== message && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Message Preview</Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">How your message will appear to the recipient</p>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
            <p className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed">{messagePreview}</p>
          </div>
        </div>
      )}

      {/* Send Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSendMessage}
          disabled={
            isSending ||
            !selectedUser ||
            !(message && typeof message === "string" && message.trim())
          }
          className="h-12 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 rounded-xl"
        >
          <Send className="w-5 h-5 mr-2" />
          {isSending ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </div>
  );
}
