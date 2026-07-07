import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Bug, BugLevel, BugPriority, BugStatus, Project } from "@/types";
import { cn } from "@/lib/utils";
import { ENV } from "@/lib/env";
import {
  BUG_LEVEL_FORM_OPTIONS,
  isAlreadyRaised,
} from "@/lib/bugMetaUtils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  File,
  FileImage,
  Paperclip,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { ScreenshotDropZone } from "@/components/attachments/ScreenshotDropZone";

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
  waveform?: number[];
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

interface EditBugFormProps {
  bug: Bug;
  onCancel: () => void;
  onSuccess?: () => void;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const EditBugForm = ({ bug, onCancel, onSuccess }: EditBugFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // File uploads
  const [screenshots, setScreenshots] = useState<FileWithPreview[]>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);

  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [alreadyRaised, setAlreadyRaised] = useState(() =>
    isAlreadyRaised(bug.already_raised)
  );
  const [bugLevel, setBugLevel] = useState<BugLevel>(
    bug.bug_level || "normal"
  );
  const [projectId, setProjectId] = useState(bug.project_id);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  // Refs for file inputs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["projects", currentUser?.id],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get<ApiResponse<Project[]>>(
        `${ENV.API_URL}/projects/getAll.php`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) return response.data.data;
      throw new Error(response.data.message || "Failed to fetch projects");
    },
    enabled: !!currentUser,
  });

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

  // Reset form and load existing attachments when bug changes
  useEffect(() => {
    form.reset({
      title: bug.title,
      description: bug.description,
      expected_result: (bug as any).expected_result || "",
      actual_result: (bug as any).actual_result || "",
      priority: bug.priority as BugPriority,
      status: bug.status as BugStatus,
    });
    setAlreadyRaised(isAlreadyRaised(bug.already_raised));
    setBugLevel(bug.bug_level || "normal");
    setProjectId(bug.project_id);

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
  }, [bug, form]);

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

    };
  }, [voiceNotes, screenshots, files]);

  // File handling functions
  const handleScreenshotClick = () => {
    screenshotInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleScreenshotChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addScreenshotFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const addScreenshotFiles = (raw: File[]) => {
    if (raw.length === 0) return;
    const imageFiles = raw.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({
        title: "Images only",
        description: "Please use image files (PNG, JPG, GIF, WebP, …).",
        variant: "destructive",
      });
      return;
    }
    const newFiles = imageFiles as FileWithPreview[];
    newFiles.forEach((file) => {
      file.preview = URL.createObjectURL(file);
    });
    setScreenshots((prev) => [...prev, ...newFiles]);
  };

  const handlePasteScreenshot = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) pasted.push(file);
      }
    }
    if (pasted.length > 0) addScreenshotFiles(pasted);
  };

  const clearAllScreenshots = () => {
    screenshots.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setScreenshots([]);
  };

  const clearAllFiles = () => {
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
  };

  const clearAllVoiceNotes = () => {
    voiceNotes.forEach((voiceNote) => {
      if (voiceNote.audioUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(voiceNote.audioUrl);
      }
    });
    setVoiceNotes([]);
    setActiveVoiceId(null);
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
    setActiveVoiceId((prev) =>
      prev === attachmentId || prev === `existing-${attachmentId}` ? null : prev
    );
    setAttachmentsToDelete((prev) => [...prev, attachmentId]);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
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

  const handleVoiceRecorderComplete = ({
    blob,
    duration,
    waveform,
  }: RecordedVoiceNote) => {
    const existingVoiceNotesCount = existingAttachments.filter((att) =>
      att.file_type.startsWith("audio/")
    ).length;

    const audioUrl = URL.createObjectURL(blob);
    const voiceNote: VoiceNote = {
      id: Date.now().toString(),
      blob,
      duration: Math.max(1, Math.round(duration || 0)),
      name: `Voice Note ${
        existingVoiceNotesCount + voiceNotes.length + 1
      }`,
      isPlaying: false,
      audioUrl,
      waveform,
    };

    setVoiceNotes((prev) => [...prev, voiceNote]);
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
    setActiveVoiceId((prev) =>
      prev === voiceNote.id ? null : prev
    );
    setVoiceNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (!currentUser) {
      return;
    }

    if (!projectId) {
      toast({
        title: "Project required",
        description: "Please select a project for this bug.",
        variant: "destructive",
      });
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
      formData.append("already_raised", alreadyRaised ? "1" : "0");
      formData.append("bug_level", bugLevel);
      formData.append("project_id", projectId);

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

      // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      const response = await apiClient.post<ApiResponse<Bug>>(
        "/bugs/update.php",
        formData,
        {
          timeout: 60000, // 60 second timeout for file uploads
          // Let axios/browser handle Content-Type automatically for FormData
        }
      );
      
      // Log debug info if available
      if ((response.data as any)._debug) {
        console.log('🔧 Update Debug Info:', (response.data as any)._debug);
        console.log('🔧 Files Received Details:', {
          screenshots: (response.data as any)._debug.files_received?.screenshots,
          files: (response.data as any)._debug.files_received?.files,
          voice_notes: (response.data as any)._debug.files_received?.voice_notes,
          has_files: (response.data as any)._debug.files_received?.has_files,
          method: (response.data as any)._debug.method_used
        });
      }
      
      // Also log what we're sending
      console.log('📤 Sending FormData:', {
        screenshots_count: screenshots.length,
        files_count: files.length,
        voice_notes_count: voiceNotes.length,
        formData_keys: Array.from(formData.keys())
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update bug");
      }

      // Update the cache directly with the response data (includes attachments)
      if (response.data.data) {
        queryClient.setQueryData(["bug", bug.id], response.data.data);
      }

      // Send notification if status changed to "fixed"
      if (values.status === "fixed" && bug.status !== "fixed") {
        const updatedBug = response.data.data || {
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

      // Invalidate and refetch queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["bug", bug.id] });
      queryClient.invalidateQueries({ queryKey: ["bugs"] });

      onSuccess?.();
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-8 p-6 sm:p-8 pt-4">
            {/* Title Field with Character Counter */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-full" />
                    Bug Title
                  </FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={TITLE_MAX} className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
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
                  <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" />
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} maxLength={DESCRIPTION_MAX} className="min-h-[150px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
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
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full" />
                    Expected Result
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      maxLength={EXPECTED_RESULT_MAX}
                      placeholder="What should have happened? Describe the expected behavior..."
                      className="min-h-[100px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Describe what you expected to happen</span>
                    <span className={`font-semibold ${(field.value?.length || 0) > EXPECTED_RESULT_MAX * 0.9 ? "text-green-600" : ""}`}>
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
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-red-500 to-pink-600 rounded-full" />
                    Actual Result
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      maxLength={ACTUAL_RESULT_MAX}
                      placeholder="What actually happened? Describe the actual behavior..."
                      className="min-h-[100px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Describe what actually happened instead</span>
                    <span className={`font-semibold ${(field.value?.length || 0) > ACTUAL_RESULT_MAX * 0.9 ? "text-red-600" : ""}`}>
                      {field.value?.length || 0}/{ACTUAL_RESULT_MAX}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project */}
            <div className="space-y-3">
              <Label
                htmlFor="edit-bug-project"
                className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full" />
                Project
              </Label>
              <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-bug-project"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectPickerOpen}
                    className="h-12 w-full justify-between border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <span className="truncate">
                      {projectId
                        ? (projects as Project[])?.find((p) => p.id === projectId)?.name ||
                          bug.project_name ||
                          "Select a project"
                        : "Select a project"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[70]" align="start">
                  <Command>
                    <CommandInput placeholder="Search project..." />
                    <CommandList>
                      <CommandEmpty>No project found.</CommandEmpty>
                      {projectsLoading ? (
                        <CommandGroup>
                          <CommandItem disabled>Loading projects...</CommandItem>
                        </CommandGroup>
                      ) : projectsError ? (
                        <CommandGroup>
                          <CommandItem disabled>Error loading projects</CommandItem>
                        </CommandGroup>
                      ) : (projects as Project[])?.length === 0 ? (
                        <CommandGroup>
                          <CommandItem disabled>No projects available</CommandItem>
                        </CommandGroup>
                      ) : (
                        <CommandGroup>
                          {(projects as Project[])?.map((project: Project) => (
                            <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.id}`}
                              onSelect={() => {
                                setProjectId(project.id);
                                setProjectPickerOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  projectId === project.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {project.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority & Status */}
            <div className="grid gap-6 md:grid-cols-2">
            {/* Priority Field */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full" />
                    Priority
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[60]">
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
                  <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" />
                    Status
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[60]">
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
            </div>

            {/* Already Raised */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" />
                Is this bug already raised?
              </Label>
              <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/15 dark:to-indigo-950/10 p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Mark <span className="font-medium text-gray-700 dark:text-gray-300">Yes</span> if the same issue was reported before
                </p>
                <div
                  className="grid w-full grid-cols-2 gap-2"
                  role="radiogroup"
                  aria-label="Is this bug already raised?"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!alreadyRaised}
                    onClick={() => setAlreadyRaised(false)}
                    className={cn(
                      "h-11 w-full cursor-pointer rounded-lg border text-sm font-semibold transition-all",
                      !alreadyRaised
                        ? "border-emerald-500 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50"
                        : "border-gray-200/80 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={alreadyRaised}
                    onClick={() => setAlreadyRaised(true)}
                    className={cn(
                      "h-11 w-full cursor-pointer rounded-lg border text-sm font-semibold transition-all",
                      alreadyRaised
                        ? "border-amber-500 bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50"
                        : "border-gray-200/80 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Bug Level */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full" />
                Bug Level
              </Label>
              <div className="rounded-xl border border-violet-200/60 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/50 to-purple-50/30 dark:from-violet-950/15 dark:to-purple-950/10 p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Rate how severe the impact feels — from normal workflow issues to utter floap
                </p>
                <div
                  className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="Bug level rating"
                >
                  {BUG_LEVEL_FORM_OPTIONS.map((option) => {
                    const selected = bugLevel === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setBugLevel(option.value)}
                        className={cn(
                          "min-h-12 w-full cursor-pointer flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all",
                          selected
                            ? option.selectedClass
                            : "border-gray-200/80 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <span>{option.label}</span>
                        <span
                          className={cn(
                            "text-[10px] font-normal",
                            selected ? "text-white/90" : "opacity-70"
                          )}
                        >
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" />
                  Attachments
                </Label>
              </div>

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

              {(() => {
                const voiceNoteAttachments = existingAttachments.filter((att) =>
                  att.file_type.startsWith("audio/")
                );
                const screenshotAttachments = existingAttachments.filter((att) =>
                  att.file_type.startsWith("image/")
                );
                const otherAttachments = existingAttachments.filter(
                  (att) =>
                    !att.file_type.startsWith("audio/") &&
                    !att.file_type.startsWith("image/")
                );
                const totalScreenshots =
                  screenshots.length + screenshotAttachments.length;
                const totalFiles = files.length + otherAttachments.length;
                const totalVoiceNotes =
                  voiceNotes.length + voiceNoteAttachments.length;

                return (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {/* Screenshots column */}
                    <div
                      className="space-y-4 min-w-0"
                      tabIndex={0}
                      onPaste={handlePasteScreenshot}
                    >
                      <ScreenshotDropZone
                        onAddFiles={addScreenshotFiles}
                        onOpenPicker={handleScreenshotClick}
                        disabled={isSubmitting}
                      />
                      {totalScreenshots > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                              Screenshots ({totalScreenshots})
                            </Label>
                            {screenshots.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAllScreenshots}
                                className="text-xs shrink-0 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {screenshotAttachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-2 group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                              >
                                <img
                                  src={attachment.full_url}
                                  alt={attachment.file_name}
                                  className="h-24 w-full object-cover rounded-lg cursor-pointer"
                                  onClick={() =>
                                    viewImage(
                                      attachment.full_url!,
                                      attachment.file_name
                                    )
                                  }
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="h-6 w-6 absolute -top-1 -right-1 opacity-80 hover:opacity-100 shadow-lg"
                                  onClick={() =>
                                    removeExistingAttachment(attachment.id)
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <div className="text-xs truncate mt-2 px-1 text-gray-600 dark:text-gray-400 font-medium">
                                  {attachment.file_name}
                                </div>
                              </div>
                            ))}
                            {screenshots.map((file, index) => (
                              <div
                                key={`new-${index}`}
                                className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-2 group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                              >
                                {file.preview ? (
                                  <img
                                    src={file.preview}
                                    alt={`Screenshot ${index + 1}`}
                                    className="h-24 w-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="h-24 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                    <FileImage className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="h-6 w-6 absolute -top-1 -right-1 opacity-80 hover:opacity-100 shadow-lg"
                                  onClick={() => removeScreenshot(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <div className="text-xs truncate mt-2 px-1 text-gray-600 dark:text-gray-400 font-medium">
                                  {file.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Files column */}
                    <div className="space-y-4 min-w-0">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-all duration-300 rounded-xl group"
                        onClick={handleFileClick}
                        disabled={isSubmitting}
                      >
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                          <Paperclip className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Attach Files
                        </span>
                      </Button>
                      {totalFiles > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                              Files ({totalFiles})
                            </Label>
                            {files.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFiles}
                                className="text-xs shrink-0 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {otherAttachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                              >
                                <div className="flex items-center space-x-3 overflow-hidden min-w-0 flex-1">
                                  <div className="h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
                                    <File className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium text-gray-700 dark:text-gray-300">
                                      {attachment.file_name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {attachment.file_type || "File"}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400"
                                  onClick={() =>
                                    removeExistingAttachment(attachment.id)
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {files.map((file, index) => (
                              <div
                                key={`new-${index}`}
                                className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                              >
                                <div className="flex items-center space-x-3 overflow-hidden min-w-0 flex-1">
                                  {file.preview ? (
                                    <img
                                      src={file.preview}
                                      alt={`File preview ${index + 1}`}
                                      className="h-10 w-10 object-cover rounded-lg shrink-0"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
                                      <File className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium text-gray-700 dark:text-gray-300">
                                      {file.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400"
                                  onClick={() => removeFile(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Voice notes column */}
                    <div className="space-y-4 min-w-0">
                      <WhatsAppVoiceRecorder
                        onComplete={handleVoiceRecorderComplete}
                        onCancel={() =>
                          toast({
                            title: "Recording cancelled",
                            description: "Hold the mic to record a new voice note.",
                          })
                        }
                        disabled={isSubmitting}
                        maxDuration={300}
                      />
                      {totalVoiceNotes > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                              Voice Notes ({totalVoiceNotes})
                            </Label>
                            {voiceNotes.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAllVoiceNotes}
                                className="text-xs shrink-0 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {voiceNoteAttachments.map((attachment) => {
                              const messageId = `existing-${attachment.id}`;
                              const audioSource =
                                attachment.full_url ??
                                `${ENV.API_URL}/${attachment.file_path}`;
                              return (
                                <div
                                  key={attachment.id}
                                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800"
                                >
                                  <WhatsAppVoiceMessage
                                    id={messageId}
                                    audioSource={audioSource}
                                    accent="received"
                                    autoPlay
                                    isActive={activeVoiceId === messageId}
                                    onPlay={(id) => setActiveVoiceId(id)}
                                    onPause={(id) => {
                                      if (id === activeVoiceId) setActiveVoiceId(null);
                                    }}
                                    onDownload={() => downloadAttachment(attachment)}
                                    onRemove={() =>
                                      removeExistingAttachment(attachment.id)
                                    }
                                  />
                                </div>
                              );
                            })}
                            {voiceNotes.map((voiceNote, index) => {
                              const voiceId = voiceNote.id;
                              return (
                                <div
                                  key={voiceId}
                                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800"
                                >
                                  <WhatsAppVoiceMessage
                                    id={voiceId}
                                    audioSource={voiceNote.blob}
                                    duration={voiceNote.duration}
                                    waveform={voiceNote.waveform}
                                    accent="sent"
                                    autoPlay
                                    isActive={activeVoiceId === voiceId}
                                    onPlay={(id) => setActiveVoiceId(id)}
                                    onPause={(id) => {
                                      if (id === activeVoiceId) setActiveVoiceId(null);
                                    }}
                                    onRemove={() => {
                                      if (activeVoiceId === voiceId) setActiveVoiceId(null);
                                      removeVoiceNote(index);
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

        </CardContent>
            <CardFooter className="p-6 sm:p-8 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex flex-col sm:flex-row justify-between gap-4 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
  );
};

export default EditBugForm;
export { EditBugForm };
