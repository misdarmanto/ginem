import { useApiGet } from "@/hooks/api/useApiGet";
import { useTableDataQuery } from "@/hooks/api";
import {
  AGENT_API,
  summaryPath,
  type AgentLog,
  type AgentLogFilter,
  type AgentLogSummary,
} from "@/services/agentService";

/** New commands and their late-arriving outcome should show up without a manual refresh. */
const AGENT_LOG_REFRESH_MS = 5000;

export function useAgentLogsQuery(
  params: { page: number; size: number } & AgentLogFilter,
) {
  return useTableDataQuery<AgentLog>(AGENT_API.logs, {
    page: params.page,
    size: params.size,
    filter: { status: params.status, search: params.search },
    refetchInterval: AGENT_LOG_REFRESH_MS,
  });
}

export function useAgentSummaryQuery(filter: AgentLogFilter) {
  return useApiGet<AgentLogSummary>(summaryPath(filter), {
    refetchInterval: AGENT_LOG_REFRESH_MS,
  });
}
