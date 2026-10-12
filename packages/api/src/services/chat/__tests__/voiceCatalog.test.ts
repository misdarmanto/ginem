import { VOICE_IDS } from '../../../schemas/VoiceSchema'
import { VOICE_OPTIONS, isVoiceId } from '../voiceCatalog'

describe('voiceCatalog', () => {
  it('offers every valid voice exactly once', () => {
    expect(VOICE_OPTIONS.map((option) => option.id)).toEqual([...VOICE_IDS])
  })

  it('gives every voice a label and description', () => {
    VOICE_OPTIONS.forEach((option) => {
      expect(option.label).not.toBe('')
      expect(option.description).not.toBe('')
    })
  })

  it('recommends the most natural voices first', () => {
    const recommended = VOICE_OPTIONS.filter((option) => option.recommended).map(
      (option) => option.id
    )
    expect(recommended).toEqual(['marin', 'cedar'])
    expect(VOICE_OPTIONS.slice(0, 2).map((option) => option.id)).toEqual(recommended)
  })

  it('recognises only offered voices', () => {
    expect(isVoiceId('marin')).toBe(true)
    expect(isVoiceId('nova')).toBe(false)
    expect(isVoiceId(null)).toBe(false)
  })
})
