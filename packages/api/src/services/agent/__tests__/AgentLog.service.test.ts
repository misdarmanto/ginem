import { Op } from 'sequelize'
import { StatusCodes } from 'http-status-codes'
import type { ChatQueryTrace } from '../../chat/Chat.service'
import {
  AgentLogService,
  EXPORT_MAX_ROWS,
  type RecordExecutionInput
} from '../AgentLog.service'

jest.mock('../../../models/AgentLogModel', () => ({
  AgentLogModel: {
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn()
  }
}))

jest.mock('../AgentOutcomeJudge.service', () => ({
  AgentOutcomeJudgeService: { judge: jest.fn() }
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

const { AgentLogModel } = jest.requireMock('../../../models/AgentLogModel')
const { AgentOutcomeJudgeService } = jest.requireMock('../AgentOutcomeJudge.service')

const timing = { receivedAt: 1_000, enqueuedAt: 1_020, consumedAt: 1_070, finishedAt: 3_500 }

function trace(overrides: Partial<ChatQueryTrace> = {}): ChatQueryTrace {
  return {
    toolCalls: [],
    toolResults: [],
    agentLatencyMs: 2_200,
    contextLatencyMs: 900,
    model: 'gpt-4o',
    tokenUsage: { inputTokens: 1000, outputTokens: 100, totalTokens: 1100, cachedInputTokens: 0 },
    ...overrides
  }
}

function input(overrides: Partial<RecordExecutionInput> = {}): RecordExecutionInput {
  return {
    requestId: 'req-1',
    userId: 7,
    sessionId: 'web:7',
    source: 'web',
    channel: 'chat',
    command: 'tolong hidupkan lampu ruang tamu',
    result: {
      ok: true,
      reply: 'Lampu ruang tamu sudah menyala.',
      trace: trace({
        toolCalls: [
          { id: 'call-1', name: 'set_actuator_state_by_device_name', args: { state: 'on' } }
        ],
        toolResults: [
          {
            callId: 'call-1',
            name: 'set_actuator_state_by_device_name',
            ok: true,
            output: '{"success":true}'
          }
        ]
      })
    },
    timing,
    ...overrides
  }
}

const createdRow = () => AgentLogModel.create.mock.calls[0][0]

describe('AgentLogService.recordExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    AgentLogModel.create.mockResolvedValue({ agentLogId: 5 })
  })

  it('stores a successful command with timings, tokens and estimated cost', async () => {
    await AgentLogService.recordExecution(input())

    expect(createdRow()).toMatchObject({
      requestId: 'req-1',
      userId: 7,
      source: 'web',
      channel: 'chat',
      command: 'tolong hidupkan lampu ruang tamu',
      reply: 'Lampu ruang tamu sudah menyala.',
      status: 'success',
      model: 'gpt-4o',
      inputTokens: 1000,
      outputTokens: 100,
      totalTokens: 1100,
      queueWaitMs: 50,
      contextLatencyMs: 900,
      agentLatencyMs: 2_200,
      serverLatencyMs: 2_500,
      clientLatencyMs: null
    })
    expect(createdRow().estimatedCostUsd).toBeCloseTo(0.0035, 10)
  })

  it('pairs each tool call with whether it worked, without keeping successful output', async () => {
    await AgentLogService.recordExecution(input())

    expect(createdRow().toolCalls).toEqual([
      { name: 'set_actuator_state_by_device_name', args: { state: 'on' }, ok: true }
    ])
  })

  it('does not store output of a successful tool, which can hold device tokens', async () => {
    await AgentLogService.recordExecution(
      input({
        result: {
          ok: true,
          reply: 'ok',
          trace: trace({
            toolCalls: [{ id: 'c1', name: 'list_devices', args: {} }],
            toolResults: [
              {
                callId: 'c1',
                name: 'list_devices',
                ok: true,
                output: '{"deviceToken":"fck_secret"}'
              }
            ]
          })
        }
      })
    )

    expect(JSON.stringify(createdRow().toolCalls)).not.toContain('fck_secret')
  })

  it('keeps the error text of a failed tool', async () => {
    await AgentLogService.recordExecution(
      input({
        result: {
          ok: true,
          reply: 'Maaf',
          trace: trace({
            toolCalls: [{ id: 'c1', name: 'set_actuator_state_by_device_name', args: {} }],
            toolResults: [
              {
                callId: 'c1',
                name: 'set_actuator_state_by_device_name',
                ok: false,
                error: 'Device not found',
                output: '{"error":"Device not found"}'
              }
            ]
          })
        }
      })
    )

    expect(createdRow().toolCalls[0]).toMatchObject({
      ok: false,
      error: 'Device not found',
      output: '{"error":"Device not found"}'
    })
  })

  it('does not call the judge when a tool already settled the outcome', async () => {
    await AgentLogService.recordExecution(input())

    expect(AgentOutcomeJudgeService.judge).not.toHaveBeenCalled()
    expect(AgentLogModel.update).not.toHaveBeenCalled()
  })

  it('marks an unregistered device as failed with the tool error as the reason', async () => {
    await AgentLogService.recordExecution(
      input({
        command: 'hidupkan TV',
        result: {
          ok: true,
          reply: 'Maaf, perangkat TV tidak terdaftar.',
          trace: trace({
            toolCalls: [
              { id: 'c1', name: 'set_actuator_state_by_device_name', args: { deviceName: 'TV' } }
            ],
            toolResults: [
              {
                callId: 'c1',
                name: 'set_actuator_state_by_device_name',
                ok: false,
                error: 'Device not found',
                output: '{"error":"Device not found"}'
              }
            ]
          })
        }
      })
    )

    expect(createdRow()).toMatchObject({ status: 'failed', statusReason: 'Device not found' })
  })

  it('saves as pending, then labels the outcome with the judge when no tool settled it', async () => {
    AgentOutcomeJudgeService.judge.mockResolvedValue({
      status: 'clarification',
      reason: 'Two lamps match'
    })

    await AgentLogService.recordExecution(
      input({ result: { ok: true, reply: 'Lampu yang mana?', trace: trace() } })
    )

    expect(createdRow()).toMatchObject({ status: 'pending', statusReason: null })
    expect(AgentLogModel.update).toHaveBeenCalledWith(
      { status: 'clarification', statusReason: 'Two lamps match' },
      { where: { agentLogId: 5 } }
    )
  })

  it('falls back to reading the reply when the judge cannot decide', async () => {
    AgentOutcomeJudgeService.judge.mockResolvedValue(null)

    await AgentLogService.recordExecution(
      input({ result: { ok: true, reply: 'Lampu yang mana?', trace: trace() } })
    )

    expect(AgentLogModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'clarification' }),
      expect.anything()
    )
  })

  it('records an agent crash as failed, without tokens or a reply', async () => {
    await AgentLogService.recordExecution(
      input({ result: { ok: false, error: 'Failed to process chat message' } })
    )

    expect(createdRow()).toMatchObject({
      status: 'failed',
      statusReason: 'Failed to process chat message',
      reply: null,
      inputTokens: null,
      estimatedCostUsd: null
    })
  })

  it('leaves cost empty when the provider reported no token usage', async () => {
    await AgentLogService.recordExecution(
      input({ result: { ok: true, reply: 'ok', trace: trace({ tokenUsage: undefined }) } })
    )

    expect(createdRow()).toMatchObject({ inputTokens: null, estimatedCostUsd: null })
  })

  it('never throws, so logging cannot break the reply', async () => {
    AgentLogModel.create.mockRejectedValue(new Error('db down'))

    await expect(AgentLogService.recordExecution(input())).resolves.toBeUndefined()
  })
})

