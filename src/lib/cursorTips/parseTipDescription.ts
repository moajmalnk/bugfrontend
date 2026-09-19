/**
 * Why: Keep Requirement / Malayalam parsing identical to Common CODO so bilingual
 * tip cards stay consistent without brittle per-field string hacks.
 */
export function parseTipDescription(description: string): {
  requirement: string;
  malayalam?: string;
} {
  const raw = description?.trim() ?? '';
  if (!raw) return { requirement: '' };

  const match = raw.match(/^([\s\S]*?)\n+Malayalam:\s*([\s\S]*)$/i);
  if (match) {
    return {
      requirement: match[1].trim(),
      malayalam: match[2].trim() || undefined,
    };
  }

  return { requirement: raw };
}
