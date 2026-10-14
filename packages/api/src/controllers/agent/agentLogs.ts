import { type Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { type IAuthenticatedRequest } from '../../interfaces/shared/request.interface'
import {
  type IAgentLogSummaryQuery,
  type IClientLatencyBody,
  type IFindAllAgentLogs,
  type IRequestIdParam
} from '../../schemas/AgentLogSchema'
import { AgentLogService } from '../../services/agent'
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