describe('AgentLogService.findAll', () => {
  const user = { userId: 7, role: 'user' as const }
  const admin = { userId: 1, role: 'admin' as const }
  const query = {
    page: 1,
    size: 10,
    pagination: true,
    status: undefined,
    search: undefined
  }
  const row = { get: () => ({ agentLogId: 1, estimatedCostUsd: '0.00350000' }) }

  beforeEach(() => {
    jest.clearAllMocks()
    AgentLogModel.findAndCountAll.mockResolvedValue({ count: 1, rows: [row] })
  })

  const whereOf = () => AgentLogModel.findAndCountAll.mock.calls[0][0].where

  it('limits a normal user to their own commands', async () => {
    await AgentLogService.findAll(query, user)

    expect(whereOf()).toMatchObject({ deleted: 0, userId: 7 })
  })

  it('lets an admin see everyone', async () => {
    await AgentLogService.findAll(query, admin)

    expect(whereOf().userId).toBeUndefined()
  })

  it('filters by status and searches the command text', async () => {
    await AgentLogService.findAll({ ...query, status: 'failed', search: 'lampu' }, admin)

    expect(whereOf()).toMatchObject({
      status: 'failed',
      command: { [Op.like]: '%lampu%' }
    })
  })

  it('escapes LIKE wildcards in the search term', async () => {
    await AgentLogService.findAll({ ...query, search: '50%_off' }, admin)

    expect(whereOf().command[Op.like]).toBe('%50\\%\\_off%')
  })

  it('returns the newest first and the cost as a number', async () => {
    const result = await AgentLogService.findAll(query, admin)

    expect(AgentLogModel.findAndCountAll.mock.calls[0][0].order).toEqual([
      ['agentLogId', 'DESC']
    ])
    expect(result.items[0].estimatedCostUsd).toBe(0.0035)
  })

  it('wraps database errors as a generic 500', async () => {
    AgentLogModel.findAndCountAll.mockRejectedValue(new Error('db down'))

    await expect(AgentLogService.findAll(query, admin)).rejects.toMatchObject({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'Failed to fetch agent logs'
    })
  })
})

