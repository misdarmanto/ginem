import { exportAgentLogsSchema } from '../AgentLogSchema'

describe('exportAgentLogsSchema', () => {
  it('accepts a date range with a filter', () => {
    const result = exportAgentLogsSchema.parse({
      from: '2026-10-01',
      to: '2026-10-15',
      status: 'failed',
      search: 'lampu'
    })

    expect(result).toEqual({
      from: '2026-10-01',
      to: '2026-10-15',
      status: 'failed',
      search: 'lampu'
    })
  })

  it('accepts no filters at all, meaning everything', () => {
    expect(exportAgentLogsSchema.parse({})).toEqual({})
  })

  it('treats empty strings as not set', () => {
    expect(
      exportAgentLogsSchema.parse({ from: '', to: '', status: '', search: '' })
    ).toEqual({})
  })

  it('accepts a single-day range and an open-ended one', () => {
    expect(exportAgentLogsSchema.safeParse({ from: '2026-10-15', to: '2026-10-15' }).success).toBe(true)
    expect(exportAgentLogsSchema.safeParse({ from: '2026-10-15' }).success).toBe(true)
    expect(exportAgentLogsSchema.safeParse({ to: '2026-10-15' }).success).toBe(true)
  })

  it('rejects a range that ends before it starts', () => {
    const result = exportAgentLogsSchema.safeParse({ from: '2026-10-15', to: '2026-10-01' })

    expect(result.success).toBe(false)
  })

  it.each([
    ['15-10-2026'],
    ['2026/10/15'],
    ['2026-10-15T00:00:00Z'],
    ['yesterday'],
    ['2026-13-01'],
    ['2026-02-30']
  ])('rejects the date %p', (from) => {
    expect(exportAgentLogsSchema.safeParse({ from }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(exportAgentLogsSchema.safeParse({ status: 'done' }).success).toBe(false)
  })
})
