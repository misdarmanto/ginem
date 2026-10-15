import type { IAgentLogAttributes } from '../../../models/AgentLogModel'
import { CSV_COLUMNS, csvFileName, csvHeader, csvRow, escapeCsvCell } from '../agentLogCsv'

const log = (
  overrides: Partial<Omit<IAgentLogAttributes, 'estimatedCostUsd'>> & {
    estimatedCostUsd?: number | null
  } = {}
) =>
  ({
    agentLogId: 1,
    requestId: 'req-1',
    userId: 7,
    sessionId: 'web:7',
    source: 'web',
    channel: 'chat',
    command: 'tolong hidupkan lampu ruang tamu',
    reply: 'Lampu menyala.',
    status: 'success',
    statusReason: 'Permintaan berhasil dipenuhi.',
    model: 'gpt-4o-mini',
    inputTokens: 2604,
    outputTokens: 8,
    totalTokens: 2612,
    cachedInputTokens: 0,
    estimatedCostUsd: 0.000395,
    queueWaitMs: 4,
    contextLatencyMs: 5400,
    agentLatencyMs: 2382,
    serverLatencyMs: 7900,
    clientLatencyMs: 8100,
    toolCalls: [{ name: 'set_actuator_state_by_device_name', args: {}, ok: true }],
    createdAt: '2026-10-14 17:50:20',
    deleted: false,
    ...overrides
  }) as Parameters<typeof csvRow>[0]

describe('escapeCsvCell', () => {
  it.each([
    [null, ''],
    [undefined, ''],
    ['plain', 'plain'],
    [42, '42'],
    [0, '0'],
    [0.000395, '0.000395'],
    [Number.NaN, ''],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['two\nlines', '"two\nlines"'],
    ['windows\r\nline', '"windows\r\nline"']
  ])('escapes %p as %p', (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected)
  })

  it.each([
    ['=HYPERLINK("http://evil","click")'],
    ['+1+1'],
    ['-2+3'],
    ['@SUM(A1:A2)'],
    ['\t=cmd']
  ])('neutralises the spreadsheet formula %p', (input) => {
    expect(escapeCsvCell(input).replace(/^"/, '').startsWith("'")).toBe(true)
  })

  it('keeps negative numbers as numbers, only text is neutralised', () => {
    expect(escapeCsvCell(-5)).toBe('-5')
  })

  it('does not alter text that merely contains a formula character', () => {
    expect(escapeCsvCell('suhu = 28')).toBe('suhu = 28')
  })
})

describe('csvHeader', () => {
  it('starts with a BOM so Excel reads UTF-8, then names every column', () => {
    const header = csvHeader()

    expect(header.startsWith('﻿')).toBe(true)
    expect(header.endsWith('\r\n')).toBe(true)
    expect(header.slice(1).trim().split(',')).toEqual(CSV_COLUMNS.map((c) => c.header))
  })

  it('has the columns the Agent page shows', () => {
    const names = CSV_COLUMNS.map((c) => c.header)

    expect(names).toEqual(
      expect.arrayContaining([
        'time',
        'command',
        'status',
        'model',
        'input_tokens',
        'output_tokens',
        'total_tokens',
        'estimated_cost_usd',
        'e2e_latency_browser_ms',
        'server_latency_ms'
      ])
    )
  })
})

describe('csvRow', () => {
  const cells = (row: string) => row.replace(/\r\n$/, '').split(',')
  const cell = (row: string, header: string) =>
    cells(row)[CSV_COLUMNS.findIndex((column) => column.header === header)]

  it('writes one value per column in header order, ending with CRLF', () => {
    const row = csvRow(log())

    expect(row.endsWith('\r\n')).toBe(true)
    expect(cells(row)).toHaveLength(CSV_COLUMNS.length)
    expect(cell(row, 'time')).toBe('2026-10-14 17:50:20')
    expect(cell(row, 'status')).toBe('success')
    expect(cell(row, 'total_tokens')).toBe('2612')
    expect(cell(row, 'estimated_cost_usd')).toBe('0.000395')
    expect(cell(row, 'e2e_latency_browser_ms')).toBe('8100')
  })

  it('leaves unknown values empty rather than writing "null"', () => {
    const row = csvRow(
      log({ clientLatencyMs: null, inputTokens: null, estimatedCostUsd: null, model: null })
    )

    expect(cell(row, 'e2e_latency_browser_ms')).toBe('')
    expect(cell(row, 'input_tokens')).toBe('')
    expect(cell(row, 'estimated_cost_usd')).toBe('')
    expect(row).not.toMatch(/null|undefined/)
  })

  it('quotes a command that contains commas and keeps accents', () => {
    const row = csvRow(log({ command: 'nyalakan lampu, lalu kipas — sekarang' }))

    expect(row).toContain('"nyalakan lampu, lalu kipas — sekarang"')
  })

  it('does not let a command be read as a formula', () => {
    const row = csvRow(log({ command: '=1+1' }))

    expect(row).toContain("'=1+1")
    expect(row).not.toMatch(/(^|,)=1\+1/)
  })

  it('lists the tools used and flags one that failed', () => {
    const row = csvRow(
      log({
        toolCalls: [
          { name: 'list_devices', args: {}, ok: true },
          { name: 'set_actuator_state_by_device_name', args: {}, ok: false }
        ]
      })
    )

    expect(row).toContain('list_devices; set_actuator_state_by_device_name (failed)')
  })

  it('shows whatsapp as the channel for WhatsApp commands', () => {
    expect(cell(csvRow(log({ source: 'whatsapp' })), 'channel')).toBe('whatsapp')
    expect(cell(csvRow(log({ channel: 'voice' })), 'channel')).toBe('voice')
  })

  it('keeps a multi-line reply inside one quoted cell', () => {
    const row = csvRow(log({ reply: 'Baris satu\nBaris dua' }))

    expect(row).toContain('"Baris satu\nBaris dua"')
  })
})

describe('csvFileName', () => {
  it.each([
    [undefined, undefined, 'agent-logs_all.csv'],
    ['2026-10-01', '2026-10-15', 'agent-logs_2026-10-01_2026-10-15.csv'],
    ['2026-10-01', undefined, 'agent-logs_2026-10-01_today.csv'],
    [undefined, '2026-10-15', 'agent-logs_start_2026-10-15.csv']
  ])('names %p to %p as %p', (from, to, expected) => {
    expect(csvFileName(from, to)).toBe(expected)
  })
})
