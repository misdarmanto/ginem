import { useCallback, useMemo, useState } from "react";

export function useRowSelection(visibleIds: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Only rows currently on screen count, so paging or filtering never leaves hidden selections.
  const selectedIds = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected],
  );

  const allSelected =
    visibleIds.length > 0 && selectedIds.length === visibleIds.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  }, [allSelected, visibleIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selectedIds, allSelected, someSelected, toggle, toggleAll, clear };
}
