import { type Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { type IAuthenticatedRequest } from '../../interfaces/shared/request.interface'
import {
  type IAgentLogSummaryQuery,
  type IClientLatencyBody,
  type IExportAgentLogs,
  type IFindAllAgentLogs,
  type IRequestIdParam
} from '../../schemas/AgentLogSchema'
import { AgentLogService, csvFileName, csvHeader, csvRow } from '../../services/agent'
import logger from '../../utilities/logger'
import { handleError } from '../../utilities/requestHandler'
import { ResponseData } from '../../utilities/response'
import { viewerOf } from './agentViewer'

export const findAllAgentLogs = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const payload = req.query as unknown as IFindAllAgentLogs
    const data = await AgentLogService.findAll(payload, viewerOf(req))
    return res.status(StatusCodes.OK).json(ResponseData.success({ data }))
  } catch (serverError) {
    return handleError(res, serverError)
  }
}

export const getAgentLogSummary = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const query = req.query as unknown as IAgentLogSummaryQuery
    const data = await AgentLogService.summary(query, viewerOf(req))
    return res.status(StatusCodes.OK).json(ResponseData.success({ data }))
  } catch (serverError) {
    return handleError(res, serverError)
  }
}

export const reportClientLatency = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { requestId } = req.params as unknown as IRequestIdParam
    const { clientLatencyMs } = req.body as IClientLatencyBody
    await AgentLogService.setClientLatency(requestId, clientLatencyMs, viewerOf(req))
    return res
      .status(StatusCodes.OK)
      .json(ResponseData.success({ message: 'Client latency saved' }))
  } catch (serverError) {
    return handleError(res, serverError)
  }
}

export const exportAgentLogs = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response | undefined> => {
  const filters = req.query as unknown as IExportAgentLogs

  try {
    res.locals.skipCompression = true
    res.status(StatusCodes.OK)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${csvFileName(filters.from, filters.to)}"`
    )
    res.setHeader('Cache-Control', 'no-store')
    res.write(csvHeader())

    for await (const batch of AgentLogService.iterateForExport(filters, viewerOf(req))) {
      if (res.destroyed) return
      res.write(batch.map(csvRow).join(''))
    }
    res.end()
  } catch (serverError) {
    // Once the CSV has started the status line is already sent, so all that is left is to stop.
    if (res.headersSent) {
      logger.error(`[AgentController] export failed mid-stream: ${String(serverError)}`)
      res.end()
      return
    }
    return handleError(res, serverError)
  }
}
