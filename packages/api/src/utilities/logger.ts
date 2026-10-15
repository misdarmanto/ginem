import { createLogger, format, transports } from 'winston'
import path from 'path'
import { AppLogTransport, saveAppLogToDatabase } from './appLogTransport'

const logFilePath = path.join(__dirname, '../../', 'logs', 'app.log')
const errorLogFilePath = path.join(__dirname, '../../', 'logs', 'error.log')

// Unit tests mock the logger or must not reach for a database.
const storeInDatabase = process.env.NODE_ENV !== 'test'

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'backend-service' },
  transports: [
    new transports.File({ filename: logFilePath, level: 'info' }),
    new transports.File({ filename: errorLogFilePath, level: 'error' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    }),
    ...(storeInDatabase
      ? [new AppLogTransport({ level: 'warn', save: saveAppLogToDatabase })]
      : [])
  ]
})

export default logger
