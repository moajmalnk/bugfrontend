export type HelpRole = "admin" | "developer" | "tester" | "all";

export type HelpCalloutVariant = "info" | "warning" | "tip";

export interface HelpPermissionRow {
  role: string;
  access: string;
  notes?: string;
}

export interface HelpStep {
  title: string;
  body: string;
  screenshot?: string;
  screenshotCaption?: string;
  videoUrl?: string;
}

export type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; steps: HelpStep[] }
  | {
      type: "table";
      title?: string;
      headers: string[];
      rows: string[][];
    }
  | {
      type: "permission-table";
      title?: string;
      rows: HelpPermissionRow[];
    }
  | {
      type: "callout";
      variant: HelpCalloutVariant;
      title?: string;
      text: string;
    }
  | {
      type: "screenshot";
      src: string;
      alt: string;
      caption?: string;
    }
  | {
      type: "video";
      title?: string;
      videoUrl?: string;
    }
  | { type: "list"; items: string[] };

export interface HelpSection {
  id: string;
  heading: string;
  blocks: HelpBlock[];
}

export interface HelpArticle {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  roles: HelpRole[];
  keywords: string[];
  readMinutes: number;
  permissionKey?: string;
  sections: HelpSection[];
  relatedIds?: string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

export function helpImage(articleId: string, step: number): string {
  return `/help/images/${articleId}-step-${step}.svg`;
}
