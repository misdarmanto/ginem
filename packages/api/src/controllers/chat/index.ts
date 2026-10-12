import { queryChat } from './query'
import { ttsPreview } from './ttsPreview'
import { createVoiceSession } from './voiceSession'

export const ChatController = {
  query: queryChat,
  ttsPreview,
  createVoiceSession
}
