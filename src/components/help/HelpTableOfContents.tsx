import { useEffect, useState } from "react";
import type { HelpSection } from "@/lib/help/types";
import { cn } from "@/lib/utils";
import { helpInnerCard } from "./HelpPageShell";

interface HelpTableOfContentsProps {
  sections: HelpSection[];
  className?: string;
  activeSectionId?: string;
}

export function HelpTableOfContents({
  sections,
  className,
  activeSectionId,
}: HelpTableOfContentsProps) {
  if (sections.length <= 1) return null;

  return (
    <nav className={cn(helpInnerCard, "p-4", className)} aria-label="On this page">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      <ul className="space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
        {sections.map((section) => {
          const isActive = activeSectionId === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={cn(
                  "block py-1.5 pl-2 -ml-[2px] text-sm border-l-2 transition-colors",
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                {section.heading}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function useHelpActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    if (!sectionIds.length) return;

    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(id);
            }
          });
        },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds.join(",")]);

  return activeId;
}
