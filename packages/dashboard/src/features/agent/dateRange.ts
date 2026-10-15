import moment from "moment";

export type RangePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "all"
  | "custom";

/** Calendar dates as YYYY-MM-DD, both inclusive. An empty string means no limit on that side. */
export interface DateRange {
  from: string;
  to: string;
}

export type RangeProblem = "incomplete" | "order" | null;

const DATE_FORMAT = "YYYY-MM-DD";

/**
 * The dates a preset stands for, counted from `now`. A week runs Monday to Sunday, as is usual in
 * Indonesia. Custom has no fixed dates.
 */
export function rangeForPreset(
  preset: Exclude<RangePreset, "custom">,
  now: Date = new Date(),
): DateRange {
  const day = moment(now);

  switch (preset) {
    case "today":
      return { from: day.format(DATE_FORMAT), to: day.format(DATE_FORMAT) };
    case "yesterday": {
      const yesterday = day.clone().subtract(1, "day").format(DATE_FORMAT);
      return { from: yesterday, to: yesterday };
    }
    case "thisWeek":
      return {
        from: day.clone().startOf("isoWeek").format(DATE_FORMAT),
        to: day.clone().endOf("isoWeek").format(DATE_FORMAT),
      };
    case "thisMonth":
      return {
        from: day.clone().startOf("month").format(DATE_FORMAT),
        to: day.clone().endOf("month").format(DATE_FORMAT),
      };
    case "all":
      return { from: "", to: "" };
  }
}

/** Why a custom range cannot be exported, or null when it can. */
export function rangeProblem(range: DateRange): RangeProblem {
  if (!range.from || !range.to) return "incomplete";
  return range.from > range.to ? "order" : null;
}

/** Same naming as the server's Content-Disposition, so the file is named the same either way. */
export function exportFileName(range: DateRange): string {
  if (!range.from && !range.to) return "agent-logs_all.csv";
  return `agent-logs_${range.from || "start"}_${range.to || "today"}.csv`;
}
