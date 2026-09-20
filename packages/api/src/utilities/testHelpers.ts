import { type Request, type Response } from 'express'
import { jest } from '@jest/globals'

export const mockRequest = (
  body: Record<string, unknown> = {},
  params: Record<string, unknown> = {},
  query: Record<string, unknown> = {}
): Request => {
  return {
    body,
    params,
    query,
    get: jest.fn(),
    headers: {}
  } as unknown as Request
}

export const mockResponse = (): Response => {
  const res: Partial<Record<keyof Response, jest.Mock>> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)
  res.setHeader = jest.fn().mockReturnValue(res)
  return res as unknown as Response
}
