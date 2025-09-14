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
  File,
  FileImage,
  ImagePlus,
  Mic,
  Paperclip,
  Pause,
  Play,
  Square,
  Volume2,
  X,
} from "lucide-react";
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

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [showDuration, setShowDuration] = useState(false);

  // Refs for file inputs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

      // Clean up current audio
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, [voiceNotes, currentAudio]);

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
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
        const allProjects = response.data.data;
        if (currentUser?.role === "admin") {
          return allProjects; // Admin sees all projects
        }
        return allProjects.filter((project: any) => {
          if (Array.isArray(project.members)) {
            // If array of IDs
            if (typeof project.members[0] === "string") {
              return project.members.includes(currentUser.id);
            }
            // If array of objects
            return project.members.some(
              (m) => m.id === currentUser.id || m.user_id === currentUser.id
            );
          }
          // fallback: show if user is creator
          return project.created_by === currentUser.id;
        });
      }
      throw new Error(response.data.message || "Failed to fetch projects");
    },
  });

  // Voice recording functions - using proven approach from working VoiceRecorder components
  const startRecording = async () => {
    try {
      console.log("Starting voice recording...");

      // Request microphone access with basic audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("Microphone access granted");

      // Use more compatible MIME type detection
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

      console.log("Using MIME type:", mimeType);

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log(
            "Audio chunk received, size:",
            event.data.size,
            "Total chunks:",
            chunks.length
          );
        }
      };

      recorder.onstop = () => {
        // Capture the recording time before it gets reset
        const finalRecordingTime = recordingTime;
        console.log("Recording stopped. Final time:", finalRecordingTime);

        // Create blob with proper type
        const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);

        console.log(
          "Recording completed. Blob type:",
          audioBlob.type,
          "Size:",
          audioBlob.size,
          "Duration:",
          finalRecordingTime
        );

        // Create voice note with captured duration (ensure minimum 1 second)
        const voiceNote: VoiceNote = {
          id: Date.now().toString(),
          blob: audioBlob,
          duration: finalRecordingTime > 0 ? finalRecordingTime : 1,
          name: `Voice Note ${voiceNotes.length + 1}`,
          isPlaying: false,
          audioUrl: audioUrl,
        };

        console.log("=== VOICE NOTE CREATED ===");
        console.log("Voice note object:", voiceNote);
        console.log("Blob size:", audioBlob.size);
        console.log("Blob type:", audioBlob.type);
        console.log("Audio URL:", audioUrl);
        console.log("Duration:", finalRecordingTime, "seconds");

        // Add to voice notes
        setVoiceNotes((prev) => {
          const newList = [...prev, voiceNote];
          console.log("Updated voice notes list:", newList);
          return newList;
        });

        // Reset recording state with a small delay to ensure duration is captured
        setTimeout(() => {
          setAudioChunks([]);
          setRecordingTime(0);
        }, 100);
        stream.getTracks().forEach((track) => track.stop());

        setAudioChunks([]);
        setRecordingTime(0);
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      setRecordingTime(0);
      recorder.start(1000);
      setIsRecording(true);

      // Start timer like working components
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Auto-stop after 5 minutes
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 300000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Failed",
        description:
          "Could not access microphone. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      console.log("Stopping recording, current time:", recordingTime);
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      // Don't reset recordingTime here - let the onstop handler capture it
    }
  };

  const playVoiceNote = (voiceNote: VoiceNote) => {
    console.log("=== PLAY VOICE NOTE DEBUG ===");
    console.log("Voice note:", voiceNote);
    console.log("Current audio state:", currentAudio);
    console.log("Current voice notes state:", voiceNotes);

    if (!voiceNote.audioUrl) {
      console.error("❌ No audio URL provided");
      toast({
        title: "Playback Error",
        description: "Audio file not found. Please record again.",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ Audio URL exists:", voiceNote.audioUrl);

    // Stop any currently playing audio
    if (currentAudio) {
      console.log("🛑 Stopping current audio");
      currentAudio.pause();
      setCurrentAudio(null);
    }

    // Set all voice notes to not playing first
    console.log("🔄 Setting all voice notes to not playing");
    setVoiceNotes((prev) => {
      const updated = prev.map((vn) => ({ ...vn, isPlaying: false }));
      console.log("Updated voice notes:", updated);
      return updated;
    });

    // Create new audio element with the blob directly
    console.log("🎵 Creating new audio element from blob");
    const audio = new Audio();

    // Create a new blob URL from the original blob to ensure it's valid
    const newAudioUrl = URL.createObjectURL(voiceNote.blob);
    console.log("🔄 Created new blob URL:", newAudioUrl);

    audio.src = newAudioUrl;
    setCurrentAudio(audio);

    // Set this voice note as playing immediately
    console.log("▶️ Setting voice note as playing:", voiceNote.id);
    setVoiceNotes((prev) => {
      const updated = prev.map((vn) => ({
        ...vn,
        isPlaying: vn.id === voiceNote.id,
      }));
      console.log("Updated voice notes after setting playing:", updated);
      return updated;
    });

    // Set up event listeners
    audio.onended = () => {
      console.log("🏁 Audio playback ended");
      setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));
      setCurrentAudio(null);
      // Clean up the blob URL
      URL.revokeObjectURL(newAudioUrl);
    };

    audio.onerror = (e) => {
      console.error("❌ Audio playback error:", e);
      setVoiceNotes((prev) => prev.map((vn) => ({ ...vn, isPlaying: false })));
      setCurrentAudio(null);
      // Clean up the blob URL
      URL.revokeObjectURL(newAudioUrl);
    };

    // Start playing
    console.log("🚀 Starting audio playback");
    audio
      .play()
      .then(() => {
        console.log("✅ Audio playback started successfully");
      })
      .catch((error) => {
        console.error("❌ Error playing audio:", error);
        setVoiceNotes((prev) =>
          prev.map((vn) => ({ ...vn, isPlaying: false }))
        );
        setCurrentAudio(null);
        // Clean up the blob URL
        URL.revokeObjectURL(newAudioUrl);
      });
  };

  const pauseVoiceNote = (voiceNote: VoiceNote) => {
    console.log("=== PAUSE VOICE NOTE DEBUG ===");
    console.log("Pausing voice note:", voiceNote.name);
    console.log("Current audio state:", currentAudio);
    console.log("Current voice notes state:", voiceNotes);

    // Pause the current audio
    if (currentAudio) {
      console.log("🛑 Pausing current audio");
      currentAudio.pause();
      setCurrentAudio(null);
    } else {
      console.log("⚠️ No current audio to pause");
    }

    // Set all voice notes to not playing
    console.log("🔄 Setting all voice notes to not playing");
    setVoiceNotes((prev) => {
      const updated = prev.map((vn) => ({ ...vn, isPlaying: false }));
      console.log("Updated voice notes after pause:", updated);
      return updated;
    });
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
    setVoiceNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
        formData.append(
          `voice_notes[]`,
          voiceNote.blob,
          `${voiceNote.name}.${fileExtension}`
        );
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
              reported_by_name: currentUser?.name || "Bug Ricer User",
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
                currentUser?.name || "Bug Ricer User"
              );
              // console.log("Broadcast notification sent for new bug");

              // Check if WhatsApp notifications are enabled and share
              const notificationSettings = notificationService.getSettings();
              if (
                notificationSettings.whatsappNotifications &&
                notificationSettings.newBugNotifications
              ) {
                // Get project name for WhatsApp message
                const selectedProject = projects?.find(
                  (p) => p.id === projectId
                );

                whatsappService.shareNewBug({
                  bugTitle: name,
                  bugId: bugId,
                  priority: priority,
                  description: description,
                  expectedResult: expectedResult,
                  actualResult: actualResult,
                  reportedBy: currentUser?.name || "Bug Ricer User",
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

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
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

  // Cleanup currentAudio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
    };
  }, [currentAudio]);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto px-2 sm:px-4 py-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="flex items-center text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report a Bug</CardTitle>
          <CardDescription>
            Fill out the form below to report a new bug
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Bug Name</Label>
              <Input
                id="name"
                placeholder="Enter a descriptive title"
                value={name}
                maxLength={TITLE_MAX}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Keep it concise and specific.</span>
                <span>
                  {name.length}/{TITLE_MAX}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the bug in detail. What were you doing when it happened? What did you expect to happen?"
                className="min-h-[150px]"
                value={description}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Include steps, expected vs actual, and environment.</span>
                <span>
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedResult">Expected Result (Optional)</Label>
              <Textarea
                id="expectedResult"
                placeholder="What should have happened? Describe the expected behavior..."
                className="min-h-[100px]"
                value={expectedResult}
                maxLength={EXPECTED_RESULT_MAX}
                onChange={(e) => setExpectedResult(e.target.value)}
              />
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Describe what you expected to happen.</span>
                <span>
                  {expectedResult.length}/{EXPECTED_RESULT_MAX}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualResult">Actual Result (Optional)</Label>
              <Textarea
                id="actualResult"
                placeholder="What actually happened? Describe the actual behavior..."
                className="min-h-[100px]"
                value={actualResult}
                maxLength={ACTUAL_RESULT_MAX}
                onChange={(e) => setActualResult(e.target.value)}
              />
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Describe what actually happened instead.</span>
                <span>
                  {actualResult.length}/{ACTUAL_RESULT_MAX}
                </span>
              </div>
            </div>

            {/* Only show project dropdown if no projectId in URL */}
            {!preSelectedProjectId && (
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading projects...
                      </SelectItem>
                    ) : error ? (
                      <SelectItem value="error" disabled>
                        Error loading projects
                      </SelectItem>
                    ) : projects?.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No projects available
                      </SelectItem>
                    ) : (
                      projects?.map((project: Project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as BugPriority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Attachments</Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Screenshots: {screenshots.length}</span>
                  <span>Files: {files.length}</span>
                  <span>Voice notes: {voiceNotes.length}</span>
                </div>
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

              <div className="grid gap-4 md:grid-cols-3">
                {/* Screenshots section */}
                <div
                  className="space-y-3"
                  tabIndex={0}
                  onPaste={handlePasteScreenshot}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="h-24 w-full flex flex-col items-center justify-center"
                    onClick={handleScreenshotClick}
                  >
                    <ImagePlus className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span>Add Screenshots</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      (Paste or Upload)
                    </span>
                  </Button>

                  {/* Preview of screenshots */}
                  {screenshots.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Screenshots ({screenshots.length})
                      </Label>
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={clearAllScreenshots}>
                          Clear
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {screenshots.map((file, index) => (
                          <div
                            key={index}
                            className="relative rounded border p-1 group"
                          >
                            {file.preview ? (
                              <img
                                src={file.preview}
                                alt={`Screenshot ${index + 1}`}
                                className="h-20 w-full object-cover rounded"
                              />
                            ) : (
                              <div className="h-20 w-full flex items-center justify-center bg-muted rounded">
                                <FileImage className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-6 w-6 absolute top-1 right-1 opacity-70 hover:opacity-100"
                              onClick={() => removeScreenshot(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="text-xs truncate mt-1 px-1">
                              {file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Files section */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-24 w-full flex flex-col items-center justify-center"
                    onClick={handleFileClick}
                  >
                    <Paperclip className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span>Attach Files</span>
                  </Button>

                  {/* Preview of files */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Files ({files.length})</Label>
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={clearAllFiles}>
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded border p-2 text-sm group"
                          >
                            <div className="flex items-center space-x-2 overflow-hidden">
                              {file.preview ? (
                                <img
                                  src={file.preview}
                                  alt={`File preview ${index + 1}`}
                                  className="h-8 w-8 object-cover rounded"
                                />
                              ) : (
                                <File className="h-8 w-8 text-muted-foreground" />
                              )}
                              <span className="truncate max-w-[120px]">
                                {file.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-70 hover:opacity-100"
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

                {/* Voice Notes section */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    className={`h-24 w-full flex flex-col items-center justify-center transition-all duration-200 ${
                      isRecording
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse"
                        : "hover:bg-primary/5 hover:border-primary/30"
                    }`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSubmitting}
                    title={
                      isRecording
                        ? "Click to stop recording"
                        : "Click to start recording"
                    }
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-8 w-8 mb-2 text-white" />
                        <span className="font-medium">Stop Recording</span>
                        <span className="text-xs text-white/80 mt-1 font-mono">
                          {formatTime(recordingTime)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                        <span>Record Voice Note</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          (Click to start)
                        </span>
                      </>
                    )}
                  </Button>

                  {/* Debug Info */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-xs">
                      <div>Debug: {voiceNotes.length} voice notes</div>
                      <div>
                        Current Audio: {currentAudio ? "Playing" : "None"}
                      </div>
                      <div>
                        Playing IDs:{" "}
                        {voiceNotes
                          .filter((vn) => vn.isPlaying)
                          .map((vn) => vn.id)
                          .join(", ") || "None"}
                      </div>
                    </div>
                  )}

                  {/* Preview of voice notes */}
                  {voiceNotes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Voice Notes ({voiceNotes.length})
                      </Label>
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={clearAllVoiceNotes}>
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {voiceNotes.map((voiceNote, index) => (
                          <div
                            key={voiceNote.id}
                            className="flex items-center justify-between rounded border p-2 text-sm group hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center space-x-2 overflow-hidden">
                              <Volume2 className="h-8 w-8 text-blue-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">
                                  {voiceNote.name}
                                </div>
                                {showDuration && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {formatTime(voiceNote.duration)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-primary/10"
                                onClick={() => {
                                  console.log(
                                    "Button clicked, isPlaying:",
                                    voiceNote.isPlaying
                                  );
                                  if (voiceNote.isPlaying) {
                                    pauseVoiceNote(voiceNote);
                                  } else {
                                    playVoiceNote(voiceNote);
                                  }
                                }}
                                title={voiceNote.isPlaying ? "Pause" : "Play"}
                              >
                                {voiceNote.isPlaying ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeVoiceNote(index)}
                                title="Remove voice note"
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
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={
              isSubmitting ||
              !projectId ||
              !name.trim() ||
              !description.trim()
            }>
              {isSubmitting ? "Submitting..." : "Submit Bug Report"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default NewBug;
