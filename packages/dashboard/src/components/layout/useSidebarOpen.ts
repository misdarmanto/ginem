import { useCallback, useState } from "react";

export const SIDEBAR_STORAGE_KEY = "ginem.sidebarOpen";

function readStoredState(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function storeState(open: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
  } catch {
    // storage can be blocked (private mode); the sidebar still works for this visit
  }
}

/** Whether the desktop sidebar is open. Open by default, and the choice survives a reload. */
export function useSidebarOpen() {
  const [open, setOpen] = useState(readStoredState);

  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current;
      storeState(next);
      return next;
    });
  }, []);

  return { open, toggle };
}
