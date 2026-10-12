import { z } from 'zod'

export const VOICE_IDS = [
  'marin',
  'cedar',
  'coral',
  'sage',
  'ballad',
  'verse',
  'ash',
  'alloy',
  'shimmer',
  'echo'
] as const

export type VoiceId = (typeof VOICE_IDS)[number]

export const voiceIdSchema = z.enum(VOICE_IDS)

export const selectVoiceSchema = z.object({
  voice: voiceIdSchema.describe('Realtime voice id')
})

export const previewVoiceSchema = z.object({
  voice: voiceIdSchema.describe('Voice to preview')
})

export type ISelectVoiceSchema = z.infer<typeof selectVoiceSchema>
export type IPreviewVoiceSchema = z.infer<typeof previewVoiceSchema>
