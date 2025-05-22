import { ENV } from "@/lib/env";

export async function sendEmailNotification(
  to: string | string[], // Accept a single email or an array of emails
  subject: string,
  body: string,
  attachments: string[] = []
) {
  const response = await fetch(`${ENV.API_URL}/send-bug-notification.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, attachments }),
  });
  return response.json();
}