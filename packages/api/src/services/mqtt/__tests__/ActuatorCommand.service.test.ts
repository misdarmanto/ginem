import { ActuatorCommandService } from '../ActuatorCommand.service'
import { MQTTService } from '../MQTT.service'

jest.mock('../MQTT.service', () => ({
  MQTTService: {
    onDeviceStatus: jest.fn(),
    publishActuatorState: jest.fn()
  }
}))

const mockedMqtt = MQTTService as jest.Mocked<typeof MQTTService>
type Listener = (deviceId: number, payload: unknown) => void

describe('ActuatorCommandService.sendAndConfirm', () => {
  let listener: Listener
  const unsubscribe = jest.fn()

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockedMqtt.onDeviceStatus.mockImplementation((l) => {
      listener = l
      return unsubscribe
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('publishes the command and confirms when the device reports the state', async () => {
    const result = ActuatorCommandService.sendAndConfirm(8, 'on')

    expect(mockedMqtt.publishActuatorState).toHaveBeenCalledWith(8, 'on')
    listener(8, { state: 'on' })

    await expect(result).resolves.toBe('confirmed')
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('ignores reports from other devices and unreadable payloads', async () => {
    const result = ActuatorCommandService.sendAndConfirm(8, 'on', 1000)

    listener(9, { state: 'on' })
    listener(8, { foo: 'bar' })
    jest.advanceTimersByTime(1000)

    await expect(result).resolves.toBe('unconfirmed')
  })

  it('accepts numeric reports such as "1" and "0"', async () => {
    const result = ActuatorCommandService.sendAndConfirm(8, 'off')

    listener(8, { state: '0' })

    await expect(result).resolves.toBe('confirmed')
  })

  it('keeps waiting after a different state and confirms the later report', async () => {
    const result = ActuatorCommandService.sendAndConfirm(8, 'on', 1000)

    listener(8, { state: 'off' })
    listener(8, { state: 'on' })

    await expect(result).resolves.toBe('confirmed')
  })

  it('reports a mismatch when the device only reports a different state', async () => {
    const result = ActuatorCommandService.sendAndConfirm(8, 'on', 1000)

    listener(8, { state: 'off' })
    jest.advanceTimersByTime(1000)

    await expect(result).resolves.toBe('mismatch')
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('reports unconfirmed when the device stays silent', async () => {
    const result = ActuatorCommandService.sendAndConfirm(8, 'on', 1000)

    jest.advanceTimersByTime(1000)

    await expect(result).resolves.toBe('unconfirmed')
  })
})
