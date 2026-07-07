import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: "default" | "large";
}

export function HelpSearch({
  value,
  onChange,
  placeholder = "Search help articles...",
  className,
  size = "default",
}: HelpSearchProps) {
  return (
    <div
      className={cn(
        "relative flex items-center",
        size === "large" && "max-w-2xl mx-auto w-full",
        className
      )}
    >
      <Search
        className={cn(
          "absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none",
          size === "large" && "left-4 h-5 w-5"
        )}
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "pl-9 pr-9 border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm transition-shadow focus-visible:ring-blue-500/20",
          size === "large" && "h-12 pl-12 text-base rounded-2xl",
          size === "default" && "rounded-xl"
        )}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-1 h-7 w-7 rounded-lg",
            size === "large" && "right-2 h-8 w-8"
          )}
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
