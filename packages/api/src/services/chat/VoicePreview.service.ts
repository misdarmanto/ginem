import axios from 'axios'
import { StatusCodes } from 'http-status-codes'

import { appConfigs } from '../../configs/appConfig'
import { type VoiceId } from '../../schemas/VoiceSchema'
import { AppError } from '../../utilities/AppError'
import logger from '../../utilities/logger'

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech'
const PREVIEW_MODEL = 'gpt-4o-mini-tts'
const PREVIEW_TEXT =
  'Halo, aku Ginem. Lampu depan udah nyala nih. Ada lagi yang bisa aku bantu?'
const PREVIEW_INSTRUCTIONS =
  'Bicara dalam bahasa Indonesia yang santai, hangat, dan natural seperti teman ngobrol.'
const REQUEST_TIMEOUT_MS = 30_000

const cache = new Map<VoiceId, Buffer>()

export class VoicePreviewService {
  /** Short MP3 sample of a voice. Cached per voice because the sample text never changes. */
  static async synthesize(voice: VoiceId): Promise<Buffer> {
    const cached = cache.get(voice)
    if (cached != null) return cached

    const apiKey = appConfigs.llm.openAIApiKey
    if (apiKey == null || apiKey === '') {
      throw new AppError('OPENAI_API_KEY is not set', StatusCodes.INTERNAL_SERVER_ERROR)
    }

    try {
      const response = await axios.post<ArrayBuffer>(
        OPENAI_TTS_URL,
        {
          model: PREVIEW_MODEL,
          voice,
          input: PREVIEW_TEXT,
          instructions: PREVIEW_INSTRUCTIONS,
          response_format: 'mp3'
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          responseType: 'arraybuffer',
          timeout: REQUEST_TIMEOUT_MS
        }
      )

      const audio = Buffer.from(response.data)
      cache.set(voice, audio)
      return audio
    } catch (serviceError) {
      logger.error(`[VoicePreviewService] synthesize failed: ${String(serviceError)}`)
      throw new AppError('Failed to create voice preview', StatusCodes.INTERNAL_SERVER_ERROR)
    }
  }

  static clearCache(): void {
    cache.clear()
  }
}
