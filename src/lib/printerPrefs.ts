import { MAX_OFFSET_DOTS, type CutMode, type ReceiptFont } from "@/lib/escposReceipt";

/**
 * Device-level print preferences for this browser. Not business data: they
 * only describe how the local thermal printer should format slips.
 */
const FONT_KEY = "bugricer.thermal.font";
const CUT_KEY = "bugricer.thermal.cutMode";
const LEGACY_NV_LOGO_KEY = "bugricer.thermal.nvLogo";
const OFFSET_KEY = "bugricer.thermal.offsetDots";

/** 8 dots = 1mm on a 203dpi head; the stepper moves in whole millimetres. */
export const OFFSET_STEP_DOTS = 8;
/** Full head width by default; a shift trades columns for centring on offset heads. */
const DEFAULT_OFFSET_DOTS = 0;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked (private mode) — preference just won't persist */
  }
}

export const getPrintFont = (): ReceiptFont => (read(FONT_KEY) === "A" ? "A" : "B");
export const setPrintFont = (font: ReceiptFont) => write(FONT_KEY, font);

/** Defaults to a tear line: the HOP-H58 has a tear bar, not an auto-cutter. */
export const getCutMode = (): CutMode => {
  const saved = read(CUT_KEY);
  return saved === "full" || saved === "partial" ? saved : "tear";
};
export const setCutMode = (mode: CutMode) => write(CUT_KEY, mode);

export const clampOffset = (dots: number) =>
  Math.max(0, Math.min(MAX_OFFSET_DOTS, Math.round(dots / OFFSET_STEP_DOTS) * OFFSET_STEP_DOTS));

export const getPrintOffset = (): number => {
  const saved = read(OFFSET_KEY);
  const dots = saved === null ? NaN : Number(saved);
  return Number.isFinite(dots) ? clampOffset(dots) : DEFAULT_OFFSET_DOTS;
};
export const setPrintOffset = (dots: number) => write(OFFSET_KEY, String(clampOffset(dots)));

/** Drops the old "logo stored in printer" flags; slips always send the logo now. */
export function clearLegacyLogoPrefs() {
  try {
    localStorage.removeItem(LEGACY_NV_LOGO_KEY);
  } catch {
    /* storage blocked — nothing to clear */
  }
}
