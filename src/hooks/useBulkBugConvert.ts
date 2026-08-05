import { useCallback, useEffect, useMemo, useState } from "react";

type SelectableBug = {
  id: string;
  status?: string | null;
};

function isConvertible(bug: SelectableBug) {
  return bug.status !== "declined";
}

/**
 * Why: Shared multi-select state for bulk convert across Bugs and project lists.
 */
export function useBulkBugConvert<T extends SelectableBug>(pageBugs: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const pageSelectableIds = useMemo(
    () => pageBugs.filter(isConvertible).map((b) => b.id),
    [pageBugs]
  );

  const pageIdSet = useMemo(
    () => new Set(pageBugs.map((b) => b.id)),
    [pageBugs]
  );

  // Drop selections that left the current page / list
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (pageIdSet.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [pageIdSet]);

  const onSelectedChange = useCallback((bugId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(bugId);
      else next.delete(bugId);
      return next;
    });
  }, []);

  const onToggleSelectPage = useCallback(
    (select: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (select) {
          for (const id of pageSelectableIds) next.add(id);
        } else {
          for (const id of pageSelectableIds) next.delete(id);
        }
        return next;
      });
    },
    [pageSelectableIds]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedBugs = useMemo(
    () => pageBugs.filter((b) => selectedIds.has(b.id) && isConvertible(b)),
    [pageBugs, selectedIds]
  );

  const selectedCount = selectedBugs.length;
  const pageSelectableCount = pageSelectableIds.length;
  const allPageSelected =
    pageSelectableCount > 0 &&
    pageSelectableIds.every((id) => selectedIds.has(id));

  return {
    selectedIds,
    selectedBugs,
    selectedCount,
    pageSelectableCount,
    allPageSelected,
    bulkOpen,
    setBulkOpen,
    onSelectedChange,
    onToggleSelectPage,
    clearSelection,
    isSelected: (id: string) => selectedIds.has(id),
  };
}
