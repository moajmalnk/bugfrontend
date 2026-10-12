import { ENV } from "@/lib/env";

export type AttachmentShareKind = "image" | "video" | "audio" | "pdf" | "text" | "file";

export type AttachmentSharePayload = {
  token: string;
  file_name: string;
  file_type: string;
  kind: AttachmentShareKind;
  bug_title?: string;
};

export type AttachmentShareLinks = {
  token: string;
  fileName: string;
  kind: AttachmentShareKind;
  previewUrl: string;
  mediaUrl: string;
  cursorPrompt: string;
};

export function publicAttachmentMediaUrl(token: string, download = false): string {
  const base = `${ENV.API_URL.replace(/\/$/, "")}/public/attachment_file.php?token=${encodeURIComponent(token)}`;
  return download ? `${base}&download=1` : base;
}

export function publicAttachmentPreviewUrl(token: string): string {
  return `${window.location.origin}/share/${encodeURIComponent(token)}`;
}

/**
 * Why: Cursor should receive one note with a preview page and a direct file
 * URL, so the recording does not have to be copied into the project first.
 */
export function buildCursorAttachmentPrompt(input: {
  bugTitle?: string;
  fileName: string;
  previewUrl: string;
  mediaUrl: string;
}): string {
  const lines = [
    "Refer to this attachment and fix the bug it shows.",
    "Use the preview link or fetch the direct file.",
    "",
  ];
  const title = (input.bugTitle || "").trim();
  if (title) {
    lines.push(`Bug: ${title}`);
  }
  lines.push(
    `File: ${input.fileName}`,
    `Preview: ${input.previewUrl}`,
    `Direct file: ${input.mediaUrl}`
  );
  return lines.join("\n");
}

export function toAttachmentShareLinks(
  payload: AttachmentSharePayload,
  bugTitle?: string
): AttachmentShareLinks {
  const previewUrl = publicAttachmentPreviewUrl(payload.token);
  const mediaUrl = publicAttachmentMediaUrl(payload.token);
  const fileName = payload.file_name || "attachment";
  return {
    token: payload.token,
    fileName,
    kind: payload.kind,
    previewUrl,
    mediaUrl,
    cursorPrompt: buildCursorAttachmentPrompt({
      bugTitle: bugTitle || payload.bug_title,
      fileName,
      previewUrl,
      mediaUrl,
    }),
  };
}

export async function copyShareText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}
