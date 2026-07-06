/**
 * Translate English text to Malayalam via MyMemory free API.
 */
export async function translateToMalayalam(text: string): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed) return text;

  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|ml`
  );

  if (!response.ok) {
    throw new Error('Translation failed');
  }

  const data = await response.json();
  return data?.responseData?.translatedText?.trim() || trimmed;
}
