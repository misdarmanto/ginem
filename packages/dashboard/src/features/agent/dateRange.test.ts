import { describe, expect, it } from "vitest";
import { exportFileName, rangeForPreset, rangeProblem } from "./dateRange";

// Wednesday 14 October 2026, 15:30 local time
const now = new Date(2026, 9, 14, 15, 30);

describe("rangeForPreset", () => {
  it("today is just today", () => {
    expect(rangeForPreset("today", now)).toEqual({ from: "2026-10-14", to: "2026-10-14" });
  });

  it("yesterday is just the day before", () => {
    expect(rangeForPreset("yesterday", now)).toEqual({ from: "2026-10-13", to: "2026-10-13" });
  });

  it("this week runs Monday to Sunday", () => {
    expect(rangeForPreset("thisWeek", now)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("this week from a Sunday still starts on the Monday before", () => {
    expect(rangeForPreset("thisWeek", new Date(2026, 9, 18, 9, 0))).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
  });

  it("this week from a Monday starts that day", () => {
    expect(rangeForPreset("thisWeek", new Date(2026, 9, 12, 9, 0))).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
  });

  it("this month covers the first to the last day", () => {
    expect(rangeForPreset("thisMonth", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it.each([
    [new Date(2026, 1, 10), "2026-02-01", "2026-02-28"],
    [new Date(2028, 1, 10), "2028-02-01", "2028-02-29"],
    [new Date(2026, 3, 30), "2026-04-01", "2026-04-30"],
  ])("this month handles month length for %s", (date, from, to) => {
    expect(rangeForPreset("thisMonth", date)).toEqual({ from, to });
  });

  it("yesterday crosses a month and year boundary", () => {
    expect(rangeForPreset("yesterday", new Date(2027, 0, 1, 0, 5))).toEqual({
      from: "2026-12-31",
      to: "2026-12-31",
    });
  });

  it("all time has no limits", () => {
    expect(rangeForPreset("all", now)).toEqual({ from: "", to: "" });
  });
});

describe("rangeProblem", () => {
  it("accepts a proper range, including a single day", () => {
    expect(rangeProblem({ from: "2026-10-01", to: "2026-10-15" })).toBeNull();
    expect(rangeProblem({ from: "2026-10-15", to: "2026-10-15" })).toBeNull();
  });

  it.each([
    [{ from: "", to: "2026-10-15" }],
    [{ from: "2026-10-01", to: "" }],
    [{ from: "", to: "" }],
  ])("flags the incomplete range %j", (range) => {
    expect(rangeProblem(range)).toBe("incomplete");
  });

  it("flags a range that ends before it starts", () => {
    expect(rangeProblem({ from: "2026-10-15", to: "2026-10-01" })).toBe("order");
  });
});

describe("exportFileName", () => {
  it.each([
    [{ from: "", to: "" }, "agent-logs_all.csv"],
    [{ from: "2026-10-01", to: "2026-10-15" }, "agent-logs_2026-10-01_2026-10-15.csv"],
    [{ from: "2026-10-01", to: "" }, "agent-logs_2026-10-01_today.csv"],
    [{ from: "", to: "2026-10-15" }, "agent-logs_start_2026-10-15.csv"],
  ])("names %j as %s", (range, expected) => {
    expect(exportFileName(range)).toBe(expected);
  });
});
