/**
 * Why: Production must never log tokens, API payloads, or PII to the browser console.
 * Use only for rare local debugging — calls are no-ops unless explicitly enabled in code.
 */
export function devOnlyLog(..._args: unknown[]): void {
  /* intentionally empty */
}

export function devOnlyWarn(..._args: unknown[]): void {
  /* intentionally empty */
}

export function devOnlyError(..._args: unknown[]): void {
  /* intentionally empty */
}
