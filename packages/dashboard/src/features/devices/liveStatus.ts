export interface DeviceLiveStatus {
  reportedState: "on" | "off" | null;
  lastSeenAt: string | null;
  online: boolean;
}

interface PresenceSource {
  deviceStatus?: string | null;
  liveStatus?: DeviceLiveStatus | null;
}

/** What the device itself reports wins; the manually set status is only a fallback. */
export function resolvePresence(device: PresenceSource): "online" | "offline" {
  if (device.liveStatus) return device.liveStatus.online ? "online" : "offline";
  return String(device.deviceStatus ?? "").toLowerCase() === "online"
    ? "online"
    : "offline";
}

export function formatReportedState(
  liveStatus: DeviceLiveStatus | null | undefined,
): string {
  if (!liveStatus?.reportedState) return "No report";
  return `Reported ${liveStatus.reportedState.toUpperCase()}`;
}
