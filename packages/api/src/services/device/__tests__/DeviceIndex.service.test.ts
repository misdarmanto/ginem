import { DeviceIndexService } from '../DeviceIndex.service'
import { pineconeService } from '../../rag/Pinecone.service'
import { PineconeBackupService } from '../../rag/PineconeBackup.service'
import { IndexingModel } from '../../../models/IndexingModel'

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('../../../models/DeviceModel', () => ({
  DeviceModel: { findAll: jest.fn() }
}))

jest.mock('../../../models/IndexingModel', () => ({
  IndexingModel: { findAll: jest.fn() }
}))

jest.mock('../../rag/Pinecone.service', () => ({
  pineconeService: { addDocuments: jest.fn(), deleteByContentAndSource: jest.fn() }
}))

jest.mock('../../rag/PineconeBackup.service', () => ({
  PineconeBackupService: { saveIndexingBackup: jest.fn() }
}))

const mockedPinecone = pineconeService as jest.Mocked<typeof pineconeService>
const mockedBackup = PineconeBackupService as jest.Mocked<typeof PineconeBackupService>
const mockedIndexing = IndexingModel as jest.Mocked<typeof IndexingModel>

const device = {
  deviceId: 7,
  deviceName: 'Smoke Sensor',
  deviceType: 'sensor' as const,
  deviceDescription: 'Detects smoke',
  deviceMetadata: { room: 'kitchen' }
}
const content = 'Device "Smoke Sensor" is a sensor. Located in kitchen. Detects smoke'

describe('DeviceIndexService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedIndexing.findAll.mockResolvedValue([])
  })

  it('builds content from name, type, room and description', () => {
    expect(DeviceIndexService.buildContent(device)).toBe(content)
  })

  it('indexes to Pinecone and the indexings backup table with a per-device source', async () => {
    await DeviceIndexService.index(device)

    const doc = [{ text: content, source: 'device-7' }]
    expect(mockedPinecone.addDocuments).toHaveBeenCalledWith(doc)
    expect(mockedBackup.saveIndexingBackup).toHaveBeenCalledWith(doc, 'json')
  })

  it('skips re-indexing when the content is unchanged', async () => {
    mockedIndexing.findAll.mockResolvedValue([{ content }] as never)

    await DeviceIndexService.index(device)

    expect(mockedPinecone.addDocuments).not.toHaveBeenCalled()
  })

  it('replaces the previous entry when the content changed', async () => {
    const destroy = jest.fn()
    mockedIndexing.findAll.mockResolvedValue([{ content: 'old', destroy }] as never)

    await DeviceIndexService.index(device)

    expect(mockedPinecone.deleteByContentAndSource).toHaveBeenCalledWith('old', 'device-7')
    expect(destroy).toHaveBeenCalled()
    expect(mockedPinecone.addDocuments).toHaveBeenCalled()
  })

  it('does not throw when the vector DB fails', async () => {
    mockedPinecone.addDocuments.mockRejectedValue(new Error('down'))
    mockedIndexing.findAll.mockRejectedValue(new Error('down'))

    await expect(DeviceIndexService.index(device)).resolves.toBeUndefined()
    await expect(DeviceIndexService.remove(7)).resolves.toBeUndefined()
  })
})