describe('AgentLogService.summary', () => {
  const admin = { userId: 1, role: 'admin' as const }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('counts commands per outcome and totals tokens and cost', async () => {
    AgentLogModel.findAll.mockResolvedValue([
      { status: 'success', count: '8' },
      { status: 'failed', count: '2' },
      { status: 'clarification', count: '1' }
    ])
    AgentLogModel.findOne.mockResolvedValue({
      avgClientLatencyMs: '2500.5',
      avgServerLatencyMs: '2100',
      inputTokens: '9000',
      outputTokens: '900',
      totalTokens: '9900',
      estimatedCostUsd: '0.031'
    })

    expect(await AgentLogService.summary({ status: undefined, search: undefined }, admin)).toEqual({
      total: 11,
      success: 8,
      failed: 2,
      clarification: 1,
      pending: 0,
      avgClientLatencyMs: 2500.5,
      avgServerLatencyMs: 2100,
      inputTokens: 9000,
      outputTokens: 900,
      totalTokens: 9900,
      estimatedCostUsd: 0.031
    })
  })

  it('reports zeros and no latency when there are no logs yet', async () => {
    AgentLogModel.findAll.mockResolvedValue([])
    AgentLogModel.findOne.mockResolvedValue({
      avgClientLatencyMs: null,
      avgServerLatencyMs: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null
    })

    expect(await AgentLogService.summary({ status: undefined, search: undefined }, admin)).toMatchObject({
      total: 0,
      avgClientLatencyMs: null,
      totalTokens: 0,
      estimatedCostUsd: 0
    })
  })

  it('scopes the totals to the current user', async () => {
    AgentLogModel.findAll.mockResolvedValue([])
    AgentLogModel.findOne.mockResolvedValue(null)

    await AgentLogService.summary(
      { status: undefined, search: undefined },
      { userId: 7, role: 'user' }
    )

    expect(AgentLogModel.findAll.mock.calls[0][0].where).toMatchObject({ userId: 7 })
  })
})

describe('AgentLogService.setClientLatency', () => {
  const user = { userId: 7, role: 'user' as const }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("saves the browser's measurement on the user's own log", async () => {
    const update = jest.fn().mockResolvedValue(undefined)
    AgentLogModel.findOne.mockResolvedValue({ update })

    await AgentLogService.setClientLatency('req-1', 2_345, user)

    expect(AgentLogModel.findOne.mock.calls[0][0].where).toMatchObject({
      requestId: 'req-1',
      userId: 7
    })
    expect(update).toHaveBeenCalledWith({ clientLatencyMs: 2_345 })
  })

  it('returns 404 when the log does not exist or belongs to someone else', async () => {
    AgentLogModel.findOne.mockResolvedValue(null)

    await expect(AgentLogService.setClientLatency('nope', 1, user)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND
    })
  })
})

