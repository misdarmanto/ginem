import { StatusCodes } from 'http-status-codes'
import { type Response } from 'express'
import { ResponseData } from './response'
import logger from './logger'
import { AppError } from './AppError'

export function handleServerError (res: Response, err: unknown) {
  if (err instanceof Error) {
    const message = `Unable to process request!: ${err.message}`
    logger.error(message, { stack: err.stack, source: 'handleServerError' })
    const response = ResponseData.error({
      message: 'Unable to process request! Error code 1T33'
    })
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response)
  }

  logger.error('Unable to process request! Unknown error', { source: 'handleServerError' })
  const response = ResponseData.error({ message: 'Unable to process request!' })
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response)
}

export function handleError (res: Response, err: unknown): Response {
  if (err instanceof AppError) {
    // A bad request or a failed login is the caller's doing, not a system problem: keep it in the
    // log files but out of the Logger page and notifications.
    const clientError = err.statusCode < StatusCodes.INTERNAL_SERVER_ERROR
    logger.warn(`[AppError] ${err.statusCode}: ${err.message}`, {
      ...(clientError && { persist: false })
    })
    return res.status(err.statusCode).json(ResponseData.error({ message: err.message }))
  }
  return handleServerError(res, err)
}
