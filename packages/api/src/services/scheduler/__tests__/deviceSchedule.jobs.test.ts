import { executeActuatorJob } from '../deviceSchedule.jobs'
import { SchedulerLogModel } from '../../../models/SchedulerLogModel'

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('../../../models/SchedulerLogModel', () => ({
  SchedulerLogModel: { update: jest.fn().mockResolvedValue([1]) }
}))

jest.mock('../../device', () => ({
  DeviceService: {
    findByName: jest.fn().mockResolvedValue({
      deviceId: 8,
      deviceName: 'Lampu',
      deviceType: 'actuator'
    })
  },
  DeviceLogService: {
    create: jest.fn().mockResolvedValue({ deviceLogId: 1, deviceLogData: '1' })
  }
}))

jest.mock('../../mqtt/MQTT.service', () => ({
  MQTTService: { isConnected: jest.fn().mockReturnValue(true) }
}))

jest.mock('../../mqtt/ActuatorCommand.service', () => ({
  ActuatorCommandService: { sendWithRetry: jest.fn() }
}))

jest.mock('../deviceSchedule.queue', () => ({
  removeRepeatDeviceScheduleJob: jest.fn()
}))

const { ActuatorCommandService } = jest.requireMock('../../mqtt/ActuatorCommand.service')
const mockedUpdate = SchedulerLogModel.update as jest.Mock

const job = {
  jobId: 'job-1',
  deviceName: 'Lampu',
  state: 'on',
  category: 'once'
} as never

describe('executeActuatorJob', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('completes the job when the device confirms', async () => {
    ActuatorCommandService.sendWithRetry.mockResolvedValue({
      confirmation: 'confirmed',
      attempts: 1
    })

    await executeActuatorJob(job)

    expect(ActuatorCommandService.sendWithRetry).toHaveBeenCalledWith(8, 'on')
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
      expect.anything()
    )
  })

  it('fails the job when the device never confirms', async () => {
    ActuatorCommandService.sendWithRetry.mockResolvedValue({
      confirmation: 'unconfirmed',
      attempts: 2
    })

    await executeActuatorJob(job)

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('did not confirm')
      }),
      expect.anything()
    )
  })
})
