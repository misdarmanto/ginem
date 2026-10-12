import { queryChat } from './query'
import { ttsPreview } from './ttsPreview'
import { createVoiceSession } from './voiceSession'
import { getVoicePreference, selectVoice } from './voicePreference'
import { previewVoice } from './voicePreview'

export const ChatController = {
  query: queryChat,
  ttsPreview,
  createVoiceSession,
  getVoicePreference,
  selectVoice,
  previewVoice
}
