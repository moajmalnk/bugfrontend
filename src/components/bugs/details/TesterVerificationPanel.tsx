import { ScreenshotDropZone } from "@/components/attachments/ScreenshotDropZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  BUG_LEVEL_FORM_OPTIONS,
  bugLevelBadgeClass,
  formatBugLevelLabel,
} from "@/lib/bugMetaUtils";
import { Bug, BugLevel } from "@/types";
import { apiClient } from "@/lib/axios";
import { ENV } from "@/lib/env";
import { cn } from "@/lib/utils";
import { formatDetailedDate } from "@/lib/dateUtils";
import {
  WhatsAppVoiceMessage,
} from "@/components/voice/WhatsAppVoiceMessage";
import {
  RecordedVoiceNote,
  WhatsAppVoiceRecorder,
} from "@/components/voice/WhatsAppVoiceRecorder";
import {
  CheckCircle2,
  ClipboardCheck,
  FileImage,
  Loader2,
  Paperclip,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function triState(value: boolean | number | string | null | undefined): "yes" | "no" | "unset" {
  if (value === true || value === 1 || value === "1") return "yes";
  if (value === false || value === 0 || value === "0") return "no";
  return "unset";
}

function isVerificationAttachment(att: {
  upload_context?: string | null;
  file_name?: string;
}): boolean {
  return String(att.upload_context || "").toLowerCase() === "verification";
}

function isImageAttachment(att: { file_type?: string; file_name?: string }): boolean {
  return (
    String(att.file_type || "").startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(att.file_name || "")
  );
}

function isAudioAttachment(att: { file_type?: string; file_name?: string }): boolean {
  return (
    String(att.file_type || "").startsWith("audio/") ||
    /\.(wav|mp3|m4a|ogg|webm)$/i.test(att.file_name || "")
  );
}

function YesNoButtons({
  value,
  onChange,
  disabled,
  yesLabel = "Yes",
  noLabel = "No",
}: {
  value: "yes" | "no" | "unset";
  onChange: (next: "yes" | "no") => void;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("no")}
        className={cn(
          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
          value === "no"
            ? "border-slate-500 bg-slate-700 text-white shadow-sm ring-2 ring-slate-400/40"
            : "border-border/70 bg-background/60 text-muted-foreground hover:border-slate-400/50 hover:bg-muted/40"
        )}
      >
        {noLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("yes")}
        className={cn(
          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
          value === "yes"
            ? "border-emerald-500 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40"
            : "border-border/70 bg-background/60 text-muted-foreground hover:border-emerald-400/50 hover:bg-emerald-500/10"
        )}
      >
        {yesLabel}
      </button>
    </div>
  );
}

export function formatRetestSummary(bug: Pick<Bug, "tester_retested" | "tester_issue_fixed">): {
  label: string;
  className: string;
} {
  const retested = triState(bug.tester_retested);
  const issueFixed = triState(bug.tester_issue_fixed);
  if (retested === "unset") {
    return {
      label: "Retest pending",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    };
  }
  if (retested === "no") {
    return {
      label: "Not retested",
      className:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    };
  }
  if (issueFixed === "yes") {
    return {
      label: "Verified fixed",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    };
  }
  if (issueFixed === "no") {
    return {
      label: "Still broken",
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    };
  }
  return {
    label: "Retested",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  };
}

interface FileWithPreview extends File {
  preview?: string;
}

interface LocalVoiceNote {
  id: string;
  blob: Blob;
  duration: number;
  name: string;
  audioUrl: string;
  waveform?: number[];
}

interface TesterVerificationPanelProps {
  bug: Bug;
  onUpdated?: (bug: Bug) => void;
}

