/** Matches the backend 403 messages for hidden standards and non-CODO accounts. */
const STANDARDS_DENIED_PATTERN = /not enabled for your account|available to the CODO team only/i;

export function isStandardsDeniedError(error: unknown): boolean {
  return error instanceof Error && STANDARDS_DENIED_PATTERN.test(error.message);
}
