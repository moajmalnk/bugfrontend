import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ItemsPerPageSelect } from "./ItemsPerPageSelect";
import { cn } from "@/lib/utils";

export interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
  className?: string;
  compact?: boolean;
}

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

export function ListPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  itemLabel = "items",
  pageSizeOptions = [10, 25, 50],
  className,
  compact = false,
}: ListPaginationProps) {
  if (totalItems === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  const pages = getVisiblePages(currentPage, safeTotalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:gap-4 rounded-xl border border-border/50 bg-card/50 p-4 sm:p-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground">
          Showing{" "}
          <span className="font-semibold text-primary">
            {start}-{end}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-primary">{totalItems}</span>{" "}
          {itemLabel}
        </p>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Items per page
          </span>
          <ItemsPerPageSelect
            value={itemsPerPage}
            onChange={onPageSizeChange}
            options={pageSizeOptions}
            showIcon={false}
          />
        </div>
      </div>

      {safeTotalPages > 1 && (
        <div
          className={cn(
            "flex flex-col gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between",
            compact && "sm:justify-center"
          )}
        >
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Page{" "}
            <span className="font-semibold text-foreground">{currentPage}</span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{safeTotalPages}</span>
          </p>

          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-9 px-2.5 sm:px-3"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="hidden md:flex items-center gap-1">
              {pages.map((page, idx) =>
                page === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="h-9 w-9 p-0"
                    aria-label={`Page ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </Button>
                )
              )}
            </div>

            <div className="md:hidden">
              <label className="sr-only" htmlFor="page-select">
                Go to page
              </label>
              <select
                id="page-select"
                value={currentPage}
                onChange={(e) => onPageChange(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-medium"
              >
                {Array.from({ length: safeTotalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    Page {p}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange((p) => Math.min(safeTotalPages, p + 1))}
              disabled={currentPage >= safeTotalPages}
              className="h-9 px-2.5 sm:px-3"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
