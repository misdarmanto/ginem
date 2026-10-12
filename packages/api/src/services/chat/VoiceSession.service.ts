import { createHash } from 'crypto'
import axios from 'axios'
import { StatusCodes } from 'http-status-codes'

import { appConfigs } from '../../configs/appConfig'
import { AppError } from '../../utilities/AppError'
import logger from '../../utilities/logger'
import { VoicePreferenceService } from './VoicePreference.service'

export const VOICE_TOOL_NAME = 'ask_assistant'

const REALTIME_CLIENT_SECRET_URL = 'https://api.openai.com/v1/realtime/client_secrets'
const CLIENT_SECRET_TTL_SECONDS = 120
const REQUEST_TIMEOUT_MS = 15_000

const VOICE_INSTRUCTIONS = [
  'Kamu Ginem, teman ngobrol yang membantu mengurus perangkat IoT. Bicaralah seperti manusia sungguhan yang ramah dan santai, bukan robot atau customer service yang kaku.',
  'Pakai bahasa Indonesia percakapan sehari-hari: "aku" untuk dirimu dan "kamu" untuk pengguna. Boleh pakai kata seperti "udah", "nggak", "nih", "ya", "oke", "siap" secukupnya.',
  'Hindari kalimat baku dan formal seperti "Baik, saya akan segera melakukannya", "Tentu", atau "Dengan senang hati". Jangan mengulang pertanyaan pengguna.',
  'Jawab singkat, satu atau dua kalimat, langsung ke inti. Pembukamu boleh bervariasi dan pendek. Kalau kurang jelas atau tidak terdengar, tanya balik dengan santai.',
  'Ucapkan angka secara natural dan bulatkan seperlunya, misalnya "sekitar 28 derajat". Jangan membacakan daftar, simbol, atau ID panjang.',
  `Untuk hal tentang perangkat, jadwal, rule otomasi, data sensor, atau pengetahuan sistem, WAJIB panggil tool ${VOICE_TOOL_NAME} dengan permintaan pengguna apa adanya. Jangan mengarang data.`,
  'Sebelum memanggil tool, ucapkan satu frasa pendek yang berbeda-beda tiap kali, misalnya "bentar ya", "oke, aku cek dulu", atau "siap, sebentar".',
  'Setelah tool selesai, ceritakan hasilnya dengan kata-katamu sendiri seperti ke teman, jangan dibacakan mentah. Kalau hasilnya panjang, ambil intinya saja. Kalau gagal, bilang terus terang dengan santai.',
  'Contoh gaya: pengguna bilang "nyalain lampu depan", kamu jawab "Oke, bentar ya", lalu setelah selesai "Udah nyala nih." Kalau suhu 28 derajat: "Sekarang sekitar 28 derajat, lumayan hangat."',
  'Kalau pengguna berbicara dalam bahasa lain, ikuti bahasanya dengan gaya santai yang sama.'
].join(' ')

export interface VoiceClientSecret {
  clientSecret: string
  expiresAt: number
  model: string
}

interface ClientSecretResponse {
  value?: string
  expires_at?: number
}

export function buildVoiceSessionConfig(
  voice: string = appConfigs.realtime.voice
): Record<string, unknown> {
  return {
    expires_after: { anchor: 'created_at', seconds: CLIENT_SECRET_TTL_SECONDS },
    session: {
      type: 'realtime',
      model: appConfigs.realtime.model,
      instructions: VOICE_INSTRUCTIONS,
      tool_choice: 'auto',
      tools: [
        {
          type: 'function',
          name: VOICE_TOOL_NAME,
          description:
            'Tanyakan atau perintahkan agen Ginem: kontrol perangkat, jadwal, rule, data sensor, dan pengetahuan sistem.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Permintaan pengguna dalam kalimat lengkap.'
              }
            },
            required: ['query']
          }
        }
      ],
      audio: {
        input: {
          noise_reduction: { type: 'near_field' },
          transcription: { model: 'gpt-4o-mini-transcribe', language: 'id' },
          turn_detection: {
            type: 'semantic_vad',
            eagerness: 'auto',
            create_response: true,
            interrupt_response: true
          }
        },
        output: { voice }
      }
    }
  }
}

function hashUserId(userId: number | string): string {
  return createHash('sha256').update(`ginem-user-${userId}`).digest('hex')
}

export class VoiceSessionService {
  static async createClientSecret(userId?: number): Promise<VoiceClientSecret> {
    const apiKey = appConfigs.llm.openAIApiKey
    if (apiKey == null || apiKey === '') {
      throw new AppError('OPENAI_API_KEY is not set', StatusCodes.INTERNAL_SERVER_ERROR)
    }

    try {
      const voice =
        userId != null
          ? await VoicePreferenceService.getVoice(userId)
          : appConfigs.realtime.voice
      const response = await axios.post<ClientSecretResponse>(
        REALTIME_CLIENT_SECRET_URL,
        buildVoiceSessionConfig(voice),
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(userId != null && { 'OpenAI-Safety-Identifier': hashUserId(userId) })
          },
          timeout: REQUEST_TIMEOUT_MS
        }
      )

      const { value, expires_at: expiresAt } = response.data
      if (value == null || value === '' || expiresAt == null) {
        throw new AppError(
          'Realtime API returned an invalid client secret',
          StatusCodes.BAD_GATEWAY
        )
      }

      return { clientSecret: value, expiresAt, model: appConfigs.realtime.model }
    } catch (serviceError) {
      if (serviceError instanceof AppError) throw serviceError

      const detail = axios.isAxiosError(serviceError)
        ? JSON.stringify(serviceError.response?.data ?? serviceError.message)
        : String(serviceError)
      logger.error(`[VoiceSessionService] createClientSecret failed: ${detail}`)
      throw new AppError(
        'Failed to create voice session',
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    }
  }
}
