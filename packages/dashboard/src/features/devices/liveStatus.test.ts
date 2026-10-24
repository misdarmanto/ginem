import { describe, expect, it } from "vitest";
import { formatReportedState, resolvePresence } from "./liveStatus";

const live = (online: boolean, reportedState: "on" | "off" | null = null) => ({
  online,
  reportedState,
  lastSeenAt: null,
});

describe("resolvePresence", () => {
  it("trusts the live status over the manually set one", () => {
    expect(
      resolvePresence({ deviceStatus: "online", liveStatus: live(false) }),
    ).toBe("offline");
    expect(
      resolvePresence({ deviceStatus: "offline", liveStatus: live(true) }),
    ).toBe("online");
  });

  it("falls back to the stored status without live data", () => {
    expect(resolvePresence({ deviceStatus: "online" })).toBe("online");
    expect(resolvePresence({})).toBe("offline");
  });
});

describe("formatReportedState", () => {
  it("shows what the device reported", () => {
    expect(formatReportedState(live(true, "on"))).toBe("Reported ON");
    expect(formatReportedState(live(true, "off"))).toBe("Reported OFF");
  });

  it("says so when the device has not reported", () => {
    expect(formatReportedState(live(true))).toBe("No report");
    expect(formatReportedState(undefined)).toBe("No report");
  });
});
