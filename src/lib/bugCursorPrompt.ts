export type CursorBugAttachment = {
  fileName: string;
  previewUrl: string;
  mediaUrl: string;
};

/**
 * Why: Admins and developers paste one note into Cursor instead of copying
 * the title, then downloading each recording into the project.
 */
export function buildCursorBugPrompt(input: {
  title: string;
  projectName?: string;
  status?: string;
  bugUrl: string;
  description?: string;
  expectedResult?: string;
  actualResult?: string;
  attachments: CursorBugAttachment[];
}): string {
  const lines = [
    "Refer to this bug and fix it.",
    "Use the preview link or fetch the direct file.",
    "",
    `Bug: ${input.title.trim() || "Untitled bug"}`,
  ];

  const project = (input.projectName || "").trim();
  if (project) lines.push(`Project: ${project}`);
  const status = (input.status || "").trim();
  if (status) lines.push(`Status: ${status.replace(/_/g, " ")}`);
  lines.push(`Page: ${input.bugUrl}`);

  const description = (input.description || "").trim();
  if (description) {
    lines.push("", "Description:", description);
  }
  const expected = (input.expectedResult || "").trim();
  if (expected) {
    lines.push("", "Expected result:", expected);
  }
  const actual = (input.actualResult || "").trim();
  if (actual) {
    lines.push("", "Actual result:", actual);
  }

  for (const file of input.attachments) {
    lines.push(
      "",
      `File: ${file.fileName}`,
      `Preview: ${file.previewUrl}`,
      `Direct file: ${file.mediaUrl}`
    );
  }

  return lines.join("\n");
}
