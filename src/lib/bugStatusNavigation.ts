/**
 * Why: A newly fixed bug waits for tester verification. This URL focuses that
 * panel on the same bug detail page. Entry query params (from=project, from=bugs
 * context via absence, projectId, etc.) must be preserved so Back still returns
 * to Bugs / Project Bugs — never rewrite the entry point to from=retests.
 */
export function retestBugPath(
  role: string | null | undefined,
  bugId: string,
  options?: { search?: string }
): string {
  const prefix = role ? `/${role}` : "";
  const raw = options?.search ?? "";
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const qs = params.toString();
  return `${prefix}/bugs/${bugId}${qs ? `?${qs}` : ""}#tester-verification`;
}
