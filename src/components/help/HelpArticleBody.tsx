import type { HelpBlock } from "@/lib/help/types";
import { HelpCallout } from "./HelpCallout";
import { HelpDataTable, HelpPermissionTable } from "./HelpPermissionTable";
import { HelpScreenshot } from "./HelpScreenshot";
import { HelpStepList } from "./HelpStepList";
import { HelpVideoEmbed } from "./HelpVideoEmbed";

interface HelpArticleBodyProps {
  blocks: HelpBlock[];
}

export function HelpArticleBody({ blocks }: HelpArticleBodyProps) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {block.text}
              </p>
            );
          case "list":
            return (
              <ul key={i} className="list-disc list-inside space-y-1.5 text-muted-foreground">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "steps":
            return <HelpStepList key={i} steps={block.steps} />;
          case "table":
            return (
              <HelpDataTable key={i} title={block.title} headers={block.headers} rows={block.rows} />
            );
          case "permission-table":
            return (
              <HelpPermissionTable key={i} title={block.title} rows={block.rows} />
            );
          case "callout":
            return (
              <HelpCallout key={i} variant={block.variant} title={block.title} text={block.text} />
            );
          case "screenshot":
            return (
              <HelpScreenshot
                key={i}
                src={block.src}
                alt={block.alt}
                caption={block.caption}
              />
            );
          case "video":
            return <HelpVideoEmbed key={i} title={block.title} videoUrl={block.videoUrl} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
