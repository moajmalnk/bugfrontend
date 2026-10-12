import { useState } from "react";
import { Check, Loader2, SquareTerminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/axios";
import { buildCursorBugPrompt } from "@/lib/bugCursorPrompt";
import {
  copyShareText,
  toAttachmentShareLinks,
  type AttachmentSharePayload,
} from "@/lib/attachmentShare";
import { generateShareableUrl, getEffectiveRole } from "@/lib/utils";
import type { Bug } from "@/types";

type CopyBugForCursorButtonProps = {
  bug: Bug;
  currentUser?: { role?: string; role_id?: number | null } | null;
};

function bugFiles(bug: Bug): Array<{ id: string; file_name: string }> {
  if (bug.attachments?.length) {
    return bug.attachments
      .filter((file) => file.id && file.file_name)
      .map((file) => ({ id: file.id, file_name: file.file_name }));
  }
  return [
    ...(bug.screenshots || []).map((file) => ({
      id: file.id,
      file_name: file.name,
    })),
    ...(bug.files || []).map((file) => ({
      id: file.id,
      file_name: file.name,
    })),
  ].filter((file) => file.id && file.file_name);
}

/**
 * Why: Only people who fix bugs need a Cursor-ready brief. Testers and other
 * roles keep the plain title copy.
 */
export function CopyBugForCursorButton({
  bug,
  currentUser,
}: CopyBugForCursorButtonProps) {
  const role = getEffectiveRole(currentUser || {});
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (role !== "admin" && role !== "developer") return null;

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const attachments = [];
      for (const file of bugFiles(bug)) {
        try {
          const response = await apiClient.post<{
            success: boolean;
            data: AttachmentSharePayload;
          }>("/bugs/share_attachment.php", { attachment_id: file.id });
          const links = toAttachmentShareLinks(response.data.data, bug.title);
          attachments.push({
            fileName: links.fileName || file.file_name,
            previewUrl: links.previewUrl,
            mediaUrl: links.mediaUrl,
          });
        } catch {
          attachments.push({
            fileName: file.file_name,
            previewUrl: "",
            mediaUrl: "",
          });
        }
      }

      const prompt = buildCursorBugPrompt({
        title: bug.title,
        projectName: bug.project_name,
        status: bug.status,
        bugUrl: generateShareableUrl("bugs", bug.id),
        description: bug.description,
        expectedResult: bug.expected_result,
        actualResult: bug.actual_result,
        attachments: attachments.filter((file) => file.previewUrl && file.mediaUrl),
      });
      await copyShareText(prompt);
      setCopied(true);
      toast({
        title: "Cursor message copied",
        description: "Paste it into Cursor to fix this bug.",
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not build the Cursor message. Try again.",
        variant: "destructive",
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title="Copy Cursor message"
      aria-label="Copy Cursor message"
      className="h-9 w-9 shrink-0 rounded-xl p-0"
      disabled={copying}
      onClick={() => void handleCopy()}
    >
      {copying ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <SquareTerminal className="h-4 w-4" />
      )}
    </Button>
  );
}
