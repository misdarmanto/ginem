import { useCallback, useEffect, useMemo, useState } from "react";
import { useTableDataQuery } from "@/hooks/api";
import { LOGGER_API, type AppLog } from "@/services/loggerService";

export const LAST_SEEN_KEY = "ginem.notifications.lastSeenLogId";
export const NOTIFICATION_COUNT = 20;
/** New system events should reach the bell without a manual refresh. */
export const NOTIFICATION_REFRESH_MS = 10_000;

function readLastSeen(): number | null {
  try {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    const id = stored == null ? NaN : Number(stored);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function storeLastSeen(id: number): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(id));
  } catch {
    // blocked storage only means the unread count resets on reload
  }
}

/**
 * The newest system log entries (the same ones the Logger page lists), plus how many arrived
 * since the bell was last opened. History that existed before the first visit does not count as new.
 */
export function useSystemNotifications() {
  const { data, isLoading, isError } = useTableDataQuery<AppLog>(LOGGER_API.list, {
    page: 1,
    size: NOTIFICATION_COUNT,
    refetchInterval: NOTIFICATION_REFRESH_MS,
  });
  const [lastSeenId, setLastSeenId] = useState<number | null>(readLastSeen);

  const items = useMemo(() => data?.items ?? [], [data]);
  const newestId = useMemo(
    () => items.reduce((newest, item) => Math.max(newest, item.appLogId), 0),
    [items],
  );

  useEffect(() => {
    if (lastSeenId == null && data) {
      storeLastSeen(newestId);
      setLastSeenId(newestId);
    }
  }, [data, lastSeenId, newestId]);

  const unreadCount =
    lastSeenId == null
      ? 0
      : items.filter((item) => item.appLogId > lastSeenId).length;

  const markAllRead = useCallback(() => {
    if (newestId > (lastSeenId ?? 0)) {
      storeLastSeen(newestId);
      setLastSeenId(newestId);
    }
  }, [newestId, lastSeenId]);

  return { items, isLoading, isError, unreadCount, lastSeenId, markAllRead };
}
