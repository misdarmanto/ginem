import type { ChatAudioPayload } from '../chat'

export type ChatMessageSource = 'web' | 'whatsapp'
export type ChatChannel = 'chat' | 'voice'

export interface WhatsappQuotedKey {
  remoteJid: string
  id: string
  fromMe?: boolean
  participant?: string
}

export interface WhatsappChatMeta {
  userId: number
  chatJid: string
  quotedKey?: WhatsappQuotedKey
}

export interface ChatQueueRequest {
  messageId: string
  /** Id the client chose for this command, used to match its own latency measurement. */
  requestId?: string
  channel?: ChatChannel
  /** ms epoch when the server first saw the command. */
  receivedAt: number
  /** ms epoch when it was put on the queue. */
  enqueuedAt: number
  source: ChatMessageSource
  message: string
  withAudio?: boolean
  userId?: number
  sessionId?: string
  whatsapp?: WhatsappChatMeta
}

export interface ChatQueueSuccessReply {
  messageId: string
  ok: true
  reply: string
  audio?: ChatAudioPayload
}

export interface ChatQueueErrorReply {
  messageId: string
  ok: false
  error: string
  statusCode?: number
}

export type ChatQueueReply = ChatQueueSuccessReply | ChatQueueErrorReply
