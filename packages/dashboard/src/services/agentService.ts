import { api, apiClient } from "./api";

export const AGENT_API = {
  logs: "/agent/logs",
  summary: "/agent/logs/summary",
  export: "/agent/logs/export",
  clientLatency: (requestId: string) =>
    `/agent/logs/${encodeURIComponent(requestId)}/client-latency`,
} as const;

export type AgentStatus = "pending" | "success" | "failed" | "clarification";
export type AgentChannel = "chat" | "voice";

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  ok?: boolean;
  error?: string;
  output?: string;
}

export interface AgentLog {
  agentLogId: number;
  requestId: string;
  userId: number | null;
  source: "web" | "whatsapp";
  channel: AgentChannel;
  command: string;
  reply: string | null;
  status: AgentStatus;
  statusReason: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cachedInputTokens: number | null;
  estimatedCostUsd: number | null;
  queueWaitMs: number | null;
  contextLatencyMs: number | null;
  agentLatencyMs: number | null;
  serverLatencyMs: number | null;
  clientLatencyMs: number | null;
  toolCalls: AgentToolCall[] | null;
  createdAt: string;
}

export interface AgentLogSummary {
  total: number;
  success: number;
  failed: number;
  clarification: number;
  pending: number;
  avgClientLatencyMs: number | null;
  avgServerLatencyMs: number | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AgentLogFilter {
  status?: string;
  search?: string;
}

export interface AgentLogExportFilter extends AgentLogFilter {
  /** First day included, YYYY-MM-DD. Empty or missing: from the beginning. */
  from?: string;
  /** Last day included, YYYY-MM-DD. Empty or missing: up to now. */
  to?: string;
}

/** The log row is written just after the reply is sent, so the first report may arrive too early. */
const REPORT_ATTEMPTS = 3;
const REPORT_RETRY_DELAY_MS = 1200;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function summaryPath(filter: AgentLogFilter): string {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  const query = params.toString();
  return query ? `${AGENT_API.summary}?${query}` : AGENT_API.summary;
}

export const agentService = {
  getSummary: (filter: AgentLogFilter) =>
    apiClient.get<AgentLogSummary>(summaryPath(filter)),

  /** The matching logs as a CSV file. Empty filters are left out of the request. */
  exportCsv: async (filter: AgentLogExportFilter): Promise<Blob> => {
    const params = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value),
    );
    const response = await api.get<Blob>(AGENT_API.export, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Tells the backend how long a command took from the browser's point of view (send to reply
   * received). Best effort: a failure to report must never disturb the user's conversation.
   */
  reportClientLatency: async (
    requestId: string,
    clientLatencyMs: number,
  ): Promise<void> => {
    for (let attempt = 1; attempt <= REPORT_ATTEMPTS; attempt += 1) {
      try {
        await apiClient.patch(AGENT_API.clientLatency(requestId), {
          clientLatencyMs,
        });
        return;
      } catch {
        if (attempt < REPORT_ATTEMPTS) await wait(REPORT_RETRY_DELAY_MS);
      }
    }
  },
};
