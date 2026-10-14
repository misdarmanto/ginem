import { findAllAgentLogs, getAgentLogSummary, reportClientLatency } from './agentLogs'

export const AgentController = {
  findAll: findAllAgentLogs,
  summary: getAgentLogSummary,
  reportClientLatency
}