describe('AgentLogService date range and export', () => {
  const user = { userId: 7, role: 'user' as const }
  const admin = { userId: 1, role: 'admin' as const }
  const filters = { status: undefined, search: undefined, from: undefined, to: undefined }
  const rowOf = (id: number) => ({
    agentLogId: id,
    get: () => ({ agentLogId: id, estimatedCostUsd: '0.001' })
  })
  const whereOfCall = (n: number) => AgentLogModel.findAll.mock.calls[n][0].where

  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function drain(generator: AsyncGenerator<unknown[]>) {
    const batches: unknown[][] = []
    for await (const batch of generator) batches.push(batch)
    return batches
  }

  describe('date filter', () => {
    it.each([
      [{ from: '2026-10-01', to: '2026-10-15' }, 2],
      [{ from: '2026-10-01' }, 1],
      [{ to: '2026-10-15' }, 1],
      [{}, 0]
    ])('applies %p as %p date bound(s)', async (range, bounds) => {
      AgentLogModel.findAll.mockResolvedValue([])

      await drain(AgentLogService.iterateForExport({ ...filters, ...range }, admin))

      const where = whereOfCall(0)
      const symbols = Object.getOwnPropertySymbols(where)
      expect(symbols.length === 0 ? 0 : where[symbols[0]].length).toBe(bounds)
    })
  })

  describe('iterateForExport', () => {
    it('yields rows oldest first, in batches, following an id cursor', async () => {
      const first = Array.from({ length: 500 }, (_, i) => rowOf(i + 1))
      const second = [rowOf(501), rowOf(502)]
      AgentLogModel.findAll
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second)
        .mockResolvedValueOnce([])

      const batches = await drain(AgentLogService.iterateForExport(filters, admin))

      expect(batches.map((batch) => batch.length)).toEqual([500, 2])
      const firstCall = AgentLogModel.findAll.mock.calls[0][0]
      expect(firstCall.order).toEqual([['agentLogId', 'ASC']])
      expect(firstCall.where.agentLogId[Op.gt]).toBe(0)
      expect(AgentLogModel.findAll.mock.calls[1][0].where.agentLogId[Op.gt]).toBe(500)
      expect(AgentLogModel.findAll.mock.calls[2][0].where.agentLogId[Op.gt]).toBe(502)
    })

    it('returns numbers for the cost', async () => {
      AgentLogModel.findAll.mockResolvedValueOnce([rowOf(1)]).mockResolvedValueOnce([])

      const [batch] = (await drain(AgentLogService.iterateForExport(filters, admin))) as Array<
        Array<{ estimatedCostUsd: number }>
      >

      expect(batch[0].estimatedCostUsd).toBe(0.001)
    })

    it('yields nothing when nothing matches', async () => {
      AgentLogModel.findAll.mockResolvedValue([])

      expect(await drain(AgentLogService.iterateForExport(filters, admin))).toEqual([])
    })

    it("limits a normal user to their own commands and lets an admin see everyone's", async () => {
      AgentLogModel.findAll.mockResolvedValue([])

      await drain(AgentLogService.iterateForExport(filters, user))
      await drain(AgentLogService.iterateForExport(filters, admin))

      expect(whereOfCall(0)).toMatchObject({ userId: 7 })
      expect(whereOfCall(1).userId).toBeUndefined()
    })

    it('carries the status and search filters into the query', async () => {
      AgentLogModel.findAll.mockResolvedValue([])

      await drain(
        AgentLogService.iterateForExport({ ...filters, status: 'failed', search: 'lampu' }, admin)
      )

      expect(whereOfCall(0)).toMatchObject({
        status: 'failed',
        command: { [Op.like]: '%lampu%' }
      })
    })

    it('stops at the row cap instead of reading forever', async () => {
      const full = Array.from({ length: 500 }, (_, i) => rowOf(i + 1))
      AgentLogModel.findAll.mockResolvedValue(full)

      const batches = await drain(AgentLogService.iterateForExport(filters, admin))

      expect(batches.reduce((sum, batch) => sum + batch.length, 0)).toBe(EXPORT_MAX_ROWS)
    })
  })
})
