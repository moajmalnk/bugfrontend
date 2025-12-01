import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useBugs } from "@/context/BugContext";
import { ENV } from "@/lib/env";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { sendNewBugNotification } from "@/services/emailService";
import { notificationService } from "@/services/notificationService";
import { whatsappService } from "@/services/whatsappService";
import { BugPriority, Project } from "@/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/lib/axios";
import {
  ArrowLeft,
  Bug,
  File,
  FileImage,
  ImagePlus,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const NewBug = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preSelectedProjectId = searchParams.get("projectId");
  const { currentUser } = useAuth();
  const { addBug } = useBugs();

  // Get the source path from state or default to '/bugs'
  const redirectPath = location.state?.from || "/bugs";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [projectId, setProjectId] = useState(preSelectedProjectId || "");
  const [priority, setPriority] = useState<BugPriority>("medium");
  const TITLE_MAX = 120;
  const DESCRIPTION_MAX = 2000;
  const EXPECTED_RESULT_MAX = 1000;
  const ACTUAL_RESULT_MAX = 1000;

  // File uploads
  const [screenshots, setScreenshots] = useState<FileWithPreview[]>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState<string | null>(null);

  // Refs for file inputs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    };
  }, [voiceNotes]);

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects", currentUser?.id], // Include user ID in query key to prevent cross-user caching
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get<ApiResponse<Project[]>>(
        `${ENV.API_URL}/projects/getAll.php`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.success) {
        // Backend already handles filtering:
        // - Admins get all projects
        // - Other users (developers, testers) get only projects they are assigned to via project_members table
        // - Impersonation mode is handled correctly by backend
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch projects");
    },
    enabled: !!currentUser, // Only fetch when user is available
  });

  const handleVoiceRecorderComplete = ({
    blob,
    duration,
    waveform,
  }: RecordedVoiceNote) => {
    const audioUrl = URL.createObjectURL(blob);
    const voiceNote: VoiceNote = {
      id: Date.now().toString(),
      blob,
      duration: Math.max(1, Math.round(duration || 0)),
      name: `Voice Note ${voiceNotes.length + 1}`,
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
        console.log("Revoked blob URL for:", voiceNote.name);
      } catch (error) {
        console.error("Error revoking blob URL:", error);
      }
    }
    setActiveVoiceNoteId((prev) => (prev === voiceNote.id ? null : prev));
    setVoiceNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bug name",
        variant: "destructive",
      });
      return;
    }

    if (!projectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("title", name);
      formData.append("description", description);
      formData.append("expected_result", expectedResult);
      formData.append("actual_result", actualResult);
      formData.append("project_id", projectId);
      formData.append("reporter_id", currentUser.id);
      formData.append("priority", priority);
      formData.append("status", "pending");

      // Add screenshots
      screenshots.forEach((file, index) => {
        formData.append(`screenshots[]`, file);
      });

      // Add other files
      files.forEach((file, index) => {
        formData.append(`files[]`, file);
      });

      // Add voice notes
      voiceNotes.forEach((voiceNote, index) => {
        const fileExtension = voiceNote.blob.type.includes("webm")
          ? "webm"
          : voiceNote.blob.type.includes("mp4")
          ? "mp4"
          : "wav";
        
        // Use the Blob directly - FormData.append() can accept Blob with optional filename
        const fileName = `${voiceNote.name || `voice_note_${index + 1}`}.${fileExtension}`;
        
        // Append Blob directly (FormData.append accepts Blob as second parameter)
        // Cast to any to allow filename parameter (supported by browsers)
        (formData.append as any)(`voice_notes[]`, voiceNote.blob, fileName);
        console.log(`Added voice note ${index + 1}: ${fileName}, Size: ${voiceNote.blob.size}, Type: ${voiceNote.blob.type}`);
      });

      const response = await apiClient.post('/bugs/create.php', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data as ApiResponse<any>;

      if (data.success) {
        toast({
          title: "Success",
          description: "Bug report submitted successfully",
        });

        // Handle redirection immediately after successful submission and toast
        if (preSelectedProjectId) {
          navigate(
            currentUser?.role
              ? `/${currentUser.role}/projects/${preSelectedProjectId}`
              : `/projects/${preSelectedProjectId}`
          );
        } else {
          navigate(currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs");
        }

        // Send email notification asynchronously without blocking navigation
        setTimeout(async () => {
          try {
            // console.log("Sending notification for bug:", name);

            const uploadedAttachments = (data as any).uploadedAttachments || [];
            // console.log("Uploaded attachment paths from backend:", uploadedAttachments);

            const bugId =
              data.data?.bug?.id || (data as any).bugId || data.data?.id || (data as any).id;
            const bugData = {
              title: name,
              description: description,
              expected_result: expectedResult,
              actual_result: actualResult,
              priority: priority,
              status: "pending",
              reported_by_name: currentUser?.name || "BugRicer",
              attachments: uploadedAttachments,
              id: bugId,
              project_id: projectId,
            };

            // Send email notification
            const emailResponse = await sendNewBugNotification(bugData);
            // console.log("Email notification sent:", emailResponse);

            // Broadcast browser notification to all users
            if ((data as any).id) {
              const bugId = String((data as any).id);
              await broadcastNotificationService.broadcastNewBug(
                name,
                bugId,
                currentUser?.name || "BugRicer"
              );
              // console.log("Broadcast notification sent for new bug");

              // Check if WhatsApp notifications are enabled and share
              const notificationSettings = notificationService.getSettings();
              if (
                notificationSettings.whatsappNotifications &&
                notificationSettings.newBugNotifications
              ) {
                // Get project name for WhatsApp message
                const selectedProject = (projects as Project[])?.find(
                  (p) => p.id === projectId
                );

                whatsappService.shareNewBug({
                  bugTitle: name,
                  bugId: bugId,
                  priority: priority,
                  description: description,
                  expectedResult: expectedResult,
                  actualResult: actualResult,
                  reportedBy: currentUser?.name || "BugRicer",
                  projectName: selectedProject?.name || "BugRicer Project",
                });
                // console.log("WhatsApp share opened for new bug");
              }
            }
          } catch (emailError) {
            // console.error("Failed to send email notification:", emailError);
          }
        }, 100);
      } else {
        throw new Error(data.message || "Failed to submit bug report");
      }
    } catch (error) {
      // console.error("Error submitting bug:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit bug report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScreenshotClick = () => {
    screenshotInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleScreenshotChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];

      // Create preview URLs for each file
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          file.preview = URL.createObjectURL(file);
        }
      });

      setScreenshots((prev) => [...prev, ...newFiles]);

      // Reset input value so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];

      // Create preview URLs for image files
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          file.preview = URL.createObjectURL(file);
        }
      });

      setFiles((prev) => [...prev, ...newFiles]);

      // Reset input value so the same file can be selected again
      e.target.value = "";
    }
  };

  const removeScreenshot = (index: number) => {
    const newScreenshots = [...screenshots];

    // Clean up the object URL to prevent memory leaks
    if (newScreenshots[index].preview) {
      URL.revokeObjectURL(newScreenshots[index].preview!);
    }

    newScreenshots.splice(index, 1);
    setScreenshots(newScreenshots);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];

    // Clean up the object URL to prevent memory leaks
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }

    newFiles.splice(index, 1);
    setFiles(newFiles);
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
    voiceNotes.forEach((vn) => {
      if (vn.audioUrl) URL.revokeObjectURL(vn.audioUrl);
    });
    setVoiceNotes([]);
    setActiveVoiceNoteId(null);
  };

  const handlePasteScreenshot = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const fileWithPreview = Object.assign(file, {
            preview: URL.createObjectURL(file),
          });
          setScreenshots((prev) => [...prev, fileWithPreview]);
        }
      }
    }
  };

  // Clean up object URLs when component unmounts
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
  }, [screenshots, files, voiceNotes]);

  // Debug voice notes duration
  useEffect(() => {
    if (voiceNotes.length > 0) {
      console.log(
        "Voice notes updated:",
        voiceNotes.map((vn) => ({ name: vn.name, duration: vn.duration }))
      );
    }
  }, [voiceNotes]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="flex items-center text-muted-foreground hover:text-foreground p-2"
                    onClick={() => navigate(-1)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                    <Bug className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Report Bug
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Submit a detailed bug report with attachments and voice notes
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        New
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Form Card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="p-6 sm:p-8 pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <File className="h-5 w-5 text-white" />
                  </div>
                  Bug Report Form
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-base">
                  Provide comprehensive details to help developers understand and fix the issue
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-8 p-6 sm:p-8">
                  {/* Bug Name Section */}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-full"></div>
                      Bug Title
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter a descriptive title for the bug"
                      value={name}
                      maxLength={TITLE_MAX}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                    />
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Keep it concise and specific</span>
                      <span className={`font-semibold ${name.length > TITLE_MAX * 0.9 ? 'text-orange-600' : ''}`}>
                        {name.length}/{TITLE_MAX}
                      </span>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the bug in detail. What were you doing when it happened? What did you expect to happen?"
                      className="min-h-[150px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      value={description}
                      maxLength={DESCRIPTION_MAX}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Include steps, expected vs actual, and environment</span>
                      <span className={`font-semibold ${description.length > DESCRIPTION_MAX * 0.9 ? 'text-blue-600' : ''}`}>
                        {description.length}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                  </div>

                  {/* Expected Result Section */}
                  <div className="space-y-3">
                    <Label htmlFor="expectedResult" className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
                      Expected Result
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                    </Label>
                    <Textarea
                      id="expectedResult"
                      placeholder="What should have happened? Describe the expected behavior..."
                      className="min-h-[100px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      value={expectedResult}
                      maxLength={EXPECTED_RESULT_MAX}
                      onChange={(e) => setExpectedResult(e.target.value)}
                    />
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Describe what you expected to happen</span>
                      <span className={`font-semibold ${expectedResult.length > EXPECTED_RESULT_MAX * 0.9 ? 'text-green-600' : ''}`}>
                        {expectedResult.length}/{EXPECTED_RESULT_MAX}
                      </span>
                    </div>
                  </div>

                  {/* Actual Result Section */}
                  <div className="space-y-3">
                    <Label htmlFor="actualResult" className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-full"></div>
                      Actual Result
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                    </Label>
                    <Textarea
                      id="actualResult"
                      placeholder="What actually happened? Describe the actual behavior..."
                      className="min-h-[100px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      value={actualResult}
                      maxLength={ACTUAL_RESULT_MAX}
                      onChange={(e) => setActualResult(e.target.value)}
                    />
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Describe what actually happened instead</span>
                      <span className={`font-semibold ${actualResult.length > ACTUAL_RESULT_MAX * 0.9 ? 'text-red-600' : ''}`}>
                        {actualResult.length}/{ACTUAL_RESULT_MAX}
                      </span>
                    </div>
                  </div>

                  {/* Project Selection */}
                  {!preSelectedProjectId && (
                    <div className="space-y-3">
                      <Label htmlFor="project" className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full"></div>
                        Project
                      </Label>
                      <Select value={projectId} onValueChange={setProjectId} required>
                        <SelectTrigger id="project" className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          {isLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading projects...
                            </SelectItem>
                          ) : error ? (
                            <SelectItem value="error" disabled>
                              Error loading projects
                            </SelectItem>
                          ) : (projects as Project[])?.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No projects available
                            </SelectItem>
                          ) : (
                            (projects as Project[])?.map((project: Project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Priority Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="priority" className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full"></div>
                      Priority Level
                    </Label>
                    <Select
                      value={priority}
                      onValueChange={(value) => setPriority(value as BugPriority)}
                    >
                      <SelectTrigger id="priority" className="h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md">
                        <SelectValue placeholder="Select priority level" />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>High Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span>Medium Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Low Priority</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

                    {/* Simple three-card grid: screenshots, files, voice recorder */}
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                        {/* Screenshots section */}
                        <div
                          className="space-y-4"
                          tabIndex={0}
                          onPaste={handlePasteScreenshot}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-300 rounded-xl group"
                            onClick={handleScreenshotClick}
                          >
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                              <ImagePlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              Add Screenshots
                            </span>
                          </Button>

                          {/* Preview of screenshots */}
                          {screenshots.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Screenshots ({screenshots.length})
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearAllScreenshots}
                                  className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  Clear All
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {screenshots.map((file, index) => (
                                  <div
                                    key={index}
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

                        {/* Files section */}
                        <div className="space-y-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-all duration-300 rounded-xl group"
                            onClick={handleFileClick}
                          >
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                              <Paperclip className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              Attach Files
                            </span>
                          </Button>

                        {/* Preview of files */}
                          {files.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Files ({files.length})
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearAllFiles}
                                  className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  Clear All
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {files.map((file, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                                  >
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                      {file.preview ? (
                                        <img
                                          src={file.preview}
                                          alt={`File preview ${index + 1}`}
                                          className="h-10 w-10 object-cover rounded-lg"
                                        />
                                      ) : (
                                        <div className="h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
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
                                      className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400"
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

                        {/* Voice Notes section - recorder only */}
                        <div className="space-y-4">
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
                        </div>
                      </div>
                    </div>

                  {/* Compact WhatsApp-style voice notes list below attachments */}
                  {voiceNotes.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Voice Notes ({voiceNotes.length})
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearAllVoiceNotes}
                          className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {voiceNotes.map((voiceNote, index) => {
                          const voiceId = voiceNote.id;
                          return (
                            <WhatsAppVoiceMessage
                              key={voiceId}
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-6 sm:p-8 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                      className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={
                        isSubmitting ||
                        !projectId ||
                        !name.trim() ||
                        !description.trim()
                      }
                      className="h-12 px-8 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Submit Bug Report
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
};

export default NewBug;
