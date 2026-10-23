import { AppLogTransport, DEDUPE_WINDOW_MS, type AppLogEntry } from '../appLogTransport'

const LEVEL = Symbol.for('level')

const info = (level: string, message: unknown, extra: Record<string, unknown> = {}) => ({
  level,
  [LEVEL]: level,
  message,
  timestamp: '2026-10-15 17:00:00',
  service: 'backend-service',
  ...extra
})

const flush = async () => {
  await new Promise((resolve) => setImmediate(resolve))
}

function setup() {
  const saved: AppLogEntry[] = []
  const save = jest.fn(async (entry: AppLogEntry) => {
    saved.push(entry)
  })
  let clock = 1_000_000
  const transport = new AppLogTransport({ level: 'warn', save, now: () => clock })
  const log = async (...args: Parameters<typeof info>) => {
    const callback = jest.fn()
    transport.log(info(...args), callback)
    await flush()
    return callback
  }
  return { transport, saved, save, log, advance: (ms: number) => (clock += ms) }
}

describe('AppLogTransport', () => {
  describe('what is stored', () => {
    it('stores an error', async () => {
      const { saved, log } = setup()

      await log('error', '[ChatService] failed to send')

      expect(saved).toEqual([
        {
          appLogLevel: 'error',
          appLogMessage: '[ChatService] failed to send',
          appLogSource: 'ChatService',
          appLogMeta: null
        }
      ])
    })

    it('stores a warning', async () => {
      const { saved, log } = setup()

      await log('warn', '[MQTTService] connection unstable')

      expect(saved[0]).toMatchObject({ appLogLevel: 'warn', appLogSource: 'MQTTService' })
    })

    it.each([['info'], ['debug'], ['verbose']])('does not store %s messages', async (level) => {
      const { saved, log } = setup()

      await log(level, '[X] chatter')

      expect(saved).toEqual([])
    })

    it('does not store an event marked persist:false, such as a client error', async () => {
      const { saved, log } = setup()

      await log('warn', '[AppError] 401: Invalid credentials', { persist: false })

      expect(saved).toEqual([])
    })

    it('does not store empty messages', async () => {
      const { saved, log } = setup()

      await log('error', '   ')
      await log('error', undefined)

      expect(saved).toEqual([])
    })

    it('trims whitespace around the message', async () => {
      const { saved, log } = setup()

      await log('error', '  [X] spaced out \n')

      expect(saved[0].appLogMessage).toBe('[X] spaced out')
    })

    it('cuts an enormous message down', async () => {
      const { saved, log } = setup()

      await log('error', `[X] ${'a'.repeat(20_000)}`)

      expect(saved[0].appLogMessage.length).toBeLessThanOrEqual(5_000)
    })
  })

  describe('source', () => {
    it('comes from the [Prefix] of the message', async () => {
      const { saved, log } = setup()

      await log('error', '[DeviceScheduleWorker] job failed')

      expect(saved[0].appLogSource).toBe('DeviceScheduleWorker')
    })

    it('prefers an explicit source in the metadata', async () => {
      const { saved, log } = setup()

      await log('error', '[ChatService] failed', { source: 'handleServerError' })

      expect(saved[0].appLogSource).toBe('handleServerError')
    })

    it('is empty when the message names none', async () => {
      const { saved, log } = setup()

      await log('error', 'Unhandled Rejection: boom')

      expect(saved[0].appLogSource).toBeNull()
    })
  })

  describe('metadata', () => {
    it('keeps the stack trace', async () => {
      const { saved, log } = setup()

      await log('error', '[X] failed', { stack: 'Error: boom\n    at here' })

      expect(JSON.parse(saved[0].appLogMeta as string)).toEqual({ stack: 'Error: boom\n    at here' })
    })

    it('keeps extra fields but not winston bookkeeping', async () => {
      const { saved, log } = setup()

      await log('error', '[X] failed', { statusCode: 500, deviceId: 7 })

      expect(JSON.parse(saved[0].appLogMeta as string)).toEqual({ statusCode: 500, deviceId: 7 })
    })

    it('is empty when there is nothing extra', async () => {
      const { saved, log } = setup()

      await log('error', '[X] failed')

      expect(saved[0].appLogMeta).toBeNull()
    })

    it('survives metadata that cannot be serialised', async () => {
      const { saved, log } = setup()
      const circular: Record<string, unknown> = {}
      circular.self = circular

      await log('error', '[X] failed', { circular })

      expect(saved).toHaveLength(1)
      expect(saved[0].appLogMeta).toBeNull()
    })

    it('cuts very large metadata down', async () => {
      const { saved, log } = setup()

      await log('error', '[X] failed', { stack: 's'.repeat(50_000) })

      expect((saved[0].appLogMeta as string).length).toBeLessThanOrEqual(10_000)
    })
  })

  describe('repeated messages', () => {
    it('stores an identical message once inside the window', async () => {
      const { saved, log, advance } = setup()

      await log('error', '[MQTT] reconnect failed')
      advance(DEDUPE_WINDOW_MS - 1)
      await log('error', '[MQTT] reconnect failed')

      expect(saved).toHaveLength(1)
    })

    it('stores it again once the window has passed', async () => {
      const { saved, log, advance } = setup()

      await log('error', '[MQTT] reconnect failed')
      advance(DEDUPE_WINDOW_MS)
      await log('error', '[MQTT] reconnect failed')

      expect(saved).toHaveLength(2)
    })

    it('treats different messages and levels as different', async () => {
      const { saved, log } = setup()

      await log('error', '[X] one')
      await log('error', '[X] two')
      await log('warn', '[X] one')

      expect(saved).toHaveLength(3)
    })

    it('does not grow without bound under a flood of distinct messages', async () => {
      const { saved, log } = setup()

      for (let i = 0; i < 1200; i += 1) await log('error', `[X] distinct ${i}`)

      expect(saved).toHaveLength(1200)
    })
  })

  describe('failure handling', () => {
    it('always calls back, even when saving fails, so logging never blocks the caller', async () => {
      const { transport, save } = setup()
      save.mockRejectedValue(new Error('db down'))
      const callback = jest.fn()

      transport.log(info('error', '[X] failed'), callback)
      await flush()

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not throw or reject when saving fails', async () => {
      const { transport, save } = setup()
      save.mockRejectedValue(new Error('db down'))
      const stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true)

      expect(() => transport.log(info('error', '[X] failed'), jest.fn())).not.toThrow()
      await flush()

      stderr.mockRestore()
    })

    it('reports a failure on stderr, not through the logger, and not more than once a minute', async () => {
      const { transport, save, advance } = setup()
      save.mockRejectedValue(new Error('db down'))
      const stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true)

      transport.log(info('error', '[X] one'), jest.fn())
      transport.log(info('error', '[X] two'), jest.fn())
      await flush()
      expect(stderr).toHaveBeenCalledTimes(1)
      expect(String(stderr.mock.calls[0][0])).toContain('db down')

      advance(60_000)
      transport.log(info('error', '[X] three'), jest.fn())
      await flush()
      expect(stderr).toHaveBeenCalledTimes(2)

      stderr.mockRestore()
    })

    it('emits "logged" so winston can finish its pipeline', async () => {
      const { transport } = setup()
      const logged = jest.fn()
      transport.on('logged', logged)

      transport.log(info('error', '[X] failed'), jest.fn())
      await flush()

      expect(logged).toHaveBeenCalledTimes(1)
    })
  })
})
