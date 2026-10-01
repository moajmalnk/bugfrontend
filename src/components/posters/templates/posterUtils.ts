import { format, isValid, parseISO } from 'date-fns';

export type DateParts = {
  day: string;
  monthShort: string;
  monthLong: string;
  year: string;
  weekday: string;
};

export function getDateParts(iso: string | null): DateParts | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  return {
    day: format(d, 'd'),
    monthShort: format(d, 'MMM'),
    monthLong: format(d, 'MMMM'),
    year: format(d, 'yyyy'),
    weekday: format(d, 'EEEE'),
  };
}

/**
 * Shrinks display type for long strings so headlines never overflow the poster.
 * Why: CSS cannot auto-fit text to a box, and export must match the preview exactly.
 * @param text - the string being rendered
 * @param maxPx - size used when text is at or below `fitChars`
 * @param minPx - floor so very long text stays legible
 * @param fitChars - character count that still fits at `maxPx`
 */
export function fitFont(text: string, maxPx: number, minPx: number, fitChars: number): number {
  const len = Math.max(1, text.trim().length);
  if (len <= fitChars) return maxPx;
  return Math.max(minPx, Math.round((maxPx * fitChars) / len));
}

/** Soft paper grain built from layered gradients — no external texture image needed. */
export function paperTexture(base: string, alt: string): string {
  return [
    `radial-gradient(ellipse at 20% 15%, rgba(255,255,255,0.55) 0%, transparent 55%)`,
    `radial-gradient(ellipse at 85% 80%, ${alt} 0%, transparent 60%)`,
    `radial-gradient(ellipse at 50% 50%, ${base} 0%, ${alt} 100%)`,
  ].join(', ');
}

/** 1 -> "st", 2 -> "nd", 11 -> "th", 22 -> "nd". */
export function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
}
