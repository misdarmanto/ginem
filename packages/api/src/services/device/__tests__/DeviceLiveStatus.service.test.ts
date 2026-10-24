import { DeviceLiveStatusService } from '../DeviceLiveStatus.service'
import { MQTTService } from '../../mqtt/MQTT.service'

jest.mock('../../mqtt/MQTT.service', () => ({
  MQTTService: { getLastDeviceState: jest.fn(), getLastDeviceTelemetry: jest.fn() }
}))

const mocked = MQTTService as jest.Mocked<typeof MQTTService>
const NOW = new Date('2026-10-24T10:00:00.000Z')
const secondsAgo = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString()

describe('DeviceLiveStatusService', () => {
  beforeEach(() => {
    mocked.getLastDeviceState.mockReturnValue(null)
    mocked.getLastDeviceTelemetry.mockReturnValue(null)
  })

  it('is offline with no state when the device never reported', () => {
    expect(DeviceLiveStatusService.forDevice(8, NOW)).toEqual({
      reportedState: null,
      lastSeenAt: null,
      online: false
    })
  })

  it('reports the relay state and presence from a recent state message', () => {
    mocked.getLastDeviceState.mockReturnValue({
      deviceId: 8,
      payload: { state: 'on' },
      receivedAt: secondsAgo(10)
    })

    expect(DeviceLiveStatusService.forDevice(8, NOW)).toEqual({
      reportedState: 'on',
      lastSeenAt: secondsAgo(10),
      online: true
    })
  })

  it('counts telemetry as a sign of life for sensors', () => {
    mocked.getLastDeviceTelemetry.mockReturnValue({
      deviceId: 9,
      payload: { value: '30' },
      receivedAt: secondsAgo(3)
    })

    expect(DeviceLiveStatusService.forDevice(9, NOW)).toMatchObject({
      reportedState: null,
      online: true
    })
  })

  it('goes offline after three missed heartbeats but keeps the last state', () => {
    mocked.getLastDeviceState.mockReturnValue({
      deviceId: 8,
      payload: { state: 'off' },
      receivedAt: secondsAgo(120)
    })

    expect(DeviceLiveStatusService.forDevice(8, NOW)).toMatchObject({
      reportedState: 'off',
      online: false
    })
  })

  it('attaches the live status to a serialised device', () => {
    const device = { deviceId: 8, toJSON: () => ({ deviceId: 8, deviceName: 'Lampu' }) }

    expect(DeviceLiveStatusService.attach(device)).toMatchObject({
      deviceName: 'Lampu',
      liveStatus: { online: false }
    })
  })
})
