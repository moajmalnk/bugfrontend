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

// Fetch tester emails from the backend
const res = await fetch(`${ENV.API_URL}/get_all_testers.php`);
const data = await res.json();
const testerEmails = data.emails; // This should be an array of emails

// Define 'description' and 'name' before using them
const name = data.name || "Unknown Bug";
const description = data.description || "No description provided.";

// Define currentUser or get it from your authentication/user context
const currentUser = { name: "Bug Ricer" }; // Replace this with actual user fetching logic

await sendEmailNotification(
  testerEmails,
  `New Bug Reported: ${name}`,
  `<b>${name}</b><br/>${description}<br/><br/>Reported by: ${currentUser?.name || "Bug Ricer"}`,
  data.attachments || []
);