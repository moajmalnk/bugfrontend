/**
 * Why: Users paste full Meet links as often as bare codes; normalise both to the
 * 10-letter abc-defg-hij form Google expects.
 */
export function normalizeMeetCode(raw: string): string | null {
  const fromUrl = raw.match(/meet\.google\.com\/([a-z-]+)/i)?.[1] ?? raw;
  const letters = fromUrl.replace(/[^a-z]/gi, '').toLowerCase();
  if (letters.length !== 10) return null;
  return `${letters.slice(0, 3)}-${letters.slice(3, 7)}-${letters.slice(7)}`;
}
