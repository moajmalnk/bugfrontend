type PosterFont = {
  family: string;
  file: string;
  weight: number;
  style?: 'normal' | 'italic';
};

export const POSTER_FONTS: PosterFont[] = [
  { family: 'PosterBebas', file: 'BebasNeue-Regular.woff2', weight: 400 },
  { family: 'PosterScript', file: 'GreatVibes-Regular.woff2', weight: 400 },
  { family: 'PosterPoppins', file: 'Poppins-Regular.woff2', weight: 400 },
  { family: 'PosterPoppins', file: 'Poppins-Italic.woff2', weight: 400, style: 'italic' },
  { family: 'PosterPoppins', file: 'Poppins-SemiBold.woff2', weight: 600 },
  { family: 'PosterPoppins', file: 'Poppins-Bold.woff2', weight: 700 },
  { family: 'PosterPoppins', file: 'Poppins-ExtraBold.woff2', weight: 800 },
  { family: 'PosterMalayalam', file: 'NotoSansMalayalam-Bold.woff2', weight: 700 },
];

export const POSTER_FONT_STACK = {
  display: "'PosterBebas', 'Oswald', Impact, sans-serif",
  script: "'PosterScript', 'Brush Script MT', cursive",
  body: "'PosterPoppins', 'Poppins', system-ui, sans-serif",
  malayalam: "'PosterMalayalam', 'Noto Sans Malayalam', 'PosterPoppins', sans-serif",
} as const;

const fontUrl = (file: string) => `/fonts/poster/${file}`;

let loadPromise: Promise<void> | null = null;
let embedCssPromise: Promise<string> | null = null;

/**
 * Registers poster fonts with the FontFace API so the live preview uses them.
 * Why: loading only when the studio opens keeps these fonts out of the main bundle path.
 */
export function loadPosterFonts(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(
    POSTER_FONTS.map(async (f) => {
      const face = new FontFace(f.family, `url(${fontUrl(f.file)}) format('woff2')`, {
        weight: String(f.weight),
        style: f.style ?? 'normal',
        display: 'swap',
      });
      await face.load();
      document.fonts.add(face);
    })
  )
    .then(() => undefined)
    .catch((err) => {
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Builds @font-face CSS with inlined data URLs for html-to-image.
 * Why: FontFace-API fonts are invisible to html-to-image's stylesheet scan,
 * so without explicit embed CSS the exported image would fall back to system fonts.
 */
export function getPosterFontEmbedCss(): Promise<string> {
  if (embedCssPromise) return embedCssPromise;
  embedCssPromise = Promise.all(
    POSTER_FONTS.map(async (f) => {
      const res = await fetch(fontUrl(f.file));
      if (!res.ok) throw new Error(`Font ${f.file} failed to load`);
      const dataUrl = await blobToDataUrl(await res.blob());
      return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:${f.style ?? 'normal'};src:url(${dataUrl}) format('woff2');}`;
    })
  )
    .then((rules) => rules.join('\n'))
    .catch((err) => {
      embedCssPromise = null;
      throw err;
    });
  return embedCssPromise;
}
