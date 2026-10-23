import type { IAgentLogAttributes } from '../../models/AgentLogModel'

type ExportedLog = Omit<IAgentLogAttributes, 'estimatedCostUsd'> & {
  estimatedCostUsd: number | null
}

interface CsvColumn {
  header: string
  value: (log: ExportedLog) => unknown
}

/** Spreadsheet apps run a cell as a formula when it starts with one of these characters. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/
const NEEDS_QUOTES = /[",\r\n]/
const LINE_END = '\r\n'
const UTF8_BOM = '﻿'
const TOOL_LIST_SEPARATOR = '; '

/**
 * Stable English headers so exports stay comparable over time and easy to load into analysis tools.
 * Times are WIB, latencies are milliseconds, cost is USD.
 */
export const CSV_COLUMNS: readonly CsvColumn[] = [
  { header: 'time', value: (log) => log.createdAt },
  { header: 'request_id', value: (log) => log.requestId },
  { header: 'user_id', value: (log) => log.userId },
  { header: 'channel', value: (log) => (log.source === 'whatsapp' ? 'whatsapp' : log.channel) },
  { header: 'command', value: (log) => log.command },
  { header: 'reply', value: (log) => log.reply },
  { header: 'status', value: (log) => log.status },
  { header: 'status_reason', value: (log) => log.statusReason },
  { header: 'model', value: (log) => log.model },
  { header: 'input_tokens', value: (log) => log.inputTokens },
  { header: 'output_tokens', value: (log) => log.outputTokens },
  { header: 'total_tokens', value: (log) => log.totalTokens },
  { header: 'cached_input_tokens', value: (log) => log.cachedInputTokens },
  { header: 'estimated_cost_usd', value: (log) => log.estimatedCostUsd },
  { header: 'e2e_latency_browser_ms', value: (log) => log.clientLatencyMs },
  { header: 'server_latency_ms', value: (log) => log.serverLatencyMs },
  { header: 'queue_wait_ms', value: (log) => log.queueWaitMs },
  { header: 'context_ms', value: (log) => log.contextLatencyMs },
  { header: 'llm_ms', value: (log) => log.agentLatencyMs },
  {
    header: 'tools',
    value: (log) =>
      log.toolCalls
        ?.map((call) => (call.ok === false ? `${call.name} (failed)` : call.name))
        .join(TOOL_LIST_SEPARATOR) ?? null
  }
]

/** One CSV cell per RFC 4180, with formula-looking text neutralised. */
export function escapeCsvCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''

  let text = String(value)
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const toLine = (cells: readonly unknown[]): string => cells.map(escapeCsvCell).join(',') + LINE_END

/** The file start: a BOM so Excel reads UTF-8 correctly, then the header row. */
export function csvHeader(): string {
  return UTF8_BOM + toLine(CSV_COLUMNS.map((column) => column.header))
}

export function csvRow(log: ExportedLog): string {
  return toLine(CSV_COLUMNS.map((column) => column.value(log)))
}

/** Name for the downloaded file, from the (already validated) date range. */
export function csvFileName(from: string | undefined, to: string | undefined): string {
  if (from == null && to == null) return 'agent-logs_all.csv'
  return `agent-logs_${from ?? 'start'}_${to ?? 'today'}.csv`
}
