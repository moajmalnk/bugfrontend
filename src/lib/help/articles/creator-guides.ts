import type { HelpArticle } from "../types";

export const creatorGuideArticles: HelpArticle[] = [
  {
    id: "creator-handbook",
    categoryId: "productivity",
    title: "Creator Handbook — BugCreative Workflow",
    description:
      "How Creators use BugRicer: assigned projects, BugCreative pipeline, daily updates, and collaboration tools.",
    roles: ["creator"],
    keywords: ["creator", "handbook", "bugcreative", "design", "assets", "poster", "reel"],
    readMinutes: 8,
    relatedIds: ["bugcreative-guide", "daily-work-update"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Creators on BugRicer manage design and content assets in BugCreative. Your sidebar is streamlined: Dashboard, assigned Projects, BugCreative, Docs, Sheets, Meet, ToDo, daily updates, leave, messages, CODO, and Help. Code-centric tools such as Bugs, Retests, and Fixes are hidden.",
          },
        ],
      },
      {
        id: "daily-flow",
        heading: "Typical daily flow",
        blocks: [
          {
            type: "list",
            items: [
              "Open Creator Dashboard to see drafts, in-review items, and due dates",
              "Create or edit assets in BugCreative (link or upload)",
              "Submit for admin review",
              "Apply requested changes and resubmit",
              "Publish completed work with a published date",
              "Log daily work in BugUpdate and check out on Saturdays via Weekly Report",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bugcreative-guide",
    categoryId: "productivity",
    title: "BugCreative — Assets & Review",
    description:
      "Create posters, reels, mockups, and documents; submit for review; and publish approved work.",
    roles: ["creator", "admin"],
    keywords: ["bugcreative", "creative", "asset", "review", "publish", "drive"],
    readMinutes: 6,
    relatedIds: ["creator-handbook"],
    sections: [
      {
        id: "statuses",
        heading: "Pipeline statuses",
        blocks: [
          {
            type: "table",
            headers: ["Status", "Meaning"],
            rows: [
              ["Draft", "You can edit and submit"],
              ["In Review", "Waiting for admin feedback"],
              ["Completed", "Approved — ready to publish"],
              ["Published", "Live with a published date"],
              ["Rejected", "Closed; feedback is stored"],
            ],
          },
        ],
      },
      {
        id: "source",
        heading: "Link or upload",
        blocks: [
          {
            type: "paragraph",
            text: "Paste a Drive or web link, or upload an image, PDF, MP4, or ZIP (max 25MB). Image uploads become the preview thumbnail.",
          },
        ],
      },
    ],
  },
];
