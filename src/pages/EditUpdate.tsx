import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
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
import { ArrowLeft, ImagePlus, Paperclip, File, X, Calendar, Clock, FileImage, CalendarDays } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { apiClient } from "@/lib/axios";

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

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["feature", "updation", "maintenance"], {
    required_error: "Please select an update type",
  }),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "approved", "declined"]).optional(),
  project_id: z.string().min(1, "Project is required"),
  project_name: z.string().optional(),
  expected_date: z.string().optional(),
  expected_time: z.string().optional(),
});

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const EditUpdate = () => {
  const navigate = useNavigate();
  const { updateId } = useParams<{ updateId: string }>();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
          toast({
            title: "Error",
            description: "You do not have permission to edit this update.",
            variant: "destructive",
          });
          navigate(currentUser?.role ? `/${currentUser.role}/updates` : "/updates");
          return;
        }
        const data = await response.json();
        if (data.success) {
          form.reset({
            title: data.data.title,
            type: data.data.type,
            description: data.data.description,
            status: data.data.status || "pending",
            project_id: data.data.project_id || "",
            project_name: data.data.project_name || "",
            expected_date: data.data.expected_date || "",
            expected_time: data.data.expected_time || "",
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
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch update",
          variant: "destructive",
        });
        navigate(currentUser?.role ? `/${currentUser.role}/updates` : "/updates");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUpdate();
  }, [updateId, form, navigate, currentUser]);

  const onSubmit = (values) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
        <section className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="flex items-center text-muted-foreground hover:text-foreground"
              onClick={() => navigate(-1)}
              disabled
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Loading...</CardTitle>
              <CardDescription>Please wait while we load the update details</CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
      <section className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="flex items-center text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Edit Update</CardTitle>
            <CardDescription>
              Modify the update details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canEdit ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="mb-2">You do not have permission to edit this update.</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <FormControl>
                          <Input
                            value={form.getValues('project_name') || "BugRicer Project"}
                            disabled
                            readOnly
                          />
                        </FormControl>
                        <FormDescription>
                          The project this update belongs to
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter update title"
                            {...field}
                            disabled={isSubmitting || !canEdit}
                          />
                        </FormControl>
                        <FormDescription>
                          A clear and concise title for the update
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting || !canEdit}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select update type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="updation">Updation</SelectItem>
                            <SelectItem value="feature">Feature</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The type of update
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Status Dropdown for Admins */}
                  {currentUser?.role === "admin" && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isSubmitting || !canEdit}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Set the status of this update
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter update description"
                            className="min-h-[120px]"
                            {...field}
                            disabled={isSubmitting || !canEdit}
                          />
                        </FormControl>
                        <FormDescription>
                          Detailed description of the update
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expected_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                          <div className="p-1 bg-indigo-500 rounded-lg">
                            <CalendarDays className="h-3 w-3 text-white" />
                          </div>
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
                        <FormDescription className="text-sm text-gray-600 dark:text-gray-400">
                          The date by which this update is expected to be completed.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expected_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                          <div className="p-1 bg-teal-500 rounded-lg">
                            <Clock className="h-3 w-3 text-white" />
                          </div>
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
                        <FormDescription className="text-sm text-gray-600 dark:text-gray-400">
                          The time by which this update is expected to be completed.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Attachments Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
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
                        <Button type="button" variant="outline" className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-300 rounded-xl group" onClick={handleScreenshotClick} disabled={isSubmitting || !canEdit}>
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                            <ImagePlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Add Screenshots</span>
                        </Button>
                        {(existingScreenshots.length > 0 || screenshots.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Screenshots ({existingScreenshots.length + screenshots.length})</Label>
                              <Button type="button" variant="ghost" size="sm" onClick={clearAllScreenshots} className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400" disabled={isSubmitting || !canEdit}>Clear New</Button>
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
                                  <Button type="button" variant="destructive" size="icon" className="h-6 w-6 absolute -top-1 -right-1 opacity-80 hover:opacity-100 shadow-lg" onClick={() => removeExistingScreenshot(attachment.id)} disabled={isSubmitting || !canEdit}>
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
                                  <Button type="button" variant="destructive" size="icon" className="h-6 w-6 absolute -top-1 -right-1 opacity-80 hover:opacity-100 shadow-lg" onClick={() => removeScreenshot(index)} disabled={isSubmitting || !canEdit}>
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
                        <Button type="button" variant="outline" className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-all duration-300 rounded-xl group" onClick={handleFileClick} disabled={isSubmitting || !canEdit}>
                          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                            <Paperclip className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Attach Files</span>
                        </Button>
                        {(existingFiles.length > 0 || files.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Files ({existingFiles.length + files.length})</Label>
                              <Button type="button" variant="ghost" size="sm" onClick={clearAllFiles} className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400" disabled={isSubmitting || !canEdit}>Clear New</Button>
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
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400" onClick={() => removeExistingFile(attachment.id)} disabled={isSubmitting || !canEdit}>
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
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400" onClick={() => removeFile(index)} disabled={isSubmitting || !canEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Voice Notes section */}
                      <div className="space-y-4">
                        <WhatsAppVoiceRecorder
                          onComplete={handleVoiceRecorderComplete}
                          onCancel={() => console.log("Voice recording cancelled")}
                          disabled={isSubmitting || !canEdit}
                        />
                        {(existingVoiceNotes.length > 0 || voiceNotes.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Voice Notes ({existingVoiceNotes.length + voiceNotes.length})</Label>
                              <Button type="button" variant="ghost" size="sm" onClick={clearAllVoiceNotes} className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400" disabled={isSubmitting || !canEdit}>Clear New</Button>
                            </div>
                            <div className="space-y-2">
                              {existingVoiceNotes.map((attachment) => (
                                <div key={attachment.id} className="relative">
                                  <WhatsAppVoiceMessage
                                    id={attachment.id}
                                    audioSource={attachment.full_url || ''}
                                    duration={attachment.duration || 0}
                                    waveform={[]}
                                    onRemove={() => removeExistingVoiceNote(attachment.id)}
                                    isActive={activeVoiceNoteId === attachment.id}
                                    onPlay={(id) => setActiveVoiceNoteId(id)}
                                    onPause={(id) => setActiveVoiceNoteId(null)}
                                    onEnded={() => setActiveVoiceNoteId(null)}
                                  />
                                </div>
                              ))}
                              {voiceNotes.map((voiceNote, index) => {
                                const voiceId = voiceNote.id;
                                return (
                                  <WhatsAppVoiceMessage
                                    key={voiceId}
                                    id={voiceId}
                                    audioSource={voiceNote.blob}
                                    duration={voiceNote.duration}
                                    waveform={voiceNote.waveform}
                                    onRemove={() => removeVoiceNote(index)}
                                    isActive={activeVoiceNoteId === voiceId}
                                    onPlay={(id) => setActiveVoiceNoteId(id)}
                                    onPause={(id) => setActiveVoiceNoteId(null)}
                                    onEnded={() => setActiveVoiceNoteId(null)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting || !canEdit}>
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default EditUpdate; 