import { describe, expect, it } from "vitest";
import {
  endToEndLatency,
  formatDateTime,
  formatMs,
  formatTokens,
  formatUsd,
} from "./format";

describe("formatMs", () => {
  it.each([
    [null, "—"],
    [undefined, "—"],
    [0, "0 ms"],
    [16, "16 ms"],
    [999, "999 ms"],
    [1000, "1.00 s"],
    [14050, "14.05 s"],
  ])("formats %p as %p", (input, expected) => {
    expect(formatMs(input)).toBe(expected);
  });
});

describe("formatTokens", () => {
  it("groups thousands the Indonesian way", () => {
    expect(formatTokens(11094)).toBe("11.094");
  });

  it("shows a dash when unknown", () => {
    expect(formatTokens(null)).toBe("—");
  });
});

describe("formatUsd", () => {
  it.each([
    [null, "—"],
    [0, "$0"],
    [0.00511, "$0.00511"],
    [0.0214, "$0.0214"],
    [1.5, "$1.5000"],
  ])("formats %p as %p", (input, expected) => {
    expect(formatUsd(input)).toBe(expected);
  });
});

describe("formatDateTime", () => {
  it("keeps the server's local time instead of shifting it", () => {
    expect(formatDateTime("2026-10-14 17:50:20")).toBe("14 Oct 2026 17:50:20");
  });

  it("shows a dash when missing and the raw text when unparseable", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not a date")).toBe("not a date");
  });
});

describe("endToEndLatency", () => {
  it("prefers what the browser measured", () => {
    expect(endToEndLatency({ clientLatencyMs: 14050, serverLatencyMs: 14040 })).toEqual({
      ms: 14050,
      measuredInBrowser: true,
    });
  });

  it("falls back to the server's own measurement", () => {
    expect(endToEndLatency({ clientLatencyMs: null, serverLatencyMs: 8000 })).toEqual({
      ms: 8000,
      measuredInBrowser: false,
    });
  });

  it("keeps a browser value of zero", () => {
    expect(endToEndLatency({ clientLatencyMs: 0, serverLatencyMs: 8000 }).measuredInBrowser).toBe(
      true,
    );
  });
});
