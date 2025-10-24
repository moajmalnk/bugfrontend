import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessagingService } from "@/services/messagingService";
import type { ChatMessage } from "@/types";
import { Edit, Save, X, MessageCircle } from "lucide-react";
import React, { useState } from "react";

interface MessageEditorProps {
  message: ChatMessage;
  onEditSuccess: (updatedContent: string) => void;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  message,
  onEditSuccess,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editedContent.trim()) {
      toast({
        title: "Content required",
        description: "Message content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (editedContent.trim() === message.content?.trim()) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await MessagingService.editMessage(message.id, editedContent.trim());
      
      onEditSuccess(editedContent.trim());
      setIsOpen(false);

      toast({
        title: "Message edited",
        description: "Your message has been updated",
      });
    } catch (error) {
      console.error("Error editing message:", error);
      toast({
        title: "Edit failed",
        description: "Failed to edit message",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Only allow editing text messages
  if (message.message_type !== "text") {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        title="Edit message"
      >
        <Edit className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar"
          aria-describedby="message-editor-description"
        >
          <DialogHeader>
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20 rounded-t-lg"></div>
              <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 p-4">
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Edit Message</span>
                </DialogTitle>
                <p id="message-editor-description" className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Edit your message content and formatting.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Original Message */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-xl"></div>
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Original Message:</p>
                <p className="text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere text-gray-900 dark:text-white">{message.content}</p>
              </div>
            </div>

            {/* Edit Textarea */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900 dark:text-white">Edit your message:</label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Edit your message..."
                rows={4}
                disabled={isSaving}
                maxLength={2000}
                autoFocus
                className="resize-none min-h-[100px] max-h-[300px] w-full break-words border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                {editedContent.length}/2000 characters
              </p>
            </div>

            {/* Warning */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-xl"></div>
              <div className="relative bg-yellow-50/80 dark:bg-yellow-950/30 backdrop-blur-sm border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                    Edited messages will show an "edited" indicator
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedContent(message.content || "");
                  setIsOpen(false);
                }}
                disabled={isSaving}
                className="w-full sm:w-auto h-11 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !editedContent.trim() ||
                  editedContent.trim() === message.content?.trim() ||
                  isSaving
                }
                className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

