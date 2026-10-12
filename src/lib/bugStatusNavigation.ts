/**
 * Why: A newly fixed bug is not finished. It waits in Retests until a tester
 * or admin marks the issue fixed or still broken. This URL opens that step
 * and scrolls the verification panel into view.
 */
export function retestBugPath(role: string | null | undefined, bugId: string): string {
  const prefix = role ? `/${role}` : "";
  return `${prefix}/bugs/${bugId}?from=retests#tester-verification`;
}
