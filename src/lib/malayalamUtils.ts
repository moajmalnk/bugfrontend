const MALAYALAM_SCRIPT_RE = /[\u0D00-\u0D7F]/;
const TRANSLATE_CHUNK_SIZE = 420;

export function containsMalayalamScript(text: string): boolean {
  return MALAYALAM_SCRIPT_RE.test(text);
}

function splitTranslationChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf('. ', maxLen);
    if (splitAt < maxLen * 0.4) {
      splitAt = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitAt < maxLen * 0.25) {
      splitAt = maxLen;
    }

    const piece = remaining.slice(0, splitAt).trim();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateChunk(text: string): Promise<string> {
  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ml`
  );

  if (!response.ok) {
    throw new Error('Translation failed');
  }

  const data = await response.json();
  const translated = data?.responseData?.translatedText?.trim();
  if (!translated) {
    throw new Error('Translation failed');
  }

  return translated;
}

/**
 * Translate English text to Malayalam via MyMemory free API.
 * Long text is split into chunks so the full description is translated.
 */
export async function translateToMalayalam(text: string): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed) return text;
  if (containsMalayalamScript(trimmed)) return trimmed;

  const chunks = splitTranslationChunks(trimmed, TRANSLATE_CHUNK_SIZE);
  const translatedChunks = await Promise.all(chunks.map(translateChunk));
  const result = translatedChunks.join(' ').trim();

  if (trimmed.length > 12 && !containsMalayalamScript(result)) {
    throw new Error('Translation did not return Malayalam text');
  }

  return result || trimmed;
}
