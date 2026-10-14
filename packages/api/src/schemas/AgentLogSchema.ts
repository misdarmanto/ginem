import { z } from 'zod'

const emptyToUndefined = <T extends string>(
  value: T | undefined
): Exclude<T, ''> | undefined => (value === '' ? undefined : (value as Exclude<T, ''>))

export const agentStatusSchema = z.enum(['pending', 'success', 'failed', 'clarification'])

export const findAllAgentLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(10),
  status: z.union([agentStatusSchema, z.literal('')]).optional().transform(emptyToUndefined),
  search: z.string().optional().transform(emptyToUndefined),
  pagination: z
    .string()
    .optional()
    .transform((value): boolean => value === 'true')
})

export const agentLogSummarySchema = findAllAgentLogsSchema.pick({
  status: true,
  search: true
})

export const requestIdParamSchema = z.object({
  requestId: z.string().min(1).max(191)
})

export const clientLatencyBodySchema = z.object({
  clientLatencyMs: z.coerce.number().int().min(0).max(600_000)
})

export type IFindAllAgentLogs = z.infer<typeof findAllAgentLogsSchema>
export type IAgentLogSummaryQuery = z.infer<typeof agentLogSummarySchema>
export type IRequestIdParam = z.infer<typeof requestIdParamSchema>
export type IClientLatencyBody = z.infer<typeof clientLatencyBodySchema>
