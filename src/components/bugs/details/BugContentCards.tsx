import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScreenshotViewer } from "@/components/ui/ScreenshotViewer";
import { formatDetailedDate } from "@/lib/dateUtils";
import { Bug } from "@/types";
import { ENV } from "@/lib/env";
import {
  Briefcase,
  Calendar,
  Clock,
  Download,
  Eye,
  File,
  FileImage,
  Pause,
  Play,
  User,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BugContentCardsProps {
  bug: Bug;
}

export function BugContentCards({ bug }: BugContentCardsProps) {
  const [playingVoiceNote, setPlayingVoiceNote] = useState<string | null>(null);
  const [voiceNoteDurations, setVoiceNoteDurations] = useState<{
    [key: string]: number;
  }>({});
  const [screenshotViewerOpen, setScreenshotViewerOpen] = useState(false);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Robust media URL helpers (use PHP endpoints to avoid CORS and set headers)
  // Use ENV.API_URL from env.ts to ensure consistency with backend
  const apiBaseUrl = ENV.API_URL;

  const buildImageUrl = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const url = `${apiBaseUrl}/image.php?path=${encodeURIComponent(path)}`;
    console.log('🖼️ Building image URL:', { path, apiBaseUrl, url });
    return url;
  };
  const buildAudioUrl = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const url = `${apiBaseUrl}/get_attachment.php?path=${encodeURIComponent(path)}&bug_id=${encodeURIComponent(bug.id)}`;
    console.log('🎵 Building audio URL:', { path, apiBaseUrl, url });
    return url;
  };
  const buildDownloadUrl = (path: string, name?: string) => {
    const base = `${apiBaseUrl}/get_attachment.php?path=${encodeURIComponent(
      path
    )}`;
    const withName = name ? `${base}&name=${encodeURIComponent(name)}` : base;
    // Also include bug_id for better compatibility
    return `${withName}&bug_id=${encodeURIComponent(bug.id)}`;
  };

  // Cleanup audio elements when component unmounts
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up audio elements");
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
      audioRefs.current = {};
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Extract duration from audio files
  useEffect(() => {
    const extractDurations = async () => {
      const durations: { [key: string]: number } = {};

      if (bug.attachments) {
        for (const attachment of bug.attachments) {
          if (
            attachment.file_type?.startsWith("audio/") ||
            attachment.file_name?.match(/\.(wav|mp3|m4a|ogg|webm)$/i)
          ) {
            try {
              // Use get_attachment.php endpoint for proper CORS and content-type handling
              const audioUrl = buildAudioUrl(attachment.file_path);
              console.log(
                "🔍 Loading duration for:",
                attachment.file_name,
                "URL:",
                audioUrl
              );

              const audio = new Audio();

              audio.addEventListener("loadedmetadata", () => {
                console.log(
                  "✅ Duration loaded for:",
                  attachment.file_name,
                  "Duration:",
                  audio.duration
                );
                durations[attachment.id] = audio.duration;
                setVoiceNoteDurations((prev) => ({
                  ...prev,
                  [attachment.id]: audio.duration,
                }));
              });

              audio.addEventListener("error", (e) => {
                console.warn(
                  "⚠️ Could not load audio duration for:",
                  attachment.file_name,
                  e
                );
                durations[attachment.id] = 0;
                setVoiceNoteDurations((prev) => ({
                  ...prev,
                  [attachment.id]: 0,
                }));
              });

              // Set source and trigger load
              audio.src = audioUrl;
              audio.load();
            } catch (error) {
              console.warn("Error loading audio duration:", error);
              durations[attachment.id] = 0;
              setVoiceNoteDurations((prev) => ({
                ...prev,
                [attachment.id]: 0,
              }));
            }
          }
        }
      }
    };

    extractDurations();
  }, [bug.attachments]);

  const playVoiceNote = (attachmentId: string, audioUrl: string) => {
    console.log("=== BUG DETAILS PLAY VOICE NOTE DEBUG ===");
    console.log("Playing voice note:", attachmentId, "URL:", audioUrl);

    // Test if the audio URL is accessible (for debugging)
    fetch(audioUrl, { method: "HEAD" })
      .then((response) => {
        console.log(
          "✅ Audio URL accessible:",
          response.status,
          response.statusText
        );
        console.log("📋 Response headers:", response.headers);
        console.log("📋 Content-Type:", response.headers.get('content-type'));
        console.log("📋 Content-Length:", response.headers.get('content-length'));
      })
      .catch((error) => {
        console.error("❌ Audio URL not accessible:", error);
        console.error("❌ Error details:", error.message);
      });

    // Stop any currently playing audio
    if (playingVoiceNote && audioRefs.current[playingVoiceNote]) {
      console.log("🛑 Stopping current audio:", playingVoiceNote);
      audioRefs.current[playingVoiceNote].pause();
      audioRefs.current[playingVoiceNote].currentTime = 0;
    }

    // Create new audio element if it doesn't exist
    if (!audioRefs.current[attachmentId]) {
      console.log("🎵 Creating new audio element for:", attachmentId);
      const audio = new Audio();

      audio.onended = () => {
        console.log("🏁 Audio playback ended for:", attachmentId);
        setPlayingVoiceNote(null);
      };

      audio.onerror = (e) => {
        console.error("❌ Error playing voice note:", attachmentId, e);
        console.error("❌ Audio error details:", {
          originalError: e,
          src: audio.src,
          networkState: audio.networkState,
          readyState: audio.readyState,
          mediaError: audio.error,
        });
        setPlayingVoiceNote(null);
      };

      audio.onloadstart = () => {
        console.log("📥 Audio loading started for:", attachmentId);
      };

      audio.oncanplay = () => {
        console.log("✅ Audio can play for:", attachmentId);
      };

      audio.onloadedmetadata = () => {
        console.log(
          "📊 Audio metadata loaded for:",
          attachmentId,
          "Duration:",
          audio.duration
        );
      };

      audio.onload = () => {
        console.log("📥 Audio load completed for:", attachmentId);
      };

      audio.oncanplaythrough = () => {
        console.log("✅ Audio can play through for:", attachmentId);
      };

      audioRefs.current[attachmentId] = audio;
    }

    // Set the audio source and play
    console.log("🎯 Setting audio source and playing:", attachmentId);
    audioRefs.current[attachmentId].src = audioUrl;

    // Add a small delay to ensure the source is set
    setTimeout(() => {
      audioRefs.current[attachmentId]
        .play()
        .then(() => {
          console.log(
            "✅ Audio playback started successfully for:",
            attachmentId
          );
          setPlayingVoiceNote(attachmentId);
        })
        .catch((error) => {
          console.error("❌ Error playing audio:", error);
          console.error("❌ Play error details:", {
            error: error,
            src: audioRefs.current[attachmentId].src,
            networkState: audioRefs.current[attachmentId].networkState,
            readyState: audioRefs.current[attachmentId].readyState,
          });

          // Try fallback: download and play as blob
          console.log("🔄 Trying fallback: download as blob");
          fetch(audioUrl)
            .then((response) => response.blob())
            .then((blob) => {
              const blobUrl = URL.createObjectURL(blob);
              console.log("🔄 Created blob URL:", blobUrl);
              audioRefs.current[attachmentId].src = blobUrl;
              return audioRefs.current[attachmentId].play();
            })
            .then(() => {
              console.log("✅ Fallback playback successful");
              setPlayingVoiceNote(attachmentId);
            })
            .catch((fallbackError) => {
              console.error("❌ Fallback also failed:", fallbackError);
              setPlayingVoiceNote(null);
            });
        });
    }, 100);
  };

  const pauseVoiceNote = (attachmentId: string) => {
    console.log("=== BUG DETAILS PAUSE VOICE NOTE DEBUG ===");
    console.log("Pausing voice note:", attachmentId);

    if (audioRefs.current[attachmentId]) {
      console.log("🛑 Pausing audio for:", attachmentId);
      audioRefs.current[attachmentId].pause();
      setPlayingVoiceNote(null);
    } else {
      console.log("⚠️ No audio element found for:", attachmentId);
    }
  };

  const downloadAttachment = (attachment: any) => {
    const link = document.createElement("a");
    link.href = buildDownloadUrl(attachment.file_path, attachment.file_name);
    link.download = attachment.file_name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openScreenshotViewer = (index: number) => {
    setSelectedScreenshotIndex(index);
    setScreenshotViewerOpen(true);
  };

  // Use only the main attachments array from backend to avoid duplicates
  // The backend creates both 'attachments' and separate 'screenshots'/'files' arrays
  // We should only use the main 'attachments' array to prevent duplicates
  const allAttachments = Array.isArray((bug as any).attachments)
    ? ((bug as any).attachments as any[])
    : [];
  
  // Debug: Log attachments and API URL - only when bug.id or attachments change to prevent excessive logging
  useEffect(() => {
    console.log('📎 BugContentCards Debug:', {
      apiBaseUrl,
      attachmentsCount: allAttachments.length,
      attachments: allAttachments.map(a => ({
        id: a.id,
        file_name: a.file_name,
        file_path: a.file_path,
        file_type: a.file_type
      })),
      bugId: bug.id
    });
  }, [bug.id, bug.attachments?.length, apiBaseUrl]); // Log when bug ID, attachment count, or API URL changes

  // If no attachments in main array, fallback to legacy structure (for backward compatibility)
  const fallbackAttachments = allAttachments.length === 0 ? [
    ...(Array.isArray((bug as any).screenshots) ? (bug as any).screenshots.map((s: any) => ({
      id: s.id,
      file_name: s.name,
      file_path: s.path,
      file_type: s.type || "image/*",
    })) : []),
    ...(Array.isArray((bug as any).files) ? (bug as any).files.map((f: any) => ({
      id: f.id,
      file_name: f.name,
      file_path: f.path,
      file_type: f.type || "application/octet-stream",
    })) : [])
  ] : [];

  const finalAttachments = allAttachments.length > 0 ? allAttachments : fallbackAttachments;

  // Separate by type from final attachments list
  const screenshots = finalAttachments.filter(
    (att) =>
      att.file_type?.startsWith("image/") ||
      att.file_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
  );

  const voiceNotes = finalAttachments.filter(
    (att) =>
      att.file_type?.startsWith("audio/") ||
      att.file_name?.match(/\.(wav|mp3|m4a|ogg|webm)$/i)
  );

  const otherFiles = finalAttachments.filter(
    (att) =>
      !(
        att.file_type?.startsWith("image/") ||
        att.file_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
      ) &&
      !(
        att.file_type?.startsWith("audio/") ||
        att.file_name?.match(/\.(wav|mp3|m4a|ogg|webm)$/i)
      )
  );

  return (
    <div className="space-y-6">
      {/* Description Card */}
      <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Description
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap break-words">{bug.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Expected Result Card */}
      {bug.expected_result && (
        <Card className="relative overflow-hidden rounded-2xl border border-blue-200/60 dark:border-blue-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-cyan-50/30 dark:from-blue-950/10 dark:via-transparent dark:to-cyan-950/10" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <div className="p-1 bg-blue-500 rounded-lg">
                <File className="w-4 h-4 text-white" />
              </div>
              Expected Result
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap break-words text-blue-800 dark:text-blue-200">{bug.expected_result}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actual Result Card */}
      {bug.actual_result && (
        <Card className="relative overflow-hidden rounded-2xl border border-red-200/60 dark:border-red-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50/30 via-transparent to-pink-50/30 dark:from-red-950/10 dark:via-transparent dark:to-pink-950/10" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <div className="p-1 bg-red-500 rounded-lg">
                <File className="w-4 h-4 text-white" />
              </div>
              Actual Result
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap break-words text-red-800 dark:text-red-200">{bug.actual_result}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fix Description Card - Only show if status is fixed and fix_description exists */}
      {bug.status === 'fixed' && bug.fix_description && (
        <Card className="relative overflow-hidden rounded-2xl border border-green-200/60 dark:border-green-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-50/30 via-transparent to-emerald-50/30 dark:from-green-950/10 dark:via-transparent dark:to-emerald-950/10" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <div className="p-1 bg-green-500 rounded-lg">
                <File className="w-4 h-4 text-white" />
              </div>
              Fix Description
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap break-words text-green-800 dark:text-green-200">{bug.fix_description}</p>
            </div>
            {/* Fix Information */}
            <div className="mt-4 pt-4 border-t border-green-200/30 dark:border-green-800/30">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <User className="w-4 h-4" />
                <span className="font-medium">Fixed by:</span>
                <span className="text-green-800 dark:text-green-200">
                  {bug.fixed_by_name || "Unknown"}
                </span>
              </div>
              {bug.updated_at && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 mt-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Fixed on:</span>
                  <span className="text-green-800 dark:text-green-200">
                    {formatDetailedDate(bug.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screenshots Card */}
      {screenshots.length > 0 && (
        <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Screenshots ({screenshots.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map((attachment, index) => (
                <div
                  key={attachment.id}
                  className="relative group cursor-pointer"
                  onClick={() => openScreenshotViewer(index)}
                >
                  <div className="aspect-[9/16] bg-muted rounded-lg overflow-hidden border hover:border-primary/50 transition-colors">
                    <img
                      src={buildImageUrl(attachment.file_path)}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                    {/* Overlay with View button */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-white/90 hover:bg-white text-black"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground truncate">
                    {attachment.file_name}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screenshot Viewer */}
      <ScreenshotViewer
        screenshots={screenshots}
        open={screenshotViewerOpen}
        onOpenChange={setScreenshotViewerOpen}
        initialIndex={selectedScreenshotIndex}
        bug_id={bug.id}
        onScreenshotDelete={(deletedId) => {
          // Update the bug's attachments to remove the deleted screenshot
          if (bug.attachments) {
            bug.attachments = bug.attachments.filter(
              (att) => att.id !== deletedId
            );
          }
        }}
      />

      {/* Voice Notes Card */}
      {voiceNotes.length > 0 && (
        <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Voice Notes ({voiceNotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-3">
              {voiceNotes.map((attachment, index) => {
                const isPlaying = playingVoiceNote === attachment.id;
                const audioUrl = buildAudioUrl(attachment.file_path);
                const duration = voiceNoteDurations[attachment.id] || 0;

                console.log("Voice note debug:", {
                  id: attachment.id,
                  fileName: attachment.file_name,
                  filePath: attachment.file_path,
                  apiBaseUrl: apiBaseUrl,
                  audioUrl: audioUrl,
                  isPlaying: isPlaying,
                });

                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="font-medium">
                          {attachment.file_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Voice Note {index + 1}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          isPlaying
                            ? pauseVoiceNote(attachment.id)
                            : playVoiceNote(attachment.id, audioUrl)
                        }
                        className="flex items-center gap-1"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadAttachment(attachment)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Files Card */}
      {otherFiles.length > 0 && (
        <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              Attachments ({otherFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-2">
              {otherFiles.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{attachment.file_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {attachment.file_type || "Unknown type"}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadAttachment(attachment)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bug Information Card */}
      <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Bug Information
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDetailedDate(bug.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Updated:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDetailedDate(bug.updated_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Project:</span>
                <span className="text-sm text-muted-foreground">
                  {bug.project_name || "Unknown"}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Reported By:</span>
                <span className="text-sm text-muted-foreground">
                  {bug.reporter_name || "Unknown"}
                </span>
              </div>
              {bug.updated_by_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Last Updated By:</span>
                  <span className="text-sm text-muted-foreground">
                    {bug.updated_by_name}
                  </span>
                </div>
              )}
              {bug.fixed_by_name && bug.status === 'fixed' && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Fixed By:</span>
                  <span className="text-sm text-muted-foreground">
                    {bug.fixed_by_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
