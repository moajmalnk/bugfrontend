import { ENV } from "@/lib/env";

/**
 * Build the Connect Google (re-authorization) URL.
 *
 * Why: the frontend — local or production — always talks to ENV.API_URL, and the
 * JWT in storage was issued by that backend. Sending localhost users to a local
 * XAMPP endpoint fails whenever local Apache/MySQL is not running and rejects
 * the production JWT anyway, so every environment uses the same backend and
 * only the return URL (current origin) differs.
 */
export function buildGoogleReauthUrl(token: string, userId: string, returnUrl: string): string {
  const params = new URLSearchParams({
    user_id: userId,
    token,
    return_url: returnUrl,
  });
  return `${ENV.API_URL}/oauth/production-reauth.php?${params.toString()}`;
}
