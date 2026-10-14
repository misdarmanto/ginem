import { StatusCodes } from 'http-status-codes'

import { ChatMessageBroker } from '../ChatMessageBroker.service'
import { ChatService } from '../../chat'
import { AgentLogService } from '../../agent'
import * as rabbitConnection from '../connection'

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}))

jest.mock('../../chat', () => ({
  ChatService: {
    query: jest.fn()
  }
}))

jest.mock('../../agent', () => ({
  AgentLogService: { recordExecution: jest.fn().mockResolvedValue(undefined) }
}))

jest.mock('../connection', () => ({
  getRabbitChannel: jest.fn(),
  getChatQueueName: jest.fn(() => 'chat.llm.requests'),
  closeRabbitConnection: jest.fn()
}))

jest.mock('../../../configs/appConfig', () => ({
  appConfigs: {
    rabbitmq: {
      url: 'amqp://guest:guest@127.0.0.1:5672',
      chatQueue: 'chat.llm.requests',
      chatReplyTimeoutMs: 5000
    }
  }
}))

const mockedChatService = ChatService as jest.Mocked<typeof ChatService>
const mockedAgentLog = AgentLogService as jest.Mocked<typeof AgentLogService>
const mockedGetChannel = rabbitConnection.getRabbitChannel as jest.Mock

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

async function waitForMockCalls(fn: jest.Mock, count = 1): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (fn.mock.calls.length >= count) return
    await flushMicrotasks()
  }
  throw new Error(`Timed out waiting for mock to be called ${count} time(s)`)
}

