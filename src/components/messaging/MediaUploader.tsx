import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ENV } from "@/lib/env";
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  Send,
  Video,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";

interface MediaUploaderProps {
  groupId: string;
  onUploadSuccess: (messageData: any) => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  groupId,
  onUploadSuccess,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size validation (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images and videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    setIsOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token");

      // Upload file
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("group_id", groupId);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status === 200 || xhr.status === 201) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("POST", `${ENV.API_URL}/messaging/upload_media.php`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });

      const uploadResponse: any = await uploadPromise;

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || "Upload failed");
      }

      // Determine message type based on file type
      let messageType = "document";
      if (selectedFile.type.startsWith("image/")) {
        messageType = "image";
      } else if (selectedFile.type.startsWith("video/")) {
        messageType = "video";
      } else if (selectedFile.type.startsWith("audio/")) {
        messageType = "audio";
      }

      // Send message with media
      const messageData = {
        group_id: groupId,
        message_type: messageType,
        content: caption || undefined,
        media_type: messageType,
        media_file_path: uploadResponse.data.file_url,
        media_file_name: selectedFile.name,
        media_file_size: selectedFile.size,
        media_thumbnail: uploadResponse.data.thumbnail_url,
      };

      // Call success callback
      onUploadSuccess(messageData);

      // Reset state
      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      setIsOpen(false);

      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload media",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    setIsOpen(false);
    setUploadProgress(0);
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Paperclip className="h-5 w-5" />;

    if (selectedFile.type.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (selectedFile.type.startsWith("video/")) {
      return <Video className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        onChange={handleFileSelect}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        className="h-9 w-9 hover:bg-muted"
        title="Attach file"
      >
        <Paperclip className="h-5 w-5 text-muted-foreground" />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon()}
              Send Media
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {preview ? (
              <div className="relative rounded-lg overflow-hidden bg-muted">
                {selectedFile?.type.startsWith("image/") ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-96 object-contain"
                  />
                ) : selectedFile?.type.startsWith("video/") ? (
                  <video
                    src={preview}
                    controls
                    className="w-full max-h-96"
                  />
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-12 h-12 bg-background rounded flex items-center justify-center">
                  {getFileIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedFile?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile && formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                rows={3}
                disabled={isUploading}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {caption.length}/1000
              </p>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                <Send className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

