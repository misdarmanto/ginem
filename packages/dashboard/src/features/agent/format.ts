import moment from "moment";
import type { AgentStatus } from "@/services/agentService";

const EMPTY = "—";
const MS_PER_SECOND = 1000;
const SMALL_COST_USD = 0.01;
const tokenFormat = new Intl.NumberFormat("id-ID");

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return EMPTY;
  if (ms < MS_PER_SECOND) return `${Math.round(ms)} ms`;
  return `${(ms / MS_PER_SECOND).toFixed(2)} s`;
}

export function formatTokens(tokens: number | null | undefined): string {
  return tokens == null ? EMPTY : tokenFormat.format(tokens);
}

/** Small amounts keep more decimals so a single command's cost does not show as $0.00. */
export function formatUsd(usd: number | null | undefined): string {
  if (usd == null) return EMPTY;
  if (usd === 0) return "$0";
  return `$${usd.toFixed(usd < SMALL_COST_USD ? 5 : 4)}`;
}

/** The API already returns local (WIB) time strings, so no timezone shift is applied. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm:ss") : value;
}

export type StatusColor = "success" | "error" | "warning" | "default";

export const STATUS_COLOR: Record<AgentStatus, StatusColor> = {
  success: "success",
  failed: "error",
  clarification: "warning",
  pending: "default",
};

/** The latency the user felt: browser-measured when reported, otherwise the server's own. */
export function endToEndLatency(log: {
  clientLatencyMs: number | null;
  serverLatencyMs: number | null;
}): { ms: number | null; measuredInBrowser: boolean } {
  if (log.clientLatencyMs != null) {
    return { ms: log.clientLatencyMs, measuredInBrowser: true };
  }
  return { ms: log.serverLatencyMs, measuredInBrowser: false };
}
