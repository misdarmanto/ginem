import type { AgentLogStatus } from '../../models/AgentLogModel'
import type { ChatToolResultTrace } from '../chat/Chat.service'

export type ResolvedAgentStatus = Exclude<AgentLogStatus, 'pending'>

export interface AgentOutcome {
  status: ResolvedAgentStatus
  reason: string
}

/** Tools that change something. Their success or failure decides the command's outcome. */
const MUTATING_TOOLS: ReadonlySet<string> = new Set([
  'set_actuator_state_by_device_name',
  'schedule_actuator_state_at',
  'schedule_sensor_data_at',
  'create_automation_rule',
  'set_automation_rule_active',
  'delete_automation_rule',
  'create_device_log'
])

const FAILURE_PATTERN =
  /\b(tidak (terdaftar|ditemukan|dapat|bisa|tersedia|ada)|gagal|maaf|belum (terdaftar|ada)|not found|cannot|unable)\b/i
const REASON_MAX_CHARS = 200

const truncate = (text: string): string => text.slice(0, REASON_MAX_CHARS)

/**
 * Decides the outcome from tool results alone, or returns null when they are not conclusive
 * (no tool ran, or only read-only tools ran without error).
 */
export function outcomeFromToolResults(
  results: readonly ChatToolResultTrace[]
): AgentOutcome | null {
  const mutating = results.filter((result) => MUTATING_TOOLS.has(result.name))

  const failed = (mutating.length > 0 ? mutating : results).find((result) => !result.ok)
  if (failed != null) {
    return { status: 'failed', reason: truncate(failed.error ?? failed.output) }
  }

  if (mutating.length > 0) {
    return { status: 'success', reason: `${mutating[0].name} succeeded` }
  }

  return null
}

/** Last-resort guess from the reply text when no tool result or judge is available. */
export function outcomeFromReplyText(reply: string): AgentOutcome {
  const text = reply.trim()

  if (text.endsWith('?')) {
    return { status: 'clarification', reason: 'Reply asks the user a question' }
  }
  if (FAILURE_PATTERN.test(text)) {
    return { status: 'failed', reason: 'Reply says the request could not be done' }
  }
  return { status: 'success', reason: 'Request answered' }
}
