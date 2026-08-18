import { ScreenshotDropZone } from "@/components/attachments/ScreenshotDropZone";
import {
  PROJECT_PICKER_POPOVER_CLASS,
  ProjectPickerListItemContent,
  ProjectPickerTriggerMeta,
  projectPickerSearchValue,
} from "@/components/bugs/ProjectPickerMeta";
import { filterAssignedProjects } from "@/components/dashboard/roleDashboardShared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { useAuth } from "@/context/AuthContext";
import { extractApiErrorMessage } from "@/lib/apiError";
import { apiClient } from "@/lib/axios";
import { ENV } from "@/lib/env";
import { cn, getEffectiveRole } from "@/lib/utils";
import { sortProjectsForPicker } from "@/lib/utils/projectUtils";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { projectService } from "@/services/projectService";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bug,
  Camera,
  ChevronsUpDown,
  FileVideo,
  FolderKanban,
  Loader2,
  Video,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

const TITLE_MAX = 255;

interface FileWithPreview extends File {
  preview?: string;
}

interface VoiceNote {
  id: string;
  blob: Blob;
  duration: number;
  name: string;
  waveform?: number[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name)
  );
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|m4v|avi)$/i.test(file.name)
  );
}

function voiceFileExtension(blob: Blob): string {
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  return "wav";
}

function TesterReportSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4" aria-busy="true" aria-label="Loading report form">
      <Skeleton className="col-span-12 h-28 rounded-2xl" />
      <Skeleton className="col-span-12 h-12 rounded-xl" />
      <Skeleton className="col-span-12 h-12 rounded-xl" />
      <Skeleton className="col-span-12 sm:col-span-4 h-40 rounded-2xl" />
      <Skeleton className="col-span-12 sm:col-span-4 h-40 rounded-2xl" />
      <Skeleton className="col-span-12 sm:col-span-4 h-40 rounded-2xl" />
      <Skeleton className="col-span-12 h-12 rounded-2xl" />
    </div>
  );
}

