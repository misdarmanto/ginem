import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("@/hooks/api", () => ({
  useTableDataQuery: (...args: unknown[]) => query(...args),
}));

import {
  LAST_SEEN_KEY,
  NOTIFICATION_COUNT,
  NOTIFICATION_REFRESH_MS,
  useSystemNotifications,
} from "./useSystemNotifications";

const log = (appLogId: number, appLogLevel = "error") => ({
  appLogId,
  appLogLevel,
  appLogMessage: `message ${appLogId}`,
  appLogSource: null,
  createdAt: "2026-10-15 10:00:00",
});

const respond = (ids: number[], extra: Record<string, unknown> = {}) =>
  query.mockReturnValue({
    data: { items: ids.map((id) => log(id)), totalItems: ids.length },
    isLoading: false,
    isError: false,
    ...extra,
  });

describe("useSystemNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("reads the newest logs from the same endpoint as the Logger page, and keeps refreshing", () => {
    respond([3, 2, 1]);

    renderHook(() => useSystemNotifications());

    expect(query).toHaveBeenCalledWith("/logs", {
      page: 1,
      size: NOTIFICATION_COUNT,
      refetchInterval: NOTIFICATION_REFRESH_MS,
    });
  });

  it("returns the entries as they come", () => {
    respond([3, 2, 1]);

    const { result } = renderHook(() => useSystemNotifications());

    expect(result.current.items.map((item) => item.appLogId)).toEqual([3, 2, 1]);
  });

  it("does not call history that existed before the first visit new", () => {
    respond([3, 2, 1]);

    const { result } = renderHook(() => useSystemNotifications());

    expect(result.current.unreadCount).toBe(0);
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe("3");
  });

  it("counts entries that arrived since the last visit", () => {
    localStorage.setItem(LAST_SEEN_KEY, "2");
    respond([5, 4, 3, 2, 1]);

    const { result } = renderHook(() => useSystemNotifications());

    expect(result.current.unreadCount).toBe(3);
    expect(result.current.lastSeenId).toBe(2);
  });

  it("clears the count once everything is marked as read, and remembers it", () => {
    localStorage.setItem(LAST_SEEN_KEY, "2");
    respond([5, 4, 3, 2, 1]);
    const { result } = renderHook(() => useSystemNotifications());

    act(() => result.current.markAllRead());

    expect(result.current.unreadCount).toBe(0);
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe("5");
  });

  it("counts the next entries after a read", () => {
    localStorage.setItem(LAST_SEEN_KEY, "5");
    respond([5, 4]);
    const { result, rerender } = renderHook(() => useSystemNotifications());
    expect(result.current.unreadCount).toBe(0);

    respond([7, 6, 5, 4]);
    rerender();

    expect(result.current.unreadCount).toBe(2);
  });

  it("never moves the read marker backwards", () => {
    localStorage.setItem(LAST_SEEN_KEY, "9");
    respond([5, 4]);
    const { result } = renderHook(() => useSystemNotifications());

    act(() => result.current.markAllRead());

    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe("9");
  });

  it("is quiet while loading and when there is nothing yet", () => {
    query.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const loading = renderHook(() => useSystemNotifications());
    expect(loading.result.current.items).toEqual([]);
    expect(loading.result.current.unreadCount).toBe(0);
    expect(loading.result.current.isLoading).toBe(true);

    respond([]);
    const empty = renderHook(() => useSystemNotifications());
    expect(empty.result.current.unreadCount).toBe(0);
  });

  it("passes a loading failure on", () => {
    query.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => useSystemNotifications());

    expect(result.current.isError).toBe(true);
  });

  it("still works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    respond([3, 2, 1]);

    const { result } = renderHook(() => useSystemNotifications());

    expect(result.current.items).toHaveLength(3);
    expect(result.current.unreadCount).toBe(0);
    vi.restoreAllMocks();
  });
});
