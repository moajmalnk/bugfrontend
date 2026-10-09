/**
 * Shared English / Malayalam / Both preference for Common CODO UI.
 * Why: Expert QA Process and real-world examples must switch language together
 * so juniors never hunt for Malayalam on a second control.
 */

export type CodoContentLang = 'en' | 'ml' | 'both';

const STORAGE_KEY = 'bugricer.codo.contentLang';

export function isCodoContentLang(value: unknown): value is CodoContentLang {
  return value === 'en' || value === 'ml' || value === 'both';
}

export function readStoredCodoContentLang(): CodoContentLang {
  if (typeof window === 'undefined') return 'both';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isCodoContentLang(raw) ? raw : 'both';
  } catch {
    return 'both';
  }
}

export function writeStoredCodoContentLang(lang: CodoContentLang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Map page language to playbook chrome (Both → English labels). */
export function playbookChromeLang(lang: CodoContentLang): 'en' | 'ml' {
  return lang === 'ml' ? 'ml' : 'en';
}
