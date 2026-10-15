import { Op, fn, col, where as whereFn, type WhereOptions } from 'sequelize'
import { StatusCodes } from 'http-status-codes'

import {
  AgentLogModel,
  type AgentLogChannel,
  type AgentLogSource,
  type AgentLogStatus,
  type IAgentLogAttributes,
  type IAgentToolCall
} from '../../models/AgentLogModel'
import type {
  IAgentLogSummaryQuery,
  IExportAgentLogs,
  IFindAllAgentLogs
} from '../../schemas/AgentLogSchema'
import { AppError } from '../../utilities/AppError'
import logger from '../../utilities/logger'
import { Pagination } from '../../utilities/pagination'
import type { ChatQueryTrace } from '../chat/Chat.service'
import { estimateCostUsd } from './llmPricing'
import { AgentOutcomeJudgeService } from './AgentOutcomeJudge.service'
import {
  outcomeFromReplyText,
  outcomeFromToolResults,
  type AgentOutcome
} from './agentOutcome'

export interface AgentViewer {
  userId: number
  role: 'user' | 'admin'
}

export type AgentExecutionResult =
  | { ok: true; reply: string; trace?: ChatQueryTrace }
  | { ok: false; error: string }

export interface AgentExecutionTiming {
  /** When the server first received the command (ms epoch). */
  receivedAt: number
  /** When it was put on the broker queue. */
  enqueuedAt: number
  /** When the worker picked it up. */
  consumedAt: number
  /** When the reply was ready. */
  finishedAt: number
}

export interface RecordExecutionInput {
  requestId: string
  userId?: number
  sessionId?: string
  source: AgentLogSource
  channel: AgentLogChannel
  command: string
  result: AgentExecutionResult
  timing: AgentExecutionTiming
}

function mergeToolCalls(trace: ChatQueryTrace | undefined): IAgentToolCall[] | null {
  if (trace == null || trace.toolCalls.length === 0) return null

  return trace.toolCalls.map((call) => {
    const result = trace.toolResults.find((candidate) => candidate.callId === call.id)
    return {
      name: call.name,
      args: call.args,
      // Successful output is not kept: it can hold device tokens and other secrets.
      ...(result != null && {
        ok: result.ok,
        ...(result.error != null && { error: result.error, output: result.output })
      })
    }
  })
}

const EXPORT_BATCH_SIZE = 500
/** Upper bound for one export, so a huge range cannot tie up the server. */
export const EXPORT_MAX_ROWS = 100_000

function toLikePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, '\\$&')}%`
}

export class AgentLogService {
  private static buildWhere(
    filters: Partial<Pick<IExportAgentLogs, 'status' | 'search' | 'from' | 'to'>>,
    viewer: AgentViewer
  ): WhereOptions<IAgentLogAttributes> {
    const where: Record<string | symbol, unknown> = { deleted: 0 }

    if (viewer.role !== 'admin') where.userId = viewer.userId
    if (filters.status != null) where.status = filters.status
    if (filters.search != null) where.command = { [Op.like]: toLikePattern(filters.search) }

    // Compare calendar dates as stored (WIB), so a day means the Indonesian day.
    const dateBounds = [
      filters.from != null && whereFn(fn('DATE', col('created_at')), Op.gte, filters.from),
      filters.to != null && whereFn(fn('DATE', col('created_at')), Op.lte, filters.to)
    ].filter((bound) => bound !== false)
    if (dateBounds.length > 0) where[Op.and] = dateBounds

    return where as WhereOptions<IAgentLogAttributes>
  }

  static toPlain(row: { get: (options: { plain: true }) => IAgentLogAttributes }) {
    const plain = row.get({ plain: true })
    return {
      ...plain,
      estimatedCostUsd: plain.estimatedCostUsd == null ? null : Number(plain.estimatedCostUsd)
    }
  }

  /**
   * Stores one executed command. Never throws: logging must not affect the user's reply.
   * Commands whose outcome tools cannot settle are saved as `pending` and labelled afterwards.
   */
  static async recordExecution(input: RecordExecutionInput): Promise<void> {
    try {
      const { result, timing } = input
      const trace = result.ok ? result.trace : undefined
      const usage = trace?.tokenUsage

      const outcome: AgentOutcome | null = result.ok
        ? outcomeFromToolResults(trace?.toolResults ?? [])
        : { status: 'failed', reason: result.error }

      const row = await AgentLogModel.create({
        requestId: input.requestId,
        userId: input.userId ?? null,
        sessionId: input.sessionId ?? null,
        source: input.source,
        channel: input.channel,
        command: input.command,
        reply: result.ok ? result.reply : null,
        status: outcome?.status ?? 'pending',
        statusReason: outcome?.reason ?? null,
        model: trace?.model ?? null,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
        cachedInputTokens: usage?.cachedInputTokens ?? null,
        estimatedCostUsd: estimateCostUsd(trace?.model, usage, new Date(timing.receivedAt)),
        queueWaitMs: timing.consumedAt - timing.enqueuedAt,
        contextLatencyMs: trace?.contextLatencyMs ?? null,
        agentLatencyMs: trace?.agentLatencyMs ?? null,
        serverLatencyMs: timing.finishedAt - timing.receivedAt,
        clientLatencyMs: null,
        toolCalls: mergeToolCalls(trace),
        deleted: false
      })

      if (outcome == null && result.ok) {
        await AgentLogService.settleOutcome(row.agentLogId, input.command, result.reply, trace)
      }
    } catch (recordError) {
      logger.error(`[AgentLogService] recordExecution failed: ${String(recordError)}`)
    }
  }

  private static async settleOutcome(
    agentLogId: number,
    command: string,
    reply: string,
    trace: ChatQueryTrace | undefined
  ): Promise<void> {
    const judged = await AgentOutcomeJudgeService.judge({
      command,
      reply,
      toolNames: trace?.toolCalls.map((call) => call.name) ?? []
    })
    const outcome = judged ?? outcomeFromReplyText(reply)

    await AgentLogModel.update(
      { status: outcome.status, statusReason: outcome.reason },
      { where: { agentLogId } }
    )
  }

  static async findAll(payload: IFindAllAgentLogs, viewer: AgentViewer) {
    try {
      const pager = new Pagination(payload.page, payload.size)
      const result = await AgentLogModel.findAndCountAll({
        where: this.buildWhere(payload, viewer),
        order: [['agentLogId', 'DESC']],
        ...(payload.pagination && { limit: pager.limit, offset: pager.offset })
      })

      return pager.formatData({
        count: result.count,
        rows: result.rows.map((row) => this.toPlain(row))
      })
    } catch (serviceError) {
      if (serviceError instanceof AppError) throw serviceError
      logger.error(`[AgentLogService] findAll failed: ${String(serviceError)}`)
      throw new AppError('Failed to fetch agent logs', StatusCodes.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Every matching log, oldest first, in batches so a large range never sits in memory at once.
   * Stops after EXPORT_MAX_ROWS.
   */
  static async *iterateForExport(
    filters: IExportAgentLogs,
    viewer: AgentViewer
  ): AsyncGenerator<ReturnType<typeof AgentLogService.toPlain>[]> {
    const base = this.buildWhere(filters, viewer)
    let cursor = 0
    let exported = 0

    while (exported < EXPORT_MAX_ROWS) {
      const rows = await AgentLogModel.findAll({
        where: { ...base, agentLogId: { [Op.gt]: cursor } },
        order: [['agentLogId', 'ASC']],
        limit: Math.min(EXPORT_BATCH_SIZE, EXPORT_MAX_ROWS - exported)
      })
      if (rows.length === 0) return

      cursor = rows[rows.length - 1].agentLogId
      exported += rows.length
      yield rows.map((row) => this.toPlain(row))
    }
  }

  static async summary(query: IAgentLogSummaryQuery, viewer: AgentViewer) {
    try {
      const where = this.buildWhere(query, viewer)

      const [byStatus, totals] = await Promise.all([
        AgentLogModel.findAll({
          where,
          attributes: ['status', [fn('COUNT', col('agent_log_id')), 'count']],
          group: ['status'],
          raw: true
        }) as unknown as Promise<Array<{ status: AgentLogStatus; count: string }>>,
        AgentLogModel.findOne({
          where,
          attributes: [
            [fn('AVG', col('client_latency_ms')), 'avgClientLatencyMs'],
            [fn('AVG', col('server_latency_ms')), 'avgServerLatencyMs'],
            [fn('SUM', col('input_tokens')), 'inputTokens'],
            [fn('SUM', col('output_tokens')), 'outputTokens'],
            [fn('SUM', col('total_tokens')), 'totalTokens'],
            [fn('SUM', col('estimated_cost_usd')), 'estimatedCostUsd']
          ],
          raw: true
        }) as unknown as Promise<Record<string, string | null> | null>
      ])

      const count = (status: AgentLogStatus): number =>
        Number(byStatus.find((row) => row.status === status)?.count ?? 0)
      const number = (key: string): number | null =>
        totals?.[key] == null ? null : Number(totals[key])

      return {
        total: byStatus.reduce((sum, row) => sum + Number(row.count), 0),
        success: count('success'),
        failed: count('failed'),
        clarification: count('clarification'),
        pending: count('pending'),
        avgClientLatencyMs: number('avgClientLatencyMs'),
        avgServerLatencyMs: number('avgServerLatencyMs'),
        inputTokens: number('inputTokens') ?? 0,
        outputTokens: number('outputTokens') ?? 0,
        totalTokens: number('totalTokens') ?? 0,
        estimatedCostUsd: number('estimatedCostUsd') ?? 0
      }
    } catch (serviceError) {
      if (serviceError instanceof AppError) throw serviceError
      logger.error(`[AgentLogService] summary failed: ${String(serviceError)}`)
      throw new AppError('Failed to summarise agent logs', StatusCodes.INTERNAL_SERVER_ERROR)
    }
  }

  /** The browser reports how long the command took from its own send to receiving the reply. */
  static async setClientLatency(
    requestId: string,
    clientLatencyMs: number,
    viewer: AgentViewer
  ): Promise<void> {
    try {
      const row = await AgentLogModel.findOne({
        where: { ...this.buildWhere({}, viewer), requestId },
        order: [['agentLogId', 'DESC']]
      })
      if (row == null) throw AppError.notFound('Agent log not found')

      await row.update({ clientLatencyMs })
    } catch (serviceError) {
      if (serviceError instanceof AppError) throw serviceError
      logger.error(`[AgentLogService] setClientLatency failed: ${String(serviceError)}`)
      throw new AppError('Failed to save client latency', StatusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}
