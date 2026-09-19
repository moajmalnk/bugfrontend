import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyValue({ value, label }: { value?: string | null; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: label ? `${label} copied` : "Copied" });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-2 py-1 text-left font-mono text-xs text-foreground hover:bg-muted/60"
      title={label ? `Copy ${label}` : "Copy"}
    >
      <span className="truncate">{value}</span>
      {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
    </button>
  );
}
