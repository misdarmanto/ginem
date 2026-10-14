import { Router } from 'express'

import { AgentController } from '../controllers/agent/index'
import { MiddleWares } from '../middlewares/index'
import {
  agentLogSummarySchema,
  clientLatencyBodySchema,
  findAllAgentLogsSchema,
  requestIdParamSchema
} from '../schemas/AgentLogSchema'

const AgentRoute = Router()

AgentRoute.use(MiddleWares.useAuthorization)

AgentRoute.get(
  '/logs',
  MiddleWares.validate({ query: findAllAgentLogsSchema }),
  AgentController.findAll
)

AgentRoute.get(
  '/logs/summary',
  MiddleWares.validate({ query: agentLogSummarySchema }),
  AgentController.summary
)

AgentRoute.patch(
  '/logs/:requestId/client-latency',
  MiddleWares.validate({ params: requestIdParamSchema, body: clientLatencyBodySchema }),
  AgentController.reportClientLatency
)

export default AgentRoute
