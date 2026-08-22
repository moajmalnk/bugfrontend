import { cn } from "@/lib/utils";
import { LIST_PAGE_SHELL } from "./listPageStyles";

interface ListPageShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Content-only shell — relies on MainLayout for padding and max-width. */
export function ListPageShell({ children, className }: ListPageShellProps) {
  return (
    <div className={cn(LIST_PAGE_SHELL, className)}>{children}</div>
  );
}
