import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SIDEBAR_STORAGE_KEY, useSidebarOpen } from "./useSidebarOpen";

describe("useSidebarOpen", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is open by default", () => {
    const { result } = renderHook(() => useSidebarOpen());

    expect(result.current.open).toBe(true);
  });

  it("closes and opens again when toggled", () => {
    const { result } = renderHook(() => useSidebarOpen());

    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
  });

  it("remembers the choice across a reload", () => {
    const first = renderHook(() => useSidebarOpen());
    act(() => first.result.current.toggle());
    first.unmount();

    const second = renderHook(() => useSidebarOpen());

    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("false");
    expect(second.result.current.open).toBe(false);
  });

  it("starts open when the stored value is anything but 'false'", () => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, "garbage");

    expect(renderHook(() => useSidebarOpen()).result.current.open).toBe(true);
  });

  it("still works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useSidebarOpen());

    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });
});
