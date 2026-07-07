import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const collaborationArticles: HelpArticle[] = [
  {
    id: "bugmessage-guide",
    categoryId: "collaboration",
    title: "BugMessage Guide",
    description: "Team messaging with text, voice notes, and group chats.",
    roles: ["all"],
    keywords: ["messages", "chat", "bugmessage", "voice"],
    readMinutes: 5,
    relatedIds: ["bugmeet-guide", "notifications-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugMessage provides real-time team chat. Admins and developers see it in the main sidebar; others may access it under Administration if granted MESSAGING_VIEW permission.",
          },
        ],
      },
      {
        id: "who-can-use",
        heading: "Who can use this",
        blocks: [
          {
            type: "permission-table",
            rows: [
              { role: "Admin / Developer", access: "Main nav BugMessage" },
              { role: "Others", access: "Requires MESSAGING_VIEW permission" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Send a message",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugMessage",
                body: "Click BugMessage in the sidebar.",
                screenshot: helpImage("bugmessage-guide", 1),
              },
              {
                title: "Select or create a chat",
                body: "Choose a direct message or group. Create groups for project teams.",
                screenshot: helpImage("bugmessage-guide", 2),
              },
              {
                title: "Compose and send",
                body: "Type a message, attach files, or record a voice note.",
                screenshot: helpImage("bugmessage-guide", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bugmeet-guide",
    categoryId: "collaboration",
    title: "BugMeet Video Meetings",
    description: "Create and join video meetings with screen sharing.",
    roles: ["admin", "developer"],
    keywords: ["meet", "video", "meeting", "bugmeet", "screen share"],
    readMinutes: 6,
    relatedIds: ["bugmessage-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugMeet provides built-in video conferencing for standups, bug triage, and team syncs. Not available to testers in the default configuration.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Join or create a meeting",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugMeet",
                body: "Click BugMeet in the sidebar.",
                screenshot: helpImage("bugmeet-guide", 1),
              },
              {
                title: "Create a meeting",
                body: "Click New Meeting, set a title, and share the meeting code or link.",
                screenshot: helpImage("bugmeet-guide", 2),
              },
              {
                title: "Join with code",
                body: "Enter a meeting code to join an existing session. Enable camera and microphone when prompted.",
                screenshot: helpImage("bugmeet-guide", 3),
              },
            ],
          },
        ],
      },
      {
        id: "video",
        heading: "Video walkthrough",
        blocks: [
          {
            type: "video",
            title: "BugMeet overview",
          },
        ],
      },
    ],
  },
  {
    id: "feedback-widget",
    categoryId: "collaboration",
    title: "Feedback Widget",
    description: "Rate BugRicer and submit feedback as an end user.",
    roles: ["all"],
    keywords: ["feedback", "rating", "rate us"],
    readMinutes: 2,
    relatedIds: ["feedback-stats"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The floating Rate Us button lets any user submit a 1–5 star rating and optional text feedback. Admins review submissions in Feedbacks.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Submit feedback",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Click Rate Us",
                body: "Find the floating feedback button on any page.",
                screenshot: helpImage("feedback-widget", 1),
              },
              {
                title: "Rate and comment",
                body: "Select 1–5 stars and optionally add text feedback.",
                screenshot: helpImage("feedback-widget", 2),
              },
              {
                title: "Submit or dismiss",
                body: "Submit once per account, or dismiss if you prefer not to rate.",
              },
            ],
          },
        ],
      },
    ],
  },
];
