import { Router } from 'express'
import { MiddleWares } from '../middlewares/index'
import { chatSchema, ttsPreviewSchema } from '../schemas/ChatSchema'
import { previewVoiceSchema, selectVoiceSchema } from '../schemas/VoiceSchema'
import { ChatController } from '../controllers/chat/index'

const ChatRoute = Router()

ChatRoute.use(MiddleWares.useAuthorization)

ChatRoute.get(
  '/tts-preview',
  MiddleWares.validate({ query: ttsPreviewSchema }),
  ChatController.ttsPreview
)

ChatRoute.post('/voice/session', ChatController.createVoiceSession)

ChatRoute.get('/voice/preference', ChatController.getVoicePreference)

ChatRoute.post(
  '/voice/preference',
  MiddleWares.validate({ body: selectVoiceSchema }),
  ChatController.selectVoice
)

ChatRoute.get(
  '/voice/preview',
  MiddleWares.validate({ query: previewVoiceSchema }),
  ChatController.previewVoice
)

ChatRoute.post('/', MiddleWares.validate({ body: chatSchema }), ChatController.query)

export default ChatRoute
