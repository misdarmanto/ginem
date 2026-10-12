import { VOICE_IDS, type VoiceId } from '../../schemas/VoiceSchema'

export interface VoiceOption {
  id: VoiceId
  label: string
  description: string
  recommended: boolean
}

const VOICE_DETAILS: Record<VoiceId, { description: string; recommended?: boolean }> = {
  marin: { description: 'Hangat dan sangat natural, paling mirip orang asli', recommended: true },
  cedar: { description: 'Tenang dan natural, enak didengar lama', recommended: true },
  coral: { description: 'Ceria dan ramah, terdengar akrab' },
  sage: { description: 'Kalem dan jernih' },
  ballad: { description: 'Lembut dan ekspresif' },
  verse: { description: 'Ekspresif dan dinamis' },
  ash: { description: 'Santai dan bersahaja' },
  alloy: { description: 'Netral dan seimbang' },
  shimmer: { description: 'Lembut dan ringan' },
  echo: { description: 'Jernih dan lugas' }
}

const toLabel = (id: VoiceId): string => id.charAt(0).toUpperCase() + id.slice(1)

export const VOICE_OPTIONS: readonly VoiceOption[] = VOICE_IDS.map((id) => ({
  id,
  label: toLabel(id),
  description: VOICE_DETAILS[id].description,
  recommended: VOICE_DETAILS[id].recommended === true
}))

export function isVoiceId(value: unknown): value is VoiceId {
  return VOICE_IDS.some((id) => id === value)
}
