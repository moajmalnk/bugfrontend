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
    relatedIds: ["bugcreative-guide", "daily-work-update", "checkin-attendance", "my-leave", "bugdates-guide"],
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
              "Check in at the start of the day; check out with an hours breakdown",
              "Log daily work in BugUpdate and submit the Weekly Report",
              "Check BugDates for upcoming holidays and events to design for",
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
    keywords: ["bugcreative", "creative", "asset", "review", "publish", "drive", "folder", "move", "copy", "cut", "paste"],
    readMinutes: 8,
    relatedIds: ["creator-handbook", "bugdates-guide", "period-filter-and-badges"],
    sections: [
      {
        id: "who-can-use",
        heading: "Who can use this",
        blocks: [
          {
            type: "permission-table",
            rows: [
              { role: "Creator", access: "Create, edit, and submit own assets" },
              { role: "CREATIVE_VIEW", access: "Open BugCreative" },
              { role: "CREATIVE_CREATE", access: "Create assets" },
              { role: "CREATIVE_MANAGE", access: "Edit any asset and assign creators" },
              { role: "CREATIVE_REVIEW", access: "Approve, request changes, or reject" },
            ],
          },
        ],
      },
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
          {
            type: "table",
            title: "Review outcomes",
            headers: ["Reviewer chooses", "Asset moves to"],
            rows: [
              ["Approved", "Completed"],
              ["Changes Requested", "Draft — edit and resubmit"],
              ["Rejected", "Rejected"],
            ],
          },
        ],
      },
      {
        id: "folders",
        heading: "Folders",
        blocks: [
          {
            type: "list",
            items: [
              "Click New folder to organise assets, Drive-style. Folders can nest up to 6 levels deep.",
              "Folder names must be unique within the same parent folder.",
              "A folder can only be deleted once it is empty — move or delete its subfolders and assets first.",
              "Select assets, then Copy, Cut, or Move to folder. You can act on up to 100 assets at once.",
            ],
          },
        ],
      },
      {
        id: "filters",
        heading: "Find assets",
        blocks: [
          {
            type: "paragraph",
            text: "Filter by status, material, platform, and Period (based on the created date). The Period defaults to All and stays in the page link, so you can share a filtered view.",
          },
          {
            type: "callout",
            variant: "tip",
            text: "From BugDates, Generate BugCreative Card drafts a poster for a holiday, observance, or company event.",
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
