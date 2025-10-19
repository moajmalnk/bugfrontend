import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/axios";
import { sendBugStatusUpdateNotification } from "@/services/emailService";
import { Bug, BugPriority, BugStatus } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Download,
  Eye,
  File,
  FileImage,
  ImagePlus,
  Mic,
  Paperclip,
  Pause,
  Play,
  Plus,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { ENV } from "@/lib/env";
import { useAuth } from "@/context/AuthContext";

// Character limits
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;
const EXPECTED_RESULT_MAX = 1000;
const ACTUAL_RESULT_MAX = 1000;

interface FileWithPreview extends File {
  preview?: string;
}

interface VoiceNote {
  id: string;
  blob: Blob;
  duration: number;
  name: string;
  isPlaying: boolean;
  audioUrl?: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by: string;
  full_url?: string;
  isPlaying?: boolean;
}

const formSchema = z.object({
  title: z
    .string()
    .min(3, "Bug title must be at least 3 characters")
    .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`),
  description: z
    .string()
    .min(2, "Description must be at least 2 characters")
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
  expected_result: z
    .string()
    .max(EXPECTED_RESULT_MAX, `Expected result must be at most ${EXPECTED_RESULT_MAX} characters`)
    .optional()
    .or(z.literal("")),
  actual_result: z
    .string()
    .max(ACTUAL_RESULT_MAX, `Actual result must be at most ${ACTUAL_RESULT_MAX} characters`)
    .optional()
    .or(z.literal("")),
  priority: z.enum(["low", "medium", "high"] as const),
  status: z.enum([
    "pending",
    "in_progress",
    "fixed",
    "declined",
    "rejected",
  ] as const),
});

type FormValues = z.infer<typeof formSchema>;

interface EditBugDialogProps {
  bug: Bug;
  children: React.ReactNode;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const EditBugDialog = ({ bug, children }: EditBugDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // File uploads
  const [screenshots, setScreenshots] = useState<FileWithPreview[]>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Refs for file inputs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: bug.title,
      description: bug.description,
      expected_result: (bug as any).expected_result || "",
      actual_result: (bug as any).actual_result || "",
      priority: bug.priority as BugPriority,
      status: bug.status as BugStatus,
    },
  });

  // Reset form and load existing attachments when bug changes or dialog opens
  useEffect(() => {
    if (open) {
    form.reset({
      title: bug.title,
      description: bug.description,
      expected_result: (bug as any).expected_result || "",
      actual_result: (bug as any).actual_result || "",
      priority: bug.priority as BugPriority,
      status: bug.status as BugStatus,
    });

      // Load existing attachments
      const loadAttachments = async () => {
        try {
          const response = await apiClient.get<ApiResponse<{ attachments: Attachment[] }>>(`/bugs/get.php?id=${bug.id}`);
          if (response.data.success && response.data.data?.attachments) {
            // Process attachments to add full URLs
            const attachmentsWithUrls = response.data.data.attachments.map((att) => {
              // Determine the correct endpoint based on file type
              let fullUrl: string;
              
              if (att.file_type.startsWith("image/")) {
                // Use image API endpoint for images
                fullUrl = `${ENV.API_URL}/image.php?path=${encodeURIComponent(att.file_path)}`;
              } else if (att.file_type.startsWith("audio/")) {
                // Use audio API endpoint for audio files
                fullUrl = `${ENV.API_URL}/audio.php?path=${encodeURIComponent(att.file_path)}`;
              } else {
                // Use direct path for other files
                fullUrl = `${ENV.API_URL}/${att.file_path}`;
              }
              
              return {
                ...att,
                full_url: fullUrl,
              };
            });
            setExistingAttachments(attachmentsWithUrls);
          }
        } catch (error) {
          console.error("Failed to load attachments:", error);
        }
      };

      loadAttachments();

      // Reset file states
      setScreenshots([]);
      setFiles([]);
      setVoiceNotes([]);
      setAttachmentsToDelete([]);
    }
  }, [bug, form, open]);

  // Cleanup effect for blob URLs
  useEffect(() => {
    return () => {
      // Clean up all blob URLs when component unmounts
      voiceNotes.forEach((voiceNote) => {
        if (voiceNote.audioUrl && voiceNote.audioUrl.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(voiceNote.audioUrl);
          } catch (error) {
            console.error("Error revoking blob URL on cleanup:", error);
          }
        }
      });

      screenshots.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });

      files.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });

      // Clean up current audio
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [voiceNotes, currentAudio, screenshots, files]);

  // File handling functions
  const handleScreenshotClick = () => {
    screenshotInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleScreenshotChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          file.preview = URL.createObjectURL(file);
        }
      });
      setScreenshots((prev) => [...prev, ...newFiles]);
      e.target.value = "";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          file.preview = URL.createObjectURL(file);
        }
      });
      setFiles((prev) => [...prev, ...newFiles]);
      e.target.value = "";
    }
  };

  const removeScreenshot = (index: number) => {
    const newScreenshots = [...screenshots];
    if (newScreenshots[index].preview) {
      URL.revokeObjectURL(newScreenshots[index].preview!);
    }
    newScreenshots.splice(index, 1);
    setScreenshots(newScreenshots);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const removeExistingAttachment = (attachmentId: string) => {
    setAttachmentsToDelete((prev) => [...prev, attachmentId]);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const playExistingVoiceNote = (attachment: Attachment) => {
    if (!attachment.full_url) {
      toast({
        title: "Playback Error",
        description: "Audio file not found.",
        variant: "destructive",
      });
      return;
    }

    console.log("=== PLAY EXISTING VOICE NOTE ===");
    console.log("File name:", attachment.file_name);
    console.log("File type:", attachment.file_type);
    console.log("File path:", attachment.file_path);
    console.log("Full URL:", attachment.full_url);

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    // Reset all voice notes playing state
    setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));
    setExistingAttachments((prev) => prev.map((att) => ({ ...att, isPlaying: false })));

    // Create new audio element
    const audio = new Audio();
    
    // Set up event listeners before setting src
    audio.onloadstart = () => {
      console.log("Audio loading started");
    };

    audio.onloadedmetadata = () => {
      console.log("Audio metadata loaded, duration:", audio.duration);
    };

    audio.oncanplay = () => {
      console.log("Audio can play");
    };

    audio.onended = () => {
      console.log("Audio playback ended");
      setExistingAttachments((prev) => prev.map((att) => ({ ...att, isPlaying: false })));
      setCurrentAudio(null);
    };

    audio.onerror = (e) => {
      console.error("Audio error event:", e);
      console.error("Audio error code:", audio.error?.code);
      console.error("Audio error message:", audio.error?.message);
      
      setExistingAttachments((prev) => prev.map((att) => ({ ...att, isPlaying: false })));
      setCurrentAudio(null);
      
      let errorMessage = "Failed to play audio file.";
      if (audio.error) {
        switch (audio.error.code) {
          case 1:
            errorMessage = "Audio loading aborted.";
            break;
          case 2:
            errorMessage = "Network error while loading audio.";
            break;
          case 3:
            errorMessage = "Audio decoding failed.";
            break;
          case 4:
            errorMessage = "Audio format not supported.";
            break;
        }
      }
      
      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
    };

    // Set the source after event listeners are attached
    audio.src = attachment.full_url;
    setCurrentAudio(audio);

    // Set this attachment as playing
    setExistingAttachments((prev) =>
      prev.map((att) => ({
        ...att,
        isPlaying: att.id === attachment.id,
      }))
    );

    // Load and play
    audio.load();
    audio.play().then(() => {
      console.log("Audio playback started successfully");
    }).catch((error) => {
      console.error("Error playing audio:", error);
      setExistingAttachments((prev) => prev.map((att) => ({ ...att, isPlaying: false })));
      setCurrentAudio(null);
      toast({
        title: "Playback Error",
        description: error.message || "Failed to play audio file.",
        variant: "destructive",
      });
    });
  };

  const pauseExistingVoiceNote = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setExistingAttachments((prev) => prev.map((att) => ({ ...att, isPlaying: false })));
  };

  const viewImage = (imageUrl: string, fileName: string) => {
    // Open image in new tab
    window.open(imageUrl, '_blank');
  };

  const downloadAttachment = (attachment: Attachment) => {
    if (!attachment.full_url) return;
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = attachment.full_url;
    link.download = attachment.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      } else {
        mimeType = "audio/wav";
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalRecordingTime = recordingTime;
        const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);

        const voiceNote: VoiceNote = {
          id: Date.now().toString(),
          blob: audioBlob,
          duration: finalRecordingTime > 0 ? finalRecordingTime : 1,
          name: `Voice Note ${voiceNotes.length + 1}`,
          isPlaying: false,
          audioUrl: audioUrl,
        };

        setVoiceNotes((prev) => [...prev, voiceNote]);
        setTimeout(() => {
          setRecordingTime(0);
        }, 100);
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setRecordingTime(0);
      recorder.start(1000);
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 300000); // Auto-stop after 5 minutes
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const playVoiceNote = (voiceNote: VoiceNote) => {
    if (!voiceNote.audioUrl) {
      toast({
        title: "Playback Error",
        description: "Audio file not found.",
        variant: "destructive",
      });
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));

    const audio = new Audio();
    const newAudioUrl = URL.createObjectURL(voiceNote.blob);
    audio.src = newAudioUrl;
    setCurrentAudio(audio);

    setVoiceNotes((prev) =>
      prev.map((vn) => ({
        ...vn,
        isPlaying: vn.id === voiceNote.id,
      }))
    );

    audio.onended = () => {
      setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));
      setCurrentAudio(null);
      URL.revokeObjectURL(newAudioUrl);
    };

    audio.onerror = () => {
      setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));
      setCurrentAudio(null);
      URL.revokeObjectURL(newAudioUrl);
    };

    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
      setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));
      setCurrentAudio(null);
      URL.revokeObjectURL(newAudioUrl);
    });
  };

  const pauseVoiceNote = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));
  };

  const removeVoiceNote = (index: number) => {
    const voiceNote = voiceNotes[index];
    if (voiceNote.audioUrl) {
      try {
        URL.revokeObjectURL(voiceNote.audioUrl);
      } catch (error) {
        console.error("Error revoking blob URL:", error);
      }
    }
    setVoiceNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (!currentUser) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("id", bug.id);
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("expected_result", values.expected_result || "");
      formData.append("actual_result", values.actual_result || "");
      formData.append("priority", values.priority);
      formData.append("status", values.status);
      formData.append("project_id", bug.project_id);

      // Add new screenshots
      screenshots.forEach((file) => {
        formData.append(`screenshots[]`, file);
      });

      // Add other new files
      files.forEach((file) => {
        formData.append(`files[]`, file);
      });

      // Add voice notes
      voiceNotes.forEach((voiceNote) => {
        const fileExtension = voiceNote.blob.type.includes("webm")
          ? "webm"
          : voiceNote.blob.type.includes("mp4")
          ? "mp4"
          : "wav";
        formData.append(
          `voice_notes[]`,
          voiceNote.blob,
          `${voiceNote.name}.${fileExtension}`
        );
      });

      // Add attachments to delete
      if (attachmentsToDelete.length > 0) {
        formData.append("attachments_to_delete", JSON.stringify(attachmentsToDelete));
      }

      const response = await apiClient.post<ApiResponse<Bug>>(
        "/bugs/update.php",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000, // 60 second timeout for file uploads
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update bug");
      }

      // Send notification if status changed to "fixed"
      if (values.status === "fixed" && bug.status !== "fixed") {
        const updatedBug = {
          ...bug,
          title: values.title,
          description: values.description,
          priority: values.priority,
          status: values.status,
        };

        try {
          await sendBugStatusUpdateNotification(updatedBug);
          toast({
            title: "Success",
            description: "Bug updated and notifications sent",
          });
        } catch (notificationError) {
          toast({
            title: "Success",
            description: "Bug updated successfully (notification failed)",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Bug updated successfully",
        });
      }

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["bug", bug.id] });
      queryClient.invalidateQueries({ queryKey: ["bugs"] });

      setOpen(false);
    } catch (error: any) {
      console.error("Failed to update bug:", error);
      
      let errorMessage = "Failed to update bug. Please try again.";
      
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to edit this bug.";
      } else if (error.response?.status === 404) {
        errorMessage = "Bug not found. It may have been deleted.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bug</DialogTitle>
          <DialogDescription>
            Update the bug details and add or remove attachments.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title Field with Character Counter */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bug Title</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={TITLE_MAX} />
                  </FormControl>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Keep it concise and specific</span>
                    <span className={field.value.length > TITLE_MAX * 0.9 ? 'text-orange-600 font-semibold' : ''}>
                      {field.value.length}/{TITLE_MAX}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field with Character Counter */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} maxLength={DESCRIPTION_MAX} />
                  </FormControl>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Describe the bug in detail</span>
                    <span className={field.value.length > DESCRIPTION_MAX * 0.9 ? 'text-blue-600 font-semibold' : ''}>
                      {field.value.length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expected Result Field with Character Counter */}
            <FormField
              control={form.control}
              name="expected_result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Result (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3} 
                      maxLength={EXPECTED_RESULT_MAX} 
                      placeholder="What should have happened?" 
                      {...field} 
                    />
                  </FormControl>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Describe expected behavior</span>
                    <span className={field.value && field.value.length > EXPECTED_RESULT_MAX * 0.9 ? 'text-green-600 font-semibold' : ''}>
                      {field.value?.length || 0}/{EXPECTED_RESULT_MAX}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actual Result Field with Character Counter */}
            <FormField
              control={form.control}
              name="actual_result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Result (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3} 
                      maxLength={ACTUAL_RESULT_MAX} 
                      placeholder="What actually happened?" 
                      {...field} 
                    />
                  </FormControl>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Describe actual behavior</span>
                    <span className={field.value && field.value.length > ACTUAL_RESULT_MAX * 0.9 ? 'text-red-600 font-semibold' : ''}>
                      {field.value?.length || 0}/{ACTUAL_RESULT_MAX}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority Field */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Low Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Medium Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>High Priority</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Field */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachments Section */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-semibold">Attachments</Label>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={screenshotInputRef}
                onChange={handleScreenshotChange}
                accept="image/*"
                className="hidden"
                multiple
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />

              <div className="grid gap-4 md:grid-cols-3">
                {/* Screenshots section */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-20 w-full flex flex-col items-center justify-center border-2 border-dashed"
                    onClick={handleScreenshotClick}
                  >
                    <ImagePlus className="h-5 w-5 mb-1" />
                    <span className="text-sm">Add Screenshots</span>
                  </Button>
                  {screenshots.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-blue-700 dark:text-blue-400">New Screenshots ({screenshots.length})</Label>
                      {screenshots.map((file, index) => (
                        <div key={index} className="relative rounded border p-2 group">
                          {file.preview && (
                            <img src={file.preview} alt={`Screenshot ${index + 1}`} className="h-16 w-full object-cover rounded" />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-5 w-5 absolute -top-1 -right-1"
                            onClick={() => removeScreenshot(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Files section */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-20 w-full flex flex-col items-center justify-center border-2 border-dashed"
                    onClick={handleFileClick}
                  >
                    <Paperclip className="h-5 w-5 mb-1" />
                    <span className="text-sm">Attach Files</span>
                  </Button>
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-700 dark:text-green-400">New Files ({files.length})</Label>
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between rounded border p-2 text-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <File className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate text-xs">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voice Notes section */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    className={`h-20 w-full flex flex-col items-center justify-center ${
                      isRecording ? "animate-pulse" : "border-2 border-dashed"
                    }`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSubmitting}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-5 w-5 mb-1" />
                        <span className="text-sm">Stop Recording</span>
                        <span className="text-xs mt-1">{formatTime(recordingTime)}</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5 mb-1" />
                        <span className="text-sm">Record Voice</span>
                      </>
                    )}
                  </Button>
                  {voiceNotes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-purple-700 dark:text-purple-400">New Voice Notes ({voiceNotes.length})</Label>
                      {voiceNotes.map((voiceNote, index) => (
                        <div key={voiceNote.id} className="flex items-center justify-between rounded border p-2 text-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Volume2 className="h-4 w-4 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs">{voiceNote.name}</div>
                              <div className="text-xs text-gray-500">{formatTime(voiceNote.duration)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                if (voiceNote.isPlaying) {
                                  pauseVoiceNote();
                                } else {
                                  playVoiceNote(voiceNote);
                                }
                              }}
                            >
                              {voiceNote.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeVoiceNote(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Attachments - Separated by Type */}
              {existingAttachments.length > 0 && (() => {
                const voiceNoteAttachments = existingAttachments.filter(att => att.file_type.startsWith("audio/"));
                const screenshotAttachments = existingAttachments.filter(att => att.file_type.startsWith("image/"));
                const otherAttachments = existingAttachments.filter(att => 
                  !att.file_type.startsWith("audio/") && !att.file_type.startsWith("image/")
                );

                return (
                  <div className="border-t pt-4 space-y-6">
                    {/* Voice Notes Section */}
                    {voiceNoteAttachments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded">
                            <Volume2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                            Existing Voice Notes ({voiceNoteAttachments.length})
                          </Label>
                        </div>
                        <div className="space-y-2">
                          {voiceNoteAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-3 rounded-lg border border-purple-200 dark:border-purple-800 p-3 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors">
                              <div className="h-12 w-12 flex items-center justify-center bg-purple-100 dark:bg-purple-900/40 rounded-lg flex-shrink-0">
                                <Volume2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                  {attachment.file_name}
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                  Voice Note
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-purple-200 dark:hover:bg-purple-800 hover:text-purple-700 dark:hover:text-purple-300"
                                  onClick={() => {
                                    if (attachment.isPlaying) {
                                      pauseExistingVoiceNote();
                                    } else {
                                      playExistingVoiceNote(attachment);
                                    }
                                  }}
                                  title={attachment.isPlaying ? "Pause" : "Play"}
                                >
                                  {attachment.isPlaying ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-600 dark:hover:text-green-400"
                                  onClick={() => downloadAttachment(attachment)}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400"
                                  onClick={() => removeExistingAttachment(attachment.id)}
                                  title="Remove"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Screenshots Section */}
                    {screenshotAttachments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                            <FileImage className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                            Existing Screenshots ({screenshotAttachments.length})
                          </Label>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {screenshotAttachments.map((attachment) => (
                            <div key={attachment.id} className="group relative rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                              <div 
                                className="relative aspect-video bg-gray-100 dark:bg-gray-800 cursor-pointer"
                                onClick={() => viewImage(attachment.full_url!, attachment.file_name)}
                              >
                                <img
                                  src={attachment.full_url}
                                  alt={attachment.file_name}
                                  className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<svg class="h-12 w-12 text-gray-400 m-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-6 w-6 text-white drop-shadow-lg" />
                                </div>
                              </div>
                              <div className="p-2 bg-white dark:bg-gray-900">
                                <div className="truncate text-xs font-medium text-gray-900 dark:text-white">
                                  {attachment.file_name}
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-blue-600 dark:text-blue-400">Screenshot</span>
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadAttachment(attachment);
                                      }}
                                      title="Download"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeExistingAttachment(attachment.id);
                                      }}
                                      title="Remove"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Attachments Section */}
                    {otherAttachments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded">
                            <File className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                            Existing Attachments ({otherAttachments.length})
                          </Label>
                        </div>
                        <div className="space-y-2">
                          {otherAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <div className="h-12 w-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                                <File className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                  {attachment.file_name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {attachment.file_type || 'File'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-600 dark:hover:text-green-400"
                                  onClick={() => downloadAttachment(attachment)}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400"
                                  onClick={() => removeExistingAttachment(attachment.id)}
                                  title="Remove"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBugDialog;