export function TesterVerificationPanel({ bug, onUpdated }: TesterVerificationPanelProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const role = String(currentUser?.role || "").toLowerCase();
  const canVerify = role === "admin" || role === "tester";
  const apiBaseUrl = ENV.API_URL;

  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [retested, setRetested] = useState<"yes" | "no" | "unset">(triState(bug.tester_retested));
  const [issueFixed, setIssueFixed] = useState<"yes" | "no" | "unset">(
    triState(bug.tester_issue_fixed)
  );
  const [bugLevel, setBugLevel] = useState<BugLevel>(
    (bug.bug_level as BugLevel) || "normal"
  );
  const [notes, setNotes] = useState(bug.tester_verification_notes || "");
  const [screenshots, setScreenshots] = useState<FileWithPreview[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<LocalVoiceNote[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);

  useEffect(() => {
    setRetested(triState(bug.tester_retested));
    setIssueFixed(triState(bug.tester_issue_fixed));
    setBugLevel((bug.bug_level as BugLevel) || "normal");
    setNotes(bug.tester_verification_notes || "");
    setScreenshots([]);
    setFiles([]);
    setVoiceNotes((prev) => {
      prev.forEach((v) => URL.revokeObjectURL(v.audioUrl));
      return [];
    });
    setAttachmentsToDelete([]);
  }, [bug.id, bug.tester_retested, bug.tester_issue_fixed, bug.bug_level, bug.tester_verification_notes]);

  const summary = useMemo(() => formatRetestSummary(bug), [bug]);

  const verificationAttachments = useMemo(
    () =>
      (bug.attachments || []).filter(
        (att) => isVerificationAttachment(att) && !attachmentsToDelete.includes(att.id)
      ),
    [bug.attachments, attachmentsToDelete]
  );

  const existingScreenshots = verificationAttachments.filter(isImageAttachment);
  const existingVoice = verificationAttachments.filter(isAudioAttachment);
  const existingFiles = verificationAttachments.filter(
    (att) => !isImageAttachment(att) && !isAudioAttachment(att)
  );

  const dirty =
    retested !== triState(bug.tester_retested) ||
    (retested === "yes" && issueFixed !== triState(bug.tester_issue_fixed)) ||
    bugLevel !== ((bug.bug_level as BugLevel) || "normal") ||
    notes.trim() !== (bug.tester_verification_notes || "").trim() ||
    screenshots.length > 0 ||
    files.length > 0 ||
    voiceNotes.length > 0 ||
    attachmentsToDelete.length > 0;

  const canSave =
    canVerify &&
    dirty &&
    retested !== "unset" &&
    (retested === "no" || issueFixed !== "unset");

  const buildImageUrl = (path: string) =>
    `${apiBaseUrl}/get_attachment.php?path=${encodeURIComponent(path)}`;
  const buildAudioUrl = (path: string) =>
    `${apiBaseUrl}/audio.php?path=${encodeURIComponent(path)}`;

  const addScreenshotFiles = (incoming: File[]) => {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    const withPreview = images.map((file) => {
      const enriched = file as FileWithPreview;
      enriched.preview = URL.createObjectURL(file);
      return enriched;
    });
    setScreenshots((prev) => [...prev, ...withPreview]);
  };

  const handleVoiceComplete = ({ blob, duration, waveform }: RecordedVoiceNote) => {
    const audioUrl = URL.createObjectURL(blob);
    setVoiceNotes((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        blob,
        duration: Math.max(1, Math.round(duration || 0)),
        name: `Verification voice ${existingVoice.length + prev.length + 1}`,
        audioUrl,
        waveform,
      },
    ]);
  };

  const clearLocalMedia = () => {
    screenshots.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    voiceNotes.forEach((v) => URL.revokeObjectURL(v.audioUrl));
    setScreenshots([]);
    setFiles([]);
    setVoiceNotes([]);
  };

  const handleSave = async () => {
    if (!canSave || !currentUser?.id) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("id", bug.id);
      formData.append("tester_retested", retested === "yes" ? "1" : "0");
      if (retested === "yes") {
        formData.append("tester_issue_fixed", issueFixed === "yes" ? "1" : "0");
      } else {
        formData.append("tester_issue_fixed", "");
      }
      formData.append("bug_level", bugLevel);
      formData.append("tester_verification_notes", notes.trim());
      formData.append("verification_upload", "1");
      formData.append("upload_context", "verification");
      formData.append("updated_by", currentUser.id);

      screenshots.forEach((file) => formData.append("screenshots[]", file));
      files.forEach((file) => formData.append("files[]", file));
      voiceNotes.forEach((vn) => {
        const ext = vn.blob.type.includes("webm")
          ? "webm"
          : vn.blob.type.includes("mp4")
            ? "mp4"
            : "wav";
        formData.append("voice_notes[]", vn.blob, `${vn.name}.${ext}`);
      });
      if (attachmentsToDelete.length > 0) {
        formData.append("attachments_to_delete", JSON.stringify(attachmentsToDelete));
      }

      const response = await apiClient.post<{ success: boolean; data: Bug; message?: string }>(
        "/bugs/update.php",
        formData
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || "Failed to save verification");
      }
      clearLocalMedia();
      setAttachmentsToDelete([]);
      onUpdated?.(response.data.data);
      toast({
        title: "Verification saved",
        description: "Retest details and evidence were updated.",
      });
    } catch (error) {
      toast({
        title: "Could not save verification",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const evidenceReadOnly = (
    <div className="space-y-3 pt-2 border-t border-border/60">
      {notes.trim() ? (
        <div className="space-y-1">
          <span className="text-muted-foreground text-sm">Notes:</span>
          <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
        </div>
      ) : null}
      {(existingScreenshots.length > 0 ||
        existingFiles.length > 0 ||
        existingVoice.length > 0) && (
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Verification evidence
          </span>
          {existingScreenshots.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {existingScreenshots.map((att) => (
                <a
                  key={att.id}
                  href={buildImageUrl(att.file_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg overflow-hidden border border-border/70"
                >
                  <img
                    src={buildImageUrl(att.file_path)}
                    alt={att.file_name}
                    className="h-20 w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
          {existingVoice.map((att) => (
            <WhatsAppVoiceMessage
              key={att.id}
              id={att.id}
              audioSource={buildAudioUrl(att.file_path)}
              isActive={activeVoiceId === att.id}
              onPlay={setActiveVoiceId}
              onPause={(id) => {
                if (id === activeVoiceId) setActiveVoiceId(null);
              }}
            />
          ))}
          {existingFiles.map((att) => (
            <a
              key={att.id}
              href={`${apiBaseUrl}/get_attachment.php?path=${encodeURIComponent(att.file_path)}&name=${encodeURIComponent(att.file_name)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {att.file_name}
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-5 rounded-2xl border border-sky-200/50 dark:border-sky-800/40 bg-gradient-to-br from-sky-50/80 via-background/40 to-indigo-50/50 dark:from-sky-950/20 dark:via-background/20 dark:to-indigo-950/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 rounded-lg bg-sky-600 p-1.5 shrink-0">
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              Tester verification
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Confirm retest outcome, add notes, and attach screenshots, files, or voice.
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("rounded-full font-medium", summary.className)}>
          {summary.label}
        </Badge>
      </div>

      {!canVerify ? (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Tester tested again:</span>
            <span className="font-medium text-foreground">
              {retested === "yes" ? "Yes" : retested === "no" ? "No" : "Not recorded"}
            </span>
          </div>
          {retested === "yes" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Issue fixed:</span>
              <span className="font-medium text-foreground">
                {issueFixed === "yes" ? "Yes" : issueFixed === "no" ? "No" : "Not recorded"}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Bug level:</span>
            <Badge variant="outline" className={bugLevelBadgeClass(bugLevel)}>
              {formatBugLevelLabel(bugLevel)}
            </Badge>
          </div>
          {bug.tester_verified_by_name || bug.tester_verified_at ? (
            <p className="text-xs text-muted-foreground pt-1">
              {bug.tester_verified_by_name ? `Verified by ${bug.tester_verified_by_name}` : "Verified"}
              {bug.tester_verified_at ? ` · ${formatDetailedDate(bug.tester_verified_at)}` : ""}
            </p>
          ) : null}
          {evidenceReadOnly}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-sky-500 to-cyan-600 rounded-full" />
              Tester tested again?
            </label>
            <YesNoButtons
              value={retested}
              disabled={saving}
              onChange={(next) => {
                setRetested(next);
                if (next === "no") setIssueFixed("unset");
              }}
            />
          </div>

          {retested === "yes" ? (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full" />
                Issue fixed?
              </label>
              <YesNoButtons
                value={issueFixed}
                disabled={saving}
                onChange={setIssueFixed}
                yesLabel="Yes — fixed"
                noLabel="No — still broken"
              />
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full" />
              Bug Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BUG_LEVEL_FORM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={saving}
                  onClick={() => setBugLevel(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-all",
                    bugLevel === option.value
                      ? option.selectedClass
                      : "border-border/70 bg-background/60 hover:bg-muted/30"
                  )}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div
                    className={cn(
                      "text-[11px] mt-0.5",
                      bugLevel === option.value ? "opacity-90" : "text-muted-foreground"
                    )}
                  >
                    {option.hint}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="tester-verification-notes"
              className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" />
              Verification Notes
            </label>
            <Textarea
              id="tester-verification-notes"
              value={notes}
              disabled={saving}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you retested, remaining issues, or confirmation notes…"
              className="min-h-[150px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
            />
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">
                Include retest steps, device details, or what still fails
              </span>
              <span className="font-semibold">{notes.length} characters</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" />
              <label className="text-base font-semibold text-gray-900 dark:text-white">
                Attachments
              </label>
            </div>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addScreenshotFiles(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const next = Array.from(e.target.files || []);
                if (next.length) setFiles((prev) => [...prev, ...next]);
                e.target.value = "";
              }}
            />

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {/* Screenshots */}
              <div
                className="space-y-4 min-w-0"
                tabIndex={0}
                onPaste={(e) => {
                  const pasted = Array.from(e.clipboardData.files || []);
                  if (pasted.length) addScreenshotFiles(pasted);
                }}
              >
                <ScreenshotDropZone
                  onAddFiles={addScreenshotFiles}
                  onOpenPicker={() => screenshotInputRef.current?.click()}
                  disabled={saving}
                />
                {(existingScreenshots.length > 0 || screenshots.length > 0) && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Screenshots ({existingScreenshots.length + screenshots.length})
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {existingScreenshots.map((att) => (
                        <div
                          key={att.id}
                          className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-2 group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                        >
                          <img
                            src={buildImageUrl(att.file_path)}
                            alt={att.file_name}
                            className="h-24 w-full object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6 absolute -top-1 -right-1 opacity-80 hover:opacity-100 shadow-lg"
                            disabled={saving}
                            onClick={() =>
                              setAttachmentsToDelete((prev) =>
                                prev.includes(att.id) ? prev : [...prev, att.id]
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <div className="text-xs truncate mt-2 px-1 text-gray-600 dark:text-gray-400 font-medium">
                            {att.file_name}
                          </div>
                        </div>
                      ))}
                      {screenshots.map((file, index) => (
                        <div
                          key={`new-ss-${index}`}
                          className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-2 group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                        >
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt={file.name}
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
                            disabled={saving}
                            onClick={() => {
                              setScreenshots((prev) => {
                                const next = [...prev];
                                const [removed] = next.splice(index, 1);
                                if (removed?.preview) URL.revokeObjectURL(removed.preview);
                                return next;
                              });
                            }}
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

              {/* Files */}
              <div className="space-y-4 min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-28 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-all duration-300 rounded-xl group"
                >
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                    <Paperclip className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Attach Files
                  </span>
                </Button>
                {(existingFiles.length > 0 || files.length > 0) && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Files ({existingFiles.length + files.length})
                    </div>
                    <div className="space-y-2">
                      {existingFiles.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800"
                        >
                          <div className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                            {att.file_name}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400"
                            disabled={saving}
                            onClick={() =>
                              setAttachmentsToDelete((prev) =>
                                prev.includes(att.id) ? prev : [...prev, att.id]
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {files.map((file, index) => (
                        <div
                          key={`new-file-${index}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400"
                            disabled={saving}
                            onClick={() =>
                              setFiles((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Voice notes */}
              <div className="space-y-4 min-w-0">
                <WhatsAppVoiceRecorder
                  disabled={saving}
                  maxDuration={300}
                  onComplete={handleVoiceComplete}
                  onCancel={() =>
                    toast({
                      title: "Recording cancelled",
                      description: "Hold the mic to record a new voice note.",
                    })
                  }
                />
                {(existingVoice.length > 0 || voiceNotes.length > 0) && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Voice Notes ({existingVoice.length + voiceNotes.length})
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {existingVoice.map((att) => {
                        const messageId = `verification-${att.id}`;
                        return (
                          <div
                            key={att.id}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800"
                          >
                            <WhatsAppVoiceMessage
                              id={messageId}
                              audioSource={buildAudioUrl(att.file_path)}
                              accent="received"
                              autoPlay
                              isActive={activeVoiceId === messageId}
                              onPlay={setActiveVoiceId}
                              onPause={(id) => {
                                if (id === activeVoiceId) setActiveVoiceId(null);
                              }}
                              onRemove={() =>
                                setAttachmentsToDelete((prev) =>
                                  prev.includes(att.id) ? prev : [...prev, att.id]
                                )
                              }
                            />
                          </div>
                        );
                      })}
                      {voiceNotes.map((vn) => (
                        <div
                          key={vn.id}
                          className="rounded-xl border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800"
                        >
                          <WhatsAppVoiceMessage
                            id={vn.id}
                            audioSource={vn.blob}
                            duration={vn.duration}
                            waveform={vn.waveform}
                            accent="sent"
                            autoPlay
                            isActive={activeVoiceId === vn.id}
                            onPlay={setActiveVoiceId}
                            onPause={(id) => {
                              if (id === activeVoiceId) setActiveVoiceId(null);
                            }}
                            onRemove={() =>
                              setVoiceNotes((prev) => {
                                const next = prev.filter((item) => item.id !== vn.id);
                                URL.revokeObjectURL(vn.audioUrl);
                                return next;
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Visible to admin &amp; tester editors
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!canSave || saving}
              onClick={handleSave}
              className="rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {issueFixed === "yes" ? (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  ) : issueFixed === "no" ? (
                    <XCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                  )}
                  Save verification
                </>
              )}
            </Button>
          </div>

          {bug.tester_verified_by_name || bug.tester_verified_at ? (
            <p className="text-xs text-muted-foreground">
              Last saved
              {bug.tester_verified_by_name ? ` by ${bug.tester_verified_by_name}` : ""}
              {bug.tester_verified_at ? ` · ${formatDetailedDate(bug.tester_verified_at)}` : ""}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