const TesterReportBug = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedProjectId = searchParams.get("projectId") || "";
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [projectId, setProjectId] = useState(preSelectedProjectId);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [screenshots, setScreenshots] = useState<FileWithPreview[]>([]);
  const [videos, setVideos] = useState<FileWithPreview[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState<string | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const baselineProjectId = useRef(preSelectedProjectId);
  const screenshotsRef = useRef<FileWithPreview[]>([]);
  const videosRef = useRef<FileWithPreview[]>([]);
  const pendingLeaveRef = useRef<(() => void) | null>(null);
  const unsavedHistoryPushed = useRef(false);

  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
  const galleryVideoRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const {
    data: allProjects = [],
    isLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["tester-report-projects", currentUser?.id],
    queryFn: () => projectService.getProjects(),
    enabled: !!currentUser && role === "tester",
  });

  const assignedProjects = useMemo(
    () =>
      sortProjectsForPicker(
        filterAssignedProjects(allProjects, currentUser?.id)
      ),
    [allProjects, currentUser?.id]
  );

  useEffect(() => {
    if (assignedProjects.length === 0) return;
    const preOk =
      Boolean(preSelectedProjectId) &&
      assignedProjects.some((p) => p.id === preSelectedProjectId);
    if (preOk) {
      setProjectId((prev) => prev || preSelectedProjectId);
      if (!baselineProjectId.current) {
        baselineProjectId.current = preSelectedProjectId;
      }
      return;
    }
    if (assignedProjects.length === 1) {
      const onlyId = assignedProjects[0].id;
      setProjectId((prev) => prev || onlyId);
      if (!baselineProjectId.current) {
        baselineProjectId.current = onlyId;
      }
    }
  }, [assignedProjects, preSelectedProjectId]);

  screenshotsRef.current = screenshots;
  videosRef.current = videos;

  const revokePreviews = useCallback((files: FileWithPreview[]) => {
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setTitleError("");
    setTitleTouched(false);
    setProjectId(baselineProjectId.current);
    setProjectPickerOpen(false);
    revokePreviews(screenshotsRef.current);
    revokePreviews(videosRef.current);
    setScreenshots([]);
    setVideos([]);
    setVoiceNotes([]);
    setActiveVoiceNoteId(null);
    if (cameraPhotoRef.current) cameraPhotoRef.current.value = "";
    if (cameraVideoRef.current) cameraVideoRef.current.value = "";
    if (galleryVideoRef.current) galleryVideoRef.current.value = "";
    if (screenshotInputRef.current) screenshotInputRef.current.value = "";
  }, [revokePreviews]);

  useEffect(() => {
    return () => {
      revokePreviews(screenshotsRef.current);
      revokePreviews(videosRef.current);
    };
  }, [revokePreviews]);

  const isDirty =
    title.trim().length > 0 ||
    projectId !== baselineProjectId.current ||
    screenshots.length > 0 ||
    videos.length > 0 ||
    voiceNotes.length > 0;

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onPop = () => {
      setUnsavedOpen(false);
      unsavedHistoryPushed.current = false;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openUnsavedDialog = (onDiscard: () => void) => {
    pendingLeaveRef.current = onDiscard;
    if (!unsavedOpen) {
      window.history.pushState({ modal: "unsaved" }, "");
      unsavedHistoryPushed.current = true;
    }
    setUnsavedOpen(true);
  };

  const closeUnsavedKeep = () => {
    setUnsavedOpen(false);
    pendingLeaveRef.current = null;
    if (unsavedHistoryPushed.current && window.history.state?.modal === "unsaved") {
      unsavedHistoryPushed.current = false;
      window.history.back();
    }
  };

  const confirmDiscard = () => {
    const leave = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setUnsavedOpen(false);
    resetForm();
    if (unsavedHistoryPushed.current && window.history.state?.modal === "unsaved") {
      unsavedHistoryPushed.current = false;
      const onPop = () => {
        window.removeEventListener("popstate", onPop);
        leave?.();
      };
      window.addEventListener("popstate", onPop);
      window.history.back();
      return;
    }
    unsavedHistoryPushed.current = false;
    leave?.();
  };

  const leavePage = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(`/${role}/dashboard`);
  };

  const handleCancel = () => {
    if (isDirty) {
      openUnsavedDialog(leavePage);
      return;
    }
    leavePage();
  };

  const addScreenshotFiles = (raw: File[]) => {
    if (raw.length === 0) return;
    const imageFiles = raw.filter(isImageFile);
    if (imageFiles.length === 0) {
      toast({
        title: "Images only",
        description: "Use a photo or image file (PNG, JPG, GIF, WebP).",
        variant: "destructive",
      });
      return;
    }
    const next = imageFiles.map((file) => {
      const withPreview = file as FileWithPreview;
      withPreview.preview = URL.createObjectURL(file);
      return withPreview;
    });
    setScreenshots((prev) => [...prev, ...next]);
  };

  const addVideoFiles = (raw: File[]) => {
    if (raw.length === 0) return;
    const videoFiles = raw.filter(isVideoFile);
    if (videoFiles.length === 0) {
      toast({
        title: "Video only",
        description: "Use a video file (MP4, MOV, WebM).",
        variant: "destructive",
      });
      return;
    }
    const next = videoFiles.map((file) => {
      const withPreview = file as FileWithPreview;
      withPreview.preview = URL.createObjectURL(file);
      return withPreview;
    });
    setVideos((prev) => [...prev, ...next]);
  };

  const handleScreenshotChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addScreenshotFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addVideoFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handlePasteScreenshot = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) pasted.push(file);
      }
    }
    if (pasted.length > 0) addScreenshotFiles(pasted);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => {
      const next = [...prev];
      if (next[index]?.preview) URL.revokeObjectURL(next[index].preview!);
      next.splice(index, 1);
      return next;
    });
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => {
      const next = [...prev];
      if (next[index]?.preview) URL.revokeObjectURL(next[index].preview!);
      next.splice(index, 1);
      return next;
    });
  };

  const handleVoiceRecorderComplete = ({
    blob,
    duration,
    waveform,
  }: RecordedVoiceNote) => {
    setVoiceNotes((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        blob,
        duration: Math.max(1, Math.round(duration || 0)),
        name: `Voice Note ${prev.length + 1}`,
        waveform,
      },
    ]);
  };

  const onTitleChange = (value: string) => {
    const next = value.slice(0, TITLE_MAX);
    setTitle(next);
    if (titleTouched) {
      setTitleError(next.trim() ? "" : "Enter a title");
    }
  };

  const isValid = Boolean(projectId) && Boolean(title.trim()) && !titleError;
  const selectedProject = assignedProjects.find((p) => p.id === projectId);

  /**
   * Why: Backend still requires description; testers skip that field so we send the title.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !currentUser) return;

    const trimmed = title.trim();
    setTitleTouched(true);
    if (!trimmed) {
      setTitleError("Enter a title");
      return;
    }
    if (!projectId) {
      toast({
        title: "Select a project",
        description: "Choose one of your assigned projects.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", trimmed);
      formData.append("description", trimmed);
      formData.append("project_id", projectId);
      formData.append("priority", "medium");
      formData.append("status", "pending");

      screenshots.forEach((file) => {
        formData.append("screenshots[]", file);
      });
      videos.forEach((file) => {
        formData.append("files[]", file);
      });
      voiceNotes.forEach((voiceNote, index) => {
        const fileName = `${voiceNote.name || `voice_note_${index + 1}`}.${voiceFileExtension(voiceNote.blob)}`;
        formData.append("voice_notes[]", voiceNote.blob, fileName);
        if (Number.isFinite(voiceNote.duration) && voiceNote.duration > 0) {
          formData.append(`voice_note_duration_${index}`, String(voiceNote.duration));
        }
      });

      const response = await apiClient.post("/bugs/create.php", formData, {
        timeout: 30000,
      });
      const data = response.data as ApiResponse<{
        bug?: { id?: string };
        id?: string;
      }>;

      if (!data.success) {
        throw new Error(data.message || "Failed to submit bug report");
      }

      const bugId =
        data.data?.bug?.id || data.data?.id || (data as { bugId?: string }).bugId;

      if (bugId) {
        const triggerUrl = `${ENV.API_URL}/notifications/trigger-bug.php`;
        const payload = new URLSearchParams({ bug_id: String(bugId) }).toString();
        const blob = new Blob([payload], {
          type: "application/x-www-form-urlencoded;charset=UTF-8",
        });
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(triggerUrl, blob);
        } else {
          fetch(triggerUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: payload,
            keepalive: true,
          }).catch(() => undefined);
        }
      }

      toast({
        title: "Bug reported",
        description: "Submitted. Email and WhatsApp sharing is processing in the background.",
      });

      resetForm();

      if (bugId) {
        navigate(`/${role}/bugs/${bugId}`);
        void broadcastNotificationService
          .broadcastNewBug(trimmed, String(bugId), currentUser.name || "BugRicer")
          .catch(() => undefined);
      } else {
        navigate(`/${role}/bugs`);
      }
    } catch (error) {
      toast({
        title: "Bug not saved",
        description: extractApiErrorMessage(error, "Failed to submit bug report"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentUser && role !== "tester") {
    const qs = searchParams.toString();
    return (
      <Navigate
        to={`/${role}/bugs/new${qs ? `?${qs}` : ""}`}
        replace
      />
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <header className="col-span-12 rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 shadow-lg">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shrink-0">
            <Bug className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
              Report Bug
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assigned projects only — title, camera, screenshots, and voice.
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="col-span-12">
          <TesterReportSkeleton />
        </div>
      ) : projectsError ? (
        <div className="col-span-12 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          Could not load your projects. Check your connection and try again.
        </div>
      ) : assignedProjects.length === 0 ? (
        <div className="col-span-12 rounded-2xl border border-border/60 bg-card p-8 text-center">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">No assigned projects</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You need to be added to a project before you can report a bug.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="col-span-12 grid grid-cols-12 gap-4"
        >
          <div className="col-span-12 space-y-2">
            <Label htmlFor="tester-project" className="text-sm font-semibold">
              Project
            </Label>
            <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="tester-project"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={projectPickerOpen}
                  disabled={isSubmitting}
                  className="h-12 w-full justify-between rounded-xl"
                >
                  {selectedProject ? (
                    <span className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span className="truncate">{selectedProject.name}</span>
                      <ProjectPickerTriggerMeta
                        stats={{
                          status: selectedProject.status,
                          bug_stats: selectedProject.bug_stats,
                          update_stats: selectedProject.update_stats,
                        }}
                      />
                    </span>
                  ) : (
                    <span className="truncate text-muted-foreground">
                      Select an assigned project
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={PROJECT_PICKER_POPOVER_CLASS}
                align="start"
                collisionPadding={16}
              >
                <Command>
                  <CommandInput placeholder="Search assigned projects..." />
                  <CommandList>
                    <CommandEmpty>No assigned project found.</CommandEmpty>
                    <CommandGroup>
                      {assignedProjects.map((project) => {
                        const stats = {
                          status: project.status,
                          bug_stats: project.bug_stats,
                          update_stats: project.update_stats,
                        };
                        return (
                          <CommandItem
                            key={project.id}
                            value={projectPickerSearchValue(project.name, project.id, stats)}
                            onSelect={() => {
                              setProjectId(project.id);
                              setProjectPickerOpen(false);
                            }}
                            className="items-start gap-2 py-2.5"
                          >
                            <ProjectPickerListItemContent
                              name={project.name}
                              selected={projectId === project.id}
                              stats={stats}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="col-span-12 space-y-2">
            <Label htmlFor="tester-bug-title" className="text-sm font-semibold">
              Title
            </Label>
            <Input
              id="tester-bug-title"
              value={title}
              maxLength={TITLE_MAX}
              disabled={isSubmitting}
              placeholder="What went wrong?"
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => {
                setTitleTouched(true);
                setTitleError(title.trim() ? "" : "Enter a title");
              }}
              className="h-12 rounded-xl"
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "tester-title-error" : "tester-title-count"}
            />
            <div className="flex items-center justify-between gap-2 text-xs">
              {titleError ? (
                <span id="tester-title-error" className="text-red-500">
                  {titleError}
                </span>
              ) : (
                <span className="text-muted-foreground">Short and specific</span>
              )}
              <span
                id="tester-title-count"
                className={cn(
                  "tabular-nums text-muted-foreground",
                  title.length > TITLE_MAX * 0.9 && "text-orange-600 dark:text-orange-400"
                )}
              >
                {title.length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-4 flex flex-col gap-3">
              <input
                ref={cameraPhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleScreenshotChange}
                disabled={isSubmitting}
                aria-hidden="true"
                tabIndex={-1}
              />
              <input
                ref={cameraVideoRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="sr-only"
                onChange={handleVideoChange}
                disabled={isSubmitting}
                aria-hidden="true"
                tabIndex={-1}
              />
              <input
                ref={galleryVideoRef}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={handleVideoChange}
                disabled={isSubmitting}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div className="flex flex-col gap-2">
                {(
                  [
                    {
                      key: "photo",
                      label: "Take photo",
                      icon: Camera,
                      onClick: () => cameraPhotoRef.current?.click(),
                    },
                    {
                      key: "record",
                      label: "Record video",
                      icon: Video,
                      onClick: () => cameraVideoRef.current?.click(),
                    },
                    {
                      key: "choose",
                      label: "Choose video",
                      icon: FileVideo,
                      onClick: () => galleryVideoRef.current?.click(),
                    },
                  ] as const
                ).map(({ key, label, icon: Icon, onClick }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={isSubmitting}
                    onClick={onClick}
                    className={cn(
                      "flex h-14 w-full items-center justify-center gap-2 rounded-xl",
                      "border-2 border-dashed border-gray-300 dark:border-gray-600",
                      "text-sm font-semibold text-gray-700 dark:text-gray-300",
                      "hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                      "transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              {videos.length > 0 && (
                <div className="flex flex-col gap-2">
                  {videos.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative rounded-xl border border-border bg-card p-2"
                    >
                      {file.preview ? (
                        <video
                          src={file.preview}
                          className="h-24 w-full rounded-xl object-cover"
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-xl bg-muted">
                          <FileVideo className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-xl"
                        onClick={() => removeVideo(index)}
                        aria-label={`Remove video ${index + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="mt-2 truncate px-1 text-xs text-muted-foreground">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="col-span-12 sm:col-span-4 flex flex-col gap-3"
              tabIndex={0}
              onPaste={handlePasteScreenshot}
            >
              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleScreenshotChange}
                disabled={isSubmitting}
                aria-hidden="true"
                tabIndex={-1}
              />
              <ScreenshotDropZone
                onAddFiles={addScreenshotFiles}
                onOpenPicker={() => screenshotInputRef.current?.click()}
                disabled={isSubmitting}
              />
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {screenshots.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative rounded-xl border border-border bg-card p-2"
                    >
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={`Screenshot ${index + 1}`}
                          className="h-24 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
                          Image
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-xl"
                        onClick={() => removeScreenshot(index)}
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-12 sm:col-span-4 flex flex-col gap-3">
              <WhatsAppVoiceRecorder
                onComplete={handleVoiceRecorderComplete}
                disabled={isSubmitting}
                maxDuration={300}
              />
              {voiceNotes.length > 0 && (
                <div className="flex flex-col gap-2">
                  {voiceNotes.map((voiceNote, index) => (
                    <div
                      key={voiceNote.id}
                      className="rounded-xl border border-border bg-card p-2"
                    >
                      <WhatsAppVoiceMessage
                        id={voiceNote.id}
                        audioSource={voiceNote.blob}
                        duration={voiceNote.duration}
                        waveform={voiceNote.waveform}
                        accent="sent"
                        autoPlay
                        isActive={activeVoiceNoteId === voiceNote.id}
                        onPlay={(id) => setActiveVoiceNoteId(id)}
                        onPause={(id) => {
                          if (id === activeVoiceNoteId) setActiveVoiceNoteId(null);
                        }}
                        onRemove={() => {
                          if (activeVoiceNoteId === voiceNote.id) {
                            setActiveVoiceNoteId(null);
                          }
                          setVoiceNotes((prev) => prev.filter((_, i) => i !== index));
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-12 flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="h-12 rounded-2xl px-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="h-12 rounded-2xl px-8 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Bug className="mr-2 h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      <AlertDialog
        open={unsavedOpen}
        onOpenChange={(open) => {
          if (!open) closeUnsavedKeep();
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader className="text-left space-y-2">
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Discard them and leave this page?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl mt-0">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDiscard();
              }}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TesterReportBug;
