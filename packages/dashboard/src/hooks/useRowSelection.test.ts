import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRowSelection } from "./useRowSelection";

describe("useRowSelection", () => {
  it("toggles individual rows", () => {
    const { result } = renderHook(() => useRowSelection([1, 2, 3]));

    act(() => result.current.toggle(2));
    expect(result.current.selectedIds).toEqual([2]);
    expect(result.current.someSelected).toBe(true);

    act(() => result.current.toggle(2));
    expect(result.current.selectedIds).toEqual([]);
  });

  it("selects all rows, then clears them", () => {
    const { result } = renderHook(() => useRowSelection([1, 2, 3]));

    act(() => result.current.toggleAll());
    expect(result.current.selectedIds).toEqual([1, 2, 3]);
    expect(result.current.allSelected).toBe(true);
    expect(result.current.someSelected).toBe(false);

    act(() => result.current.toggleAll());
    expect(result.current.selectedIds).toEqual([]);
  });

  it("drops selections for rows that are no longer visible", () => {
    const { result, rerender } = renderHook(
      ({ ids }) => useRowSelection(ids),
      { initialProps: { ids: [1, 2, 3] } },
    );

    act(() => result.current.toggleAll());
    rerender({ ids: [3, 4] });

    expect(result.current.selectedIds).toEqual([3]);
  });
});
