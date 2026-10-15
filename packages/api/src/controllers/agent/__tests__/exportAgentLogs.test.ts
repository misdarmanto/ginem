import { exportAgentLogs } from '../agentLogs'

const iterateForExport = jest.fn()
const handleError = jest.fn()

jest.mock('../../../services/agent', () => ({
  AgentLogService: { iterateForExport: (...args: unknown[]) => iterateForExport(...args) },
  csvFileName: (from?: string, to?: string) => `file_${from ?? 'x'}_${to ?? 'y'}.csv`,
  csvHeader: () => 'HEADER\n',
  csvRow: (log: { id: number }) => `row${log.id}\n`
}))

jest.mock('../../../utilities/requestHandler', () => ({
  handleError: (...args: unknown[]) => handleError(...args)
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

function fakeRes() {
  const written: string[] = []
  const res = {
    locals: {} as Record<string, unknown>,
    headers: {} as Record<string, string>,
    statusCode: 0,
    headersSent: false,
    destroyed: false,
    ended: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    write(chunk: string) {
      this.headersSent = true
      written.push(chunk)
      return true
    },
    end() {
      this.ended = true
    }
  }
  return { res, written }
}

const req = (query: Record<string, unknown> = {}) =>
  ({ query, jwtPayload: { userId: 7, userRole: 'user' } }) as never

async function* batches(...groups: Array<Array<{ id: number }>>) {
  for (const group of groups) yield group
}

describe('exportAgentLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('streams a CSV download: header first, then every batch', async () => {
    iterateForExport.mockReturnValue(batches([{ id: 1 }, { id: 2 }], [{ id: 3 }]))
    const { res, written } = fakeRes()

    await exportAgentLogs(req({ from: '2026-10-01', to: '2026-10-15' }), res as never)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('text/csv; charset=utf-8')
    expect(res.headers['Content-Disposition']).toBe(
      'attachment; filename="file_2026-10-01_2026-10-15.csv"'
    )
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(written).toEqual(['HEADER\n', 'row1\nrow2\n', 'row3\n'])
    expect(res.ended).toBe(true)
  })

  it('asks for the right range, filters and viewer', async () => {
    iterateForExport.mockReturnValue(batches())
    const { res } = fakeRes()

    await exportAgentLogs(req({ from: '2026-10-01', status: 'failed' }), res as never)

    expect(iterateForExport).toHaveBeenCalledWith(
      { from: '2026-10-01', status: 'failed' },
      { userId: 7, role: 'user' }
    )
  })

  it('still returns a valid file, just the header, when nothing matches', async () => {
    iterateForExport.mockReturnValue(batches())
    const { res, written } = fakeRes()

    await exportAgentLogs(req(), res as never)

    expect(written).toEqual(['HEADER\n'])
    expect(res.ended).toBe(true)
  })

  it('bypasses response compression, which would hold the stream back', async () => {
    iterateForExport.mockReturnValue(batches())
    const { res } = fakeRes()

    await exportAgentLogs(req(), res as never)

    expect(res.locals.skipCompression).toBe(true)
  })

  it('stops reading when the client disconnects', async () => {
    const seen: number[] = []
    iterateForExport.mockReturnValue(
      (async function* () {
        for (const id of [1, 2, 3]) {
          seen.push(id)
          yield [{ id }]
        }
      })()
    )
    const { res, written } = fakeRes()
    const originalWrite = res.write.bind(res)
    res.write = (chunk: string) => {
      const ok = originalWrite(chunk)
      if (written.length === 2) res.destroyed = true
      return ok
    }

    await exportAgentLogs(req(), res as never)

    expect(seen).toEqual([1, 2])
  })

  it('ends the file quietly when the database fails after the download started', async () => {
    iterateForExport.mockReturnValue(
      (async function* () {
        yield [{ id: 1 }]
        throw new Error('db down')
      })()
    )
    const { res, written } = fakeRes()

    await exportAgentLogs(req(), res as never)

    expect(written).toEqual(['HEADER\n', 'row1\n'])
    expect(res.ended).toBe(true)
    expect(handleError).not.toHaveBeenCalled()
  })
})
