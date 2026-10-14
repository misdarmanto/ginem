import type { ChatToolResultTrace } from '../../chat/Chat.service'
import { outcomeFromReplyText, outcomeFromToolResults } from '../agentOutcome'

const result = (
  name: string,
  error?: string,
  output = '{"ok":true}'
): ChatToolResultTrace => ({
  callId: `${name}-1`,
  name,
  ok: error == null,
  ...(error != null && { error }),
  output
})

describe('outcomeFromToolResults', () => {
  it('is success when an actuator command succeeded', () => {
    expect(
      outcomeFromToolResults([result('set_actuator_state_by_device_name')])
    ).toMatchObject({ status: 'success' })
  })

  it('is failed when the device is not registered', () => {
    expect(
      outcomeFromToolResults([result('set_actuator_state_by_device_name', 'Device not found')])
    ).toEqual({ status: 'failed', reason: 'Device not found' })
  })

  it('is failed when the target is not an actuator', () => {
    expect(
      outcomeFromToolResults([
        result('set_actuator_state_by_device_name', 'Device is not an actuator')
      ])
    ).toMatchObject({ status: 'failed', reason: 'Device is not an actuator' })
  })

  it('lets a failed lookup be overruled by a mutation that succeeded', () => {
    expect(
      outcomeFromToolResults([
        result('get_last_log_by_device_name', 'Device not found'),
        result('set_actuator_state_by_device_name')
      ])
    ).toMatchObject({ status: 'success' })
  })

  it('is failed when any mutation failed even if another succeeded', () => {
    expect(
      outcomeFromToolResults([
        result('set_actuator_state_by_device_name'),
        result('schedule_actuator_state_at', 'Device not found')
      ])
    ).toMatchObject({ status: 'failed' })
  })

  it('is failed when only read tools ran and one errored', () => {
    expect(
      outcomeFromToolResults([result('get_last_log_by_device_name', 'Device not found')])
    ).toMatchObject({ status: 'failed' })
  })

  it('is inconclusive for read-only tools that worked', () => {
    expect(outcomeFromToolResults([result('list_devices')])).toBeNull()
  })

  it('is inconclusive when no tool ran', () => {
    expect(outcomeFromToolResults([])).toBeNull()
  })

  it('keeps long failure reasons short', () => {
    const outcome = outcomeFromToolResults([
      result('set_actuator_state_by_device_name', 'x'.repeat(1000))
    ])

    expect(outcome?.reason).toHaveLength(200)
  })
})

describe('outcomeFromReplyText', () => {
  it('treats a trailing question as a clarification', () => {
    expect(outcomeFromReplyText('Lampu yang mana, ruang tamu atau kamar?').status).toBe(
      'clarification'
    )
  })

  it.each([
    'Maaf, perangkat TV tidak terdaftar.',
    'Lampu tidak ditemukan di sistem.',
    'Perintah gagal dijalankan.'
  ])('treats "%s" as a failure', (reply) => {
    expect(outcomeFromReplyText(reply).status).toBe('failed')
  })

  it('treats an ordinary answer as success', () => {
    expect(outcomeFromReplyText('Suhu ruang tamu 28 derajat.').status).toBe('success')
  })
})
