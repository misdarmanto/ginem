import { DeviceIndexService } from '../DeviceIndex.service'
import { pineconeService } from '../../rag/Pinecone.service'

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('../../../models/DeviceModel', () => ({
  DeviceModel: { findAll: jest.fn() }
}))

jest.mock('../../rag/Pinecone.service', () => ({
  pineconeService: { upsertById: jest.fn(), deleteById: jest.fn() }
}))

const mockedPinecone = pineconeService as jest.Mocked<typeof pineconeService>

const device = {
  deviceId: 7,
  deviceName: 'Smoke Sensor',
  deviceType: 'sensor' as const,
  deviceDescription: 'Detects smoke',
  deviceMetadata: { room: 'kitchen' }
}

describe('DeviceIndexService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds content from name, type, room and description', () => {
    expect(DeviceIndexService.buildContent(device)).toBe(
      'Device "Smoke Sensor" is a sensor. Located in kitchen. Detects smoke'
    )
  })

  it('upserts under a stable per-device id', async () => {
    await DeviceIndexService.index(device)

    expect(mockedPinecone.upsertById).toHaveBeenCalledWith(
      'device-7',
      expect.stringContaining('Detects smoke'),
      'device'
    )
  })

  it('does not throw when the vector DB fails', async () => {
    mockedPinecone.upsertById.mockRejectedValue(new Error('down'))
    mockedPinecone.deleteById.mockRejectedValue(new Error('down'))

    await expect(DeviceIndexService.index(device)).resolves.toBeUndefined()
    await expect(DeviceIndexService.remove(7)).resolves.toBeUndefined()
  })
})
