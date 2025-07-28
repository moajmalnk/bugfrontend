import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScreenshotViewer } from "@/components/ui/ScreenshotViewer";
import { formatDetailedDate } from "@/lib/dateUtils";
import { Bug } from "@/types";
import {
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
              // Use audio.php endpoint for proper CORS and content-type handling
              const apiBaseUrl =
                import.meta.env.VITE_API_URL ||
                "http://localhost/Bugricer/backend/api";
              const audioUrl = `${apiBaseUrl}/audio.php?path=${encodeURIComponent(
                attachment.file_path
              )}`;
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
      })
      .catch((error) => {
        console.error("❌ Audio URL not accessible:", error);
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
          error: e,
          src: audio.src,
          networkState: audio.networkState,
          readyState: audio.readyState,
          error: audio.error,
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
    link.href = `${import.meta.env.VITE_API_URL?.replace("/api", "")}/${
      attachment.file_path
    }`;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openScreenshotViewer = (index: number) => {
    setSelectedScreenshotIndex(index);
    setScreenshotViewerOpen(true);
  };

  // Separate attachments by type
  const screenshots =
    bug.attachments?.filter(
      (att) =>
        att.file_type?.startsWith("image/") ||
        att.file_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    ) || [];

  const voiceNotes =
    bug.attachments?.filter(
      (att) =>
        att.file_type?.startsWith("audio/") ||
        att.file_name?.match(/\.(wav|mp3|m4a|ogg|webm)$/i)
    ) || [];

  const otherFiles =
    bug.attachments?.filter(
      (att) =>
        !att.file_type?.startsWith("image/") &&
        !att.file_type?.startsWith("audio/") &&
        !att.file_name?.match(
          /\.(jpg|jpeg|png|gif|webp|bmp|svg|wav|mp3|m4a|ogg|webm)$/i
        )
    ) || [];

  return (
    <div className="space-y-6">
      {/* Description Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap">{bug.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots Card */}
      {screenshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Screenshots ({screenshots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map((attachment, index) => (
                <div
                  key={attachment.id}
                  className="relative group cursor-pointer"
                  onClick={() => openScreenshotViewer(index)}
                >
                  <div className="aspect-[9/16] bg-muted rounded-lg overflow-hidden border hover:border-primary/50 transition-colors">
                    <img
                      src={`${import.meta.env.VITE_API_URL?.replace(
                        "/api",
                        ""
                      )}/${attachment.file_path}`}
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
      />

      {/* Voice Notes Card */}
      {voiceNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Voice Notes ({voiceNotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {voiceNotes.map((attachment, index) => {
                const isPlaying = playingVoiceNote === attachment.id;
                const apiBaseUrl =
                  import.meta.env.VITE_API_URL ||
                  "http://localhost/Bugricer/backend/api";
                const audioUrl = `${apiBaseUrl}/audio.php?path=${encodeURIComponent(
                  attachment.file_path
                )}`;
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              Attachments ({otherFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Bug Information
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
