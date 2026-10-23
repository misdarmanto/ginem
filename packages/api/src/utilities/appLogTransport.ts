import Transport from 'winston-transport'
import type { AppLogLevel } from '../models/AppLogModel'

export interface AppLogEntry {
  appLogLevel: AppLogLevel
  appLogMessage: string
  appLogSource: string | null
  appLogMeta: string | null
}

export type SaveAppLog = (entry: AppLogEntry) => Promise<void>

interface AppLogTransportOptions {
  level?: string
  save: SaveAppLog
  now?: () => number
}

/** The same message within this window is stored once, so a failure loop cannot flood the table. */
export const DEDUPE_WINDOW_MS = 60_000
const MAX_TRACKED_MESSAGES = 500
const FAILURE_REPORT_INTERVAL_MS = 60_000
const MAX_MESSAGE_CHARS = 5_000
const MAX_META_CHARS = 10_000
/** "[ChatService] ..." names where the message came from. */
const SOURCE_PREFIX = /^\[([^\]]{1,100})\]/
const LEVEL_SYMBOL = Symbol.for('level')
const RESERVED_KEYS = new Set([
  'level',
  'message',
  'timestamp',
  'service',
  'stack',
  'source',
  'persist'
])

const isStoredLevel = (level: unknown): level is AppLogLevel =>
  level === 'error' || level === 'warn'

/**
 * Winston transport that keeps errors and warnings in the app_logs table, where the Logger page
 * and the notification bell read them. Saving never blocks or breaks the code that logged.
 *
 * Pass `{ persist: false }` as log metadata for expected events that should stay in the files only.
 */
export class AppLogTransport extends Transport {
  private readonly save: SaveAppLog
  private readonly now: () => number
  private readonly lastStoredAt = new Map<string, number>()
  private lastFailureReportAt = 0

  constructor(options: AppLogTransportOptions) {
    super({ level: options.level })
    this.save = options.save
    this.now = options.now ?? Date.now
  }

  log(info: Record<string | symbol, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info))

    const entry = this.toEntry(info)
    if (entry != null && this.isNew(entry)) {
      void this.persist(entry)
    }
    callback()
  }

  private toEntry(info: Record<string | symbol, unknown>): AppLogEntry | null {
    const level = info[LEVEL_SYMBOL] ?? info.level
    if (!isStoredLevel(level) || info.persist === false) return null

    const message = String(info.message ?? '').trim().slice(0, MAX_MESSAGE_CHARS)
    if (message === '') return null

    const source =
      typeof info.source === 'string' && info.source !== ''
        ? info.source
        : (SOURCE_PREFIX.exec(message)?.[1] ?? null)

    return {
      appLogLevel: level,
      appLogMessage: message,
      appLogSource: source,
      appLogMeta: this.toMeta(info)
    }
  }

  private toMeta(info: Record<string | symbol, unknown>): string | null {
    const extra = Object.fromEntries(
      Object.entries(info).filter(([key]) => !RESERVED_KEYS.has(key))
    )
    const meta = {
      ...(typeof info.stack === 'string' && { stack: info.stack }),
      ...extra
    }
    if (Object.keys(meta).length === 0) return null

    try {
      return JSON.stringify(meta).slice(0, MAX_META_CHARS)
    } catch {
      return null
    }
  }

  /** False when the same message was already stored inside the dedupe window. */
  private isNew(entry: AppLogEntry): boolean {
    const key = `${entry.appLogLevel}|${entry.appLogMessage}`
    const now = this.now()
    const last = this.lastStoredAt.get(key)
    if (last != null && now - last < DEDUPE_WINDOW_MS) return false

    if (this.lastStoredAt.size >= MAX_TRACKED_MESSAGES) {
      for (const [tracked, at] of this.lastStoredAt) {
        if (now - at >= DEDUPE_WINDOW_MS) this.lastStoredAt.delete(tracked)
      }
      if (this.lastStoredAt.size >= MAX_TRACKED_MESSAGES) this.lastStoredAt.clear()
    }
    this.lastStoredAt.set(key, now)
    return true
  }

  private async persist(entry: AppLogEntry): Promise<void> {
    try {
      await this.save(entry)
    } catch (saveError) {
      // Not logged through winston: that would feed straight back into this transport.
      const now = this.now()
      if (now - this.lastFailureReportAt >= FAILURE_REPORT_INTERVAL_MS) {
        this.lastFailureReportAt = now
        process.stderr.write(`[AppLogTransport] could not store log entry: ${String(saveError)}\n`)
      }
    }
  }
}

/** Loaded on first use, so importing the logger does not open a database connection. */
export const saveAppLogToDatabase: SaveAppLog = async (entry) => {
  const { AppLogModel } = await import('../models/AppLogModel')
  await AppLogModel.create(entry)
}
