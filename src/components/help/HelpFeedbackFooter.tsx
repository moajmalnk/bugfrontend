import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { helpGlassCard } from "./HelpPageShell";
import { cn } from "@/lib/utils";

interface HelpFeedbackFooterProps {
  articleTitle: string;
}

export function HelpFeedbackFooter({ articleTitle }: HelpFeedbackFooterProps) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  if (feedback) {
    return (
      <div className={cn(helpGlassCard, "w-full p-6 sm:p-8 text-center")}>
        <p className="text-sm sm:text-base text-muted-foreground">
          Thanks for your feedback on &ldquo;{articleTitle}&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(helpGlassCard, "w-full p-6 sm:p-8")}>
      <p className="text-center font-semibold text-foreground mb-4">
        Was this article helpful?
      </p>
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl border-gray-200/70 dark:border-gray-700/70 h-10 px-6"
          onClick={() => setFeedback("yes")}
        >
          <ThumbsUp className="h-4 w-4" />
          Yes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl border-gray-200/70 dark:border-gray-700/70 h-10 px-6"
          onClick={() => setFeedback("no")}
        >
          <ThumbsDown className="h-4 w-4" />
          No
        </Button>
      </div>
    </div>
  );
}