describe('ChatMessageBroker', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await ChatMessageBroker.shutdown()
  })

  it('requestChat publishes to the queue and resolves RPC reply', async () => {
    const sendToQueue = jest.fn().mockReturnValue(true)
    const cancel = jest.fn().mockResolvedValue(undefined)
    let replyHandler: ((msg: unknown) => void) | undefined

    const channel = {
      assertQueue: jest.fn().mockResolvedValue({ queue: 'amq.gen-reply' }),
      consume: jest.fn().mockImplementation(async (_queue, onMessage) => {
        replyHandler = onMessage
        return { consumerTag: 'tag-1' }
      }),
      sendToQueue,
      cancel
    }

    mockedGetChannel.mockResolvedValue(channel)

    const pending = ChatMessageBroker.requestChat('Nyalakan lampu', { source: 'web' })
    await waitForMockCalls(sendToQueue)

    expect(sendToQueue).toHaveBeenCalledWith(
      'chat.llm.requests',
      expect.any(Buffer),
      expect.objectContaining({
        replyTo: 'amq.gen-reply',
        persistent: true
      })
    )

    const publishOpts = sendToQueue.mock.calls[0][2] as { correlationId: string }
    replyHandler?.({
      properties: { correlationId: publishOpts.correlationId },
      content: Buffer.from(
        JSON.stringify({
          messageId: 'm1',
          ok: true,
          reply: 'Lampu dinyalakan.'
        })
      )
    })

    await expect(pending).resolves.toEqual({ reply: 'Lampu dinyalakan.' })
  })

  it('requestChat carries the client request id, channel and timing in the payload', async () => {
    const sendToQueue = jest.fn().mockReturnValue(true)
    mockedGetChannel.mockResolvedValue({
      assertQueue: jest.fn().mockResolvedValue({ queue: 'amq.gen-reply' }),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'tag-1' }),
      sendToQueue,
      cancel: jest.fn()
    })

    const pending = ChatMessageBroker.requestChat('Nyalakan lampu', {
      source: 'web',
      requestId: 'client-req-1',
      channel: 'voice',
      receivedAt: 12_345
    })
    pending.catch(() => undefined)
    await waitForMockCalls(sendToQueue)

    const payload = JSON.parse((sendToQueue.mock.calls[0][1] as Buffer).toString('utf8'))
    expect(payload).toMatchObject({
      requestId: 'client-req-1',
      channel: 'voice',
      receivedAt: 12_345,
      source: 'web',
      message: 'Nyalakan lampu'
    })
    expect(payload.enqueuedAt).toBeGreaterThan(12_345)
  })

  it('requestChat stamps receipt time itself when the caller gives none', async () => {
    const sendToQueue = jest.fn().mockReturnValue(true)
    mockedGetChannel.mockResolvedValue({
      assertQueue: jest.fn().mockResolvedValue({ queue: 'amq.gen-reply' }),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'tag-1' }),
      sendToQueue,
      cancel: jest.fn()
    })

    const pending = ChatMessageBroker.requestChat('Halo', { source: 'whatsapp' })
    pending.catch(() => undefined)
    await waitForMockCalls(sendToQueue)

    const payload = JSON.parse((sendToQueue.mock.calls[0][1] as Buffer).toString('utf8'))
    expect(payload.receivedAt).toBe(payload.enqueuedAt)
    expect(payload.requestId).toBeUndefined()
  })

  it('requestChat rejects when broker reply is an error payload', async () => {
    const sendToQueue = jest.fn().mockReturnValue(true)
    let replyHandler: ((msg: unknown) => void) | undefined

    const channel = {
      assertQueue: jest.fn().mockResolvedValue({ queue: 'amq.gen-reply' }),
      consume: jest.fn().mockImplementation(async (_queue, onMessage) => {
        replyHandler = onMessage
        return { consumerTag: 'tag-2' }
      }),
      sendToQueue,
      cancel: jest.fn().mockResolvedValue(undefined)
    }

    mockedGetChannel.mockResolvedValue(channel)

    const pending = ChatMessageBroker.requestChat('Hello', { source: 'whatsapp' })
    await waitForMockCalls(sendToQueue)

    const publishOpts = sendToQueue.mock.calls[0][2] as { correlationId: string }
    replyHandler?.({
      properties: { correlationId: publishOpts.correlationId },
      content: Buffer.from(
        JSON.stringify({
          messageId: 'm2',
          ok: false,
          error: 'LLM down',
          statusCode: StatusCodes.BAD_GATEWAY
        })
      )
    })

    await expect(pending).rejects.toMatchObject({
      message: 'LLM down',
      statusCode: StatusCodes.BAD_GATEWAY
    })
  })

  describe('consumer', () => {
    async function consume(request: Record<string, unknown>): Promise<jest.Mock> {
      const ack = jest.fn()
      const sendToQueue = jest.fn().mockReturnValue(true)
      let queueHandler: ((msg: unknown) => void) | undefined

      mockedGetChannel.mockResolvedValue({
        consume: jest.fn().mockImplementation(async (_queue, onMessage) => {
          queueHandler = onMessage
          return { consumerTag: 'worker-1' }
        }),
        sendToQueue,
        ack,
        cancel: jest.fn()
      })
      await ChatMessageBroker.initialize()

      queueHandler?.({
        content: Buffer.from(JSON.stringify(request)),
        properties: { replyTo: 'amq.gen-reply', correlationId: 'corr-1' }
      })

      await waitForMockCalls(sendToQueue)
      await waitForMockCalls(ack)
      return sendToQueue
    }

    const queued = {
      messageId: 'm3',
      source: 'web',
      message: 'status lampu',
      receivedAt: 1_000,
      enqueuedAt: 1_010
    }

    it('calls ChatService.query with a trace for queued work and replies', async () => {
      mockedChatService.query.mockResolvedValue({ reply: 'ok' })

      const sendToQueue = await consume(queued)

      expect(mockedChatService.query).toHaveBeenCalledWith('status lampu', {
        withAudio: false,
        source: 'web',
        captureTrace: true
      })
      expect(sendToQueue).toHaveBeenCalledWith(
        'amq.gen-reply',
        expect.any(Buffer),
        expect.objectContaining({ correlationId: 'corr-1' })
      )
    })

    it('records the executed command, falling back to messageId and the chat channel', async () => {
      const trace = {
        toolCalls: [],
        toolResults: [],
        agentLatencyMs: 5,
        contextLatencyMs: 3,
        model: 'gpt-4o'
      }
      mockedChatService.query.mockResolvedValue({ reply: 'ok', trace })

      await consume(queued)

      expect(mockedAgentLog.recordExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'm3',
          source: 'web',
          channel: 'chat',
          command: 'status lampu',
          result: { ok: true, reply: 'ok', trace },
          timing: expect.objectContaining({ receivedAt: 1_000, enqueuedAt: 1_010 })
        })
      )
    })

    it('records the client-chosen request id, channel and user', async () => {
      mockedChatService.query.mockResolvedValue({ reply: 'ok' })

      await consume({
        ...queued,
        requestId: 'client-req-1',
        channel: 'voice',
        userId: 7,
        sessionId: 'web:7'
      })

      expect(mockedAgentLog.recordExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'client-req-1',
          channel: 'voice',
          userId: 7,
          sessionId: 'web:7'
        })
      )
    })

    it('records a failed command when the agent throws', async () => {
      mockedChatService.query.mockRejectedValue(new Error('agent down'))

      await consume(queued)

      expect(mockedAgentLog.recordExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          result: { ok: false, error: 'Failed to process chat message' }
        })
      )
    })

    it('still replies when logging is slow or never finishes', async () => {
      mockedChatService.query.mockResolvedValue({ reply: 'ok' })
      mockedAgentLog.recordExecution.mockReturnValue(new Promise(() => undefined))

      const sendToQueue = await consume(queued)

      expect(sendToQueue).toHaveBeenCalled()
    })
  })
})
