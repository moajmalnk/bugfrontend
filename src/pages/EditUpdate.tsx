import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ImagePlus, Paperclip, File, X, FileImage, Edit2, FolderOpen, Bell, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { buildAudioUrl } from "@/lib/mediaUrls";
import { apiClient } from "@/lib/axios";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

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

interface ExistingAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  duration?: number;
  full_url?: string;
}

const formSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`),
    type: z.enum(["feature", "updation", "maintenance"], {
      required_error: "Please select an update type",
    }),
    description: z
      .string()
      .min(1, "Description is required")
      .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
    status: z.enum(["pending", "approved", "declined"]).optional(),
    project_id: z.string().min(1, "Project is required"),
    project_name: z.string().optional(),
    expected_date: z.string().optional(),
    expected_time: z.string().optional(),
    calculated_hours: z.string().optional(),
    update_priority: z.enum(["high", "medium", "low", "none"]).optional(),
  })
  .superRefine((data, ctx) => {
    const raw = (data.calculated_hours || "").trim();
    if (raw !== "") {
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid non-negative number of hours",
          path: ["calculated_hours"],
        });
      }
    }
  });

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const EditUpdate = () => {
  const navigate = useNavigate();
  const { updateId } = useParams<{ updateId: string }>();
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";
  const backUrl = `/${role}/updates/${updateId}`;
  const canSetPlanningFields =
    currentUser?.role === "admin" || currentUser?.role === "developer";
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [canEdit, setCanEdit] = useState(true);
  
  // File management state
  const [screenshots, setScreenshots] = useState<FileWithPreview[]>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState<string | null>(null);
  
  // Existing attachments
  const [existingScreenshots, setExistingScreenshots] = useState<ExistingAttachment[]>([]);
  const [existingFiles, setExistingFiles] = useState<ExistingAttachment[]>([]);
  const [existingVoiceNotes, setExistingVoiceNotes] = useState<ExistingAttachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  
  // Refs for file inputs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch projects the user is a member of
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentUser?.username],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/projects/getAll.php`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) return data.data;
      return [];
    },
    enabled: !!currentUser,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: undefined,
      description: "",
      status: "pending",
      project_id: "",
      project_name: "",
      expected_date: "",
      expected_time: "",
      calculated_hours: "",
      update_priority: "none",
    },
  });

  // File handling functions (similar to NewUpdate.tsx)
  const handleScreenshotClick = () => screenshotInputRef.current?.click();
  const handleFileClick = () => fileInputRef.current?.click();

  const handleScreenshotChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles).map((file) =>
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      })
    );
    setScreenshots((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeScreenshot = (index: number) => {
    const newScreenshots = [...screenshots];
    if (newScreenshots[index].preview) {
      URL.revokeObjectURL(newScreenshots[index].preview!);
    }
    newScreenshots.splice(index, 1);
    setScreenshots(newScreenshots);
  };

  const removeExistingScreenshot = (attachmentId: string) => {
    setExistingScreenshots((prev) => prev.filter((a) => a.id !== attachmentId));
    setAttachmentsToDelete((prev) => [...prev, attachmentId]);
  };

  const clearAllScreenshots = () => {
    screenshots.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setScreenshots([]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles).map((file) =>
      Object.assign(file, {
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })
    );
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const removeExistingFile = (attachmentId: string) => {
    setExistingFiles((prev) => prev.filter((a) => a.id !== attachmentId));
    setAttachmentsToDelete((prev) => [...prev, attachmentId]);
  };

  const clearAllFiles = () => {
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
  };

  const handleVoiceRecorderComplete = ({ blob, duration, waveform }: RecordedVoiceNote) => {
    const voiceId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newVoiceNote: VoiceNote = {
      id: voiceId,
      blob,
      duration,
      name: `voice_note_${Date.now()}.webm`,
      isPlaying: false,
      waveform: waveform || [],
    };
    setVoiceNotes((prev) => [...prev, newVoiceNote]);
  };

  const removeVoiceNote = (index: number) => {
    const newVoiceNotes = [...voiceNotes];
    if (newVoiceNotes[index].audioUrl) {
      URL.revokeObjectURL(newVoiceNotes[index].audioUrl!);
    }
    newVoiceNotes.splice(index, 1);
    setVoiceNotes(newVoiceNotes);
  };

  const removeExistingVoiceNote = (attachmentId: string) => {
    setExistingVoiceNotes((prev) => prev.filter((a) => a.id !== attachmentId));
    setAttachmentsToDelete((prev) => [...prev, attachmentId]);
  };

  const clearAllVoiceNotes = () => {
    voiceNotes.forEach((voiceNote) => {
      if (voiceNote.audioUrl) URL.revokeObjectURL(voiceNote.audioUrl);
    });
    setVoiceNotes([]);
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      screenshots.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
      files.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
      voiceNotes.forEach((voiceNote) => {
        if (voiceNote.audioUrl) URL.revokeObjectURL(voiceNote.audioUrl);
      });
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const hasFiles = screenshots.length > 0 || files.length > 0 || voiceNotes.length > 0;
      const hasDeletions = attachmentsToDelete.length > 0;

      if (hasFiles || hasDeletions) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("type", values.type);
        formData.append("description", values.description);
        formData.append("project_id", values.project_id);
        if (values.status) formData.append("status", values.status);
        if (values.expected_date) formData.append("expected_date", values.expected_date);
        if (values.expected_time) formData.append("expected_time", values.expected_time);
        if (canSetPlanningFields) {
          const hrs = (values.calculated_hours || "").trim();
          formData.append("calculated_hours", hrs === "" ? "" : hrs);
          formData.append(
            "update_priority",
            values.update_priority && values.update_priority !== "none" ? values.update_priority : ""
          );
        }
        if (hasDeletions) {
          formData.append("attachments_to_delete", JSON.stringify(attachmentsToDelete));
        }

        screenshots.forEach((file) => {
          formData.append("screenshots[]", file);
        });
        files.forEach((file) => {
          formData.append("files[]", file);
        });
        voiceNotes.forEach((voiceNote, index) => {
          formData.append("voice_notes[]", voiceNote.blob, voiceNote.name);
          formData.append(`voice_note_duration_${index}`, voiceNote.duration.toString());
        });

        const response = await apiClient.post(`${API_BASE}/update.php?id=${updateId}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        return response.data;
      } else {
        // Use JSON for text-only updates
        const response = await fetch(`${API_BASE}/update.php?id=${updateId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(values),
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Success", description: "Update updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["updates"] });
        queryClient.invalidateQueries({ queryKey: ["update", updateId] });
        navigate(currentUser?.role ? `/${currentUser.role}/updates/${updateId}` : `/updates/${updateId}`);
      } else {
        let errorMsg = data.message || "Failed to update update";
        if (data.message && (data.message.includes("Unauthorized") || data.message.includes("not a member") || data.message.includes("permission"))) {
          errorMsg = "You do not have permission to update this update.";
        }
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      let errorMsg = "Failed to update update";
      if (error?.message && (error.message.includes("401") || error.message.includes("403"))) {
        errorMsg = "You do not have permission to update this update.";
      }
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  });

  useEffect(() => {
    const fetchUpdate = async () => {
      try {
        const response = await fetch(`${API_BASE}/get.php?id=${updateId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.status === 403 || response.status === 404) {
          setLoadError("You do not have permission to edit this update.");
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        if (data.success) {
          const pr = data.data.update_priority;
          const priorityOk =
            pr && ["high", "medium", "low"].includes(String(pr).toLowerCase())
              ? String(pr).toLowerCase()
              : "none";
          const ch = data.data.calculated_hours;
          form.reset({
            title: data.data.title,
            type: data.data.type,
            description: data.data.description,
            status: data.data.status || "pending",
            project_id: data.data.project_id || "",
            project_name: data.data.project_name || "",
            expected_date: data.data.expected_date || "",
            expected_time: data.data.expected_time || "",
            calculated_hours:
              ch !== null && ch !== undefined && String(ch).trim() !== ""
                ? String(ch)
                : "",
            update_priority: priorityOk as "high" | "medium" | "low" | "none",
          });
          
          // Load existing attachments
          if (data.data.screenshots) {
            setExistingScreenshots(data.data.screenshots);
          }
          if (data.data.files) {
            setExistingFiles(data.data.files);
          }
          if (data.data.voice_notes) {
            setExistingVoiceNotes(data.data.voice_notes);
          }
          
          // Only allow editing if admin or creator
          if (currentUser?.role !== "admin" && data.data.created_by !== currentUser?.username) {
            setCanEdit(false);
          }
        } else {
          throw new Error(data.message || "Failed to fetch update");
        }
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to fetch update"
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchUpdate();
  }, [updateId, form, navigate, currentUser]);

  const onSubmit = (values) => {
    mutation.mutate(values);
  };

  const watchedTitle = form.watch("title");
  const watchedProjectName = form.watch("project_name");
  const isSaving = mutation.isPending;

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w mx-auto space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w mx-auto">
          <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Could not load update</h3>
            <p className="text-muted-foreground mb-6">{loadError}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w mx-auto space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="flex items-center text-muted-foreground hover:text-foreground p-2 shrink-0"
                    onClick={() => navigate(backUrl)}
                    disabled={isSaving}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shrink-0">
                    <Edit2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Edit Update
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl break-words">
                  Update details for{" "}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {watchedTitle || "this update"}
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {watchedProjectName && (
                    <div className="flex h-12 min-w-[12rem] items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                      <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                        <FolderOpen className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                        {watchedProjectName}
                      </span>
                    </div>
                  )}
                  {updateId && (
                    <div className="flex h-12 min-w-[12rem] items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                      <div className="p-1.5 bg-gray-500 dark:bg-gray-600 rounded-lg shrink-0">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300 truncate">
                        {updateId.slice(0, 8)}…
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="p-6 sm:p-8 pb-2">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0">
                    <File className="h-5 w-5 text-white" />
                  </div>
                  Update Form
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
                  Update information, status, planning fields, and attachments
                </CardDescription>
              </CardHeader>

              {!canEdit ? (
                <CardContent className="p-6 sm:p-8 pt-4">
                  <div className="text-center text-muted-foreground py-8">
                    <p className="mb-2">You do not have permission to edit this update.</p>
                    <Button variant="outline" onClick={() => navigate(backUrl)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Update
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8 p-6 sm:p-8 pt-4">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full" />
                          Project
                        </Label>
                        <Input
                          value={watchedProjectName || "BugRicer Project"}
                          disabled
                          readOnly
                          className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          The project this update belongs to
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-full" />
                              Title
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter update title"
                                maxLength={TITLE_MAX}
                                className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                                {...field}
                                disabled={isSaving || !canEdit}
                              />
                            </FormControl>
                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">A clear and concise title for the update</span>
                              <span className={field.value.length > TITLE_MAX * 0.9 ? "text-orange-600 font-semibold" : "font-semibold"}>
                                {field.value.length}/{TITLE_MAX}
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full" />
                                Type
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isSaving || !canEdit}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                                    <SelectValue placeholder="Select update type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="updation">Updation</SelectItem>
                                  <SelectItem value="feature">Feature</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {currentUser?.role === "admin" && (
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
                                  disabled={isSaving || !canEdit}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="declined">Declined</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

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
                              <Textarea
                                placeholder="Enter update description"
                                rows={5}
                                maxLength={DESCRIPTION_MAX}
                                className="min-h-[150px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                                {...field}
                                disabled={isSaving || !canEdit}
                              />
                            </FormControl>
                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Detailed description of the update</span>
                              <span className={field.value.length > DESCRIPTION_MAX * 0.9 ? "text-blue-600 font-semibold" : "font-semibold"}>
                                {field.value.length}/{DESCRIPTION_MAX}
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="expected_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" />
                                Expected Completion Date
                              </FormLabel>
                              <FormControl>
                                <DatePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select expected completion date"
                                  className="h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                  disableFuture={false}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="expected_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full" />
                                Expected Completion Time
                              </FormLabel>
                              <FormControl>
                                <TimePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select expected completion time"
                                  className="h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {canSetPlanningFields && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="calculated_hours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" />
                                  Calculated Hours
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.25}
                                    placeholder="e.g. 4 or 2.5"
                                    className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                                    {...field}
                                    disabled={isSaving || !canEdit}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="update_priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full" />
                                  Update Priority
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? "none"}
                                  disabled={isSaving || !canEdit}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">Not set</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" />
                            Attachments
                          </Label>
                        </div>

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

                    {/* Grid for attachments */}
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      {/* Screenshots section */}
                      <div className="space-y-4">
                        <Button type="button" variant="outline" className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-300 rounded-xl group" onClick={handleScreenshotClick} disabled={isSaving || !canEdit}>
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                            <ImagePlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Add Screenshots</span>
                        </Button>
                        {(existingScreenshots.length > 0 || screenshots.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Screenshots ({existingScreenshots.length + screenshots.length})</Label>
                              <Button type="button" variant="ghost" size="sm" onClick={clearAllScreenshots} className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400" disabled={isSaving || !canEdit}>Clear New</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {existingScreenshots.map((attachment) => (
                                <div key={attachment.id} className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-2 group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
                                  {attachment.full_url ? (
                                    <img src={attachment.full_url} alt={attachment.file_name} className="h-24 w-full object-cover rounded-lg" />
                                  ) : (
                                    <div className="h-24 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                      <FileImage className="h-8 w-8 text-gray-400" />
                                    </div>
                                  )}
                                  <Button type="button" variant="destructive" size="icon" className="h-6 w-6 absolute -top-1 -right-1 opacity-80 hover:opacity-100 shadow-lg" onClick={() => removeExistingScreenshot(attachment.id)} disabled={isSaving || !canEdit}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <div className="text-xs truncate mt-2 px-1 text-gray-600 dark:text-gray-400 font-medium">{attachment.file_name}</div>
                                </div>
                              ))}
                              {screenshots.map((file, index) => (
                                <div key={index} className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-2 group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
                                  {file.preview ? (
                                    <img src={file.preview} alt={`Screenshot ${index + 1}`} className="h-24 w-full object-cover rounded-lg" />
                                  ) : (
                                    <div className="h-24 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                      <FileImage className="h-8 w-8 text-gray-400" />
                                    </div>
                                  )}
                                  <Button type="button" variant="destructive" size="icon" className="h-6 w-6 absolute -top-1 -right-1 opacity-80 hover:opacity-100 shadow-lg" onClick={() => removeScreenshot(index)} disabled={isSaving || !canEdit}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <div className="text-xs truncate mt-2 px-1 text-gray-600 dark:text-gray-400 font-medium">{file.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Files section */}
                      <div className="space-y-4">
                        <Button type="button" variant="outline" className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-all duration-300 rounded-xl group" onClick={handleFileClick} disabled={isSaving || !canEdit}>
                          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                            <Paperclip className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Attach Files</span>
                        </Button>
                        {(existingFiles.length > 0 || files.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Files ({existingFiles.length + files.length})</Label>
                              <Button type="button" variant="ghost" size="sm" onClick={clearAllFiles} className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400" disabled={isSaving || !canEdit}>Clear New</Button>
                            </div>
                            <div className="space-y-2">
                              {existingFiles.map((attachment) => (
                                <div key={attachment.id} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
                                  <div className="flex items-center space-x-3 overflow-hidden">
                                    {attachment.full_url && attachment.file_type?.startsWith('image/') ? (
                                      <img src={attachment.full_url} alt={attachment.file_name} className="h-10 w-10 object-cover rounded-lg" />
                                    ) : (
                                      <div className="h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                        <File className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium text-gray-700 dark:text-gray-300">{attachment.file_name}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ''}</div>
                                    </div>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400" onClick={() => removeExistingFile(attachment.id)} disabled={isSaving || !canEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
                                  <div className="flex items-center space-x-3 overflow-hidden">
                                    {file.preview ? (
                                      <img src={file.preview} alt={`File preview ${index + 1}`} className="h-10 w-10 object-cover rounded-lg" />
                                    ) : (
                                      <div className="h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                        <File className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium text-gray-700 dark:text-gray-300">{file.name}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400" onClick={() => removeFile(index)} disabled={isSaving || !canEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Voice Notes section - same UX as New Bug */}
                      <div className="space-y-4">
                        <WhatsAppVoiceRecorder
                          onComplete={handleVoiceRecorderComplete}
                          onCancel={() =>
                            toast({
                              title: "Recording cancelled",
                              description: "Hold the mic to record a new voice note.",
                            })
                          }
                          disabled={isSaving || !canEdit}
                          maxDuration={300}
                        />
                        {(existingVoiceNotes.length > 0 || voiceNotes.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Voice Notes ({existingVoiceNotes.length + voiceNotes.length})
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAllVoiceNotes}
                                className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                disabled={isSaving || !canEdit}
                              >
                                Clear New
                              </Button>
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {existingVoiceNotes.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800"
                                >
                                  <WhatsAppVoiceMessage
                                    id={attachment.id}
                                    audioSource={buildAudioUrl(attachment.file_path, attachment.full_url)}
                                    duration={attachment.duration || 0}
                                    waveform={[]}
                                    accent="sent"
                                    isActive={activeVoiceNoteId === attachment.id}
                                    onPlay={(id) => setActiveVoiceNoteId(id)}
                                    onPause={(id) => {
                                      if (id === activeVoiceNoteId) {
                                        setActiveVoiceNoteId(null);
                                      }
                                    }}
                                    onRemove={() => {
                                      if (activeVoiceNoteId === attachment.id) {
                                        setActiveVoiceNoteId(null);
                                      }
                                      removeExistingVoiceNote(attachment.id);
                                    }}
                                  />
                                </div>
                              ))}
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
                                      isActive={activeVoiceNoteId === voiceId}
                                      onPlay={(id) => setActiveVoiceNoteId(id)}
                                      onPause={(id) => {
                                        if (id === activeVoiceNoteId) {
                                          setActiveVoiceNoteId(null);
                                        }
                                      }}
                                      onRemove={() => {
                                        if (activeVoiceNoteId === voiceId) {
                                          setActiveVoiceNoteId(null);
                                        }
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
                      </div>
                    </CardContent>

                    <CardFooter className="p-6 sm:p-8 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex flex-col sm:flex-row justify-between gap-4 w-full">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(backUrl)}
                          disabled={isSaving}
                          className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSaving || !canEdit}
                          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </CardFooter>
                  </form>
                </Form>
              )}
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
};

export default EditUpdate; 