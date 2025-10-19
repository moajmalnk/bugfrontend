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
import { Edit, Save, X } from "lucide-react";
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
        <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Edit Message</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Original Message */}
            <div className="p-3 bg-muted/50 rounded-lg overflow-hidden">
              <p className="text-xs text-muted-foreground mb-1">Original:</p>
              <p className="text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere">{message.content}</p>
            </div>

            {/* Edit Textarea */}
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Edit your message..."
                rows={4}
                disabled={isSaving}
                maxLength={2000}
                autoFocus
                className="resize-none min-h-[100px] max-h-[300px] w-full break-words"
              />
              <p className="text-xs text-muted-foreground text-right">
                {editedContent.length}/2000
              </p>
            </div>

            {/* Warning */}
            <div className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/30 rounded p-2 break-words">
              ⚠️ Edited messages will show an "edited" indicator
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedContent(message.content || "");
                  setIsOpen(false);
                }}
                disabled={isSaving}
                className="w-full sm:w-auto"
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
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

