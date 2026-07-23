import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyTextButtonProps = {
  text: string;
  /** Shown in toast, e.g. "description" → "Description copied" */
  label?: string;
  className?: string;
  size?: "sm" | "md";
};

export function CopyTextButton({
  text,
  label = "text",
  className,
  size = "sm",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const trimmed = (text || "").trim();
  const disabled = !trimmed;

  const handleCopy = async () => {
    if (disabled) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
      } else {
        const ta = document.createElement("textarea");
        ta.value = trimmed;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      const pretty =
        label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
      toast({
        title: `${pretty} copied`,
        description: "Copied to clipboard.",
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Try again.",
        variant: "destructive",
      });
    }
  };

  const sizeClass =
    size === "md"
      ? "h-8 w-8"
      : "h-7 w-7";

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:opacity-50 disabled:pointer-events-none",
        sizeClass,
        className
      )}
      title={copied ? "Copied" : `Copy ${label}`}
      aria-label={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export default CopyTextButton;
