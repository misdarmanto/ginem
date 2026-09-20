import { appConfigs } from '../configs/appConfig'

export interface MetaAttributes {
  version: string
  timestamp: string
  executionTime?: string
  requestId?: string
}

export interface ResponseDataAttributes<T = unknown> {
  success: boolean
  message: string | null
  data: T | null | undefined
  meta: MetaAttributes
}

interface ISuccessProps<T = unknown> {
  data?: T
  message?: string
  executionTime?: string
  requestId?: string
}

interface IErorProps {
  message?: string
  executionTime?: string
  requestId?: string
}

const buildMeta = (executionTime?: string, requestId?: string): MetaAttributes => {
  return {
    version: appConfigs.app.appVersion,
    timestamp: new Date().toISOString(),
    executionTime,
    requestId
  }
}

export const ResponseData = {
  success: <T = unknown>({
    data,
    message = 'Request successful',
    executionTime,
    requestId
  }: ISuccessProps<T>): ResponseDataAttributes<T> => ({
    success: true,
    message,
    data,
    meta: buildMeta(executionTime, requestId)
  }),

  error: ({
    message = 'Something went wrong',
    executionTime,
    requestId
  }: IErorProps): ResponseDataAttributes => ({
    success: false,
    message,
    data: null,
    meta: buildMeta(executionTime, requestId)
  })
}
