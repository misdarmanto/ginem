import { DeviceModel, type IDeviceAttributes } from '../../models/DeviceModel'
import { IndexingModel } from '../../models/IndexingModel'
import { pineconeService } from '../rag/Pinecone.service'
import { PineconeBackupService } from '../rag/PineconeBackup.service'
import logger from '../../utilities/logger'

type IndexableDevice = Pick<
  IDeviceAttributes,
  'deviceId' | 'deviceName' | 'deviceType' | 'deviceDescription' | 'deviceMetadata'
>

/**
 * Keeps each registered device in the same vector DB and `indexings` backup table as
 * the Embedding feature, so it is searchable by the LLM and visible on the Embedding page.
 */
export class DeviceIndexService {
  private static source(deviceId: number): string {
    return `device-${deviceId}`
  }

  static buildContent(device: IndexableDevice): string {
    const room = (device.deviceMetadata as { room?: unknown } | undefined)?.room
    const parts = [`Device "${device.deviceName}" is a ${device.deviceType}.`]
    if (typeof room === 'string' && room !== '') parts.push(`Located in ${room}.`)
    const description = device.deviceDescription?.trim()
    if (description != null && description !== '') parts.push(description)
    return parts.join(' ')
  }

  /** Best-effort: a vector DB outage must never fail device CRUD. */
  static async index(device: IndexableDevice): Promise<void> {
    try {
      const source = this.source(device.deviceId)
      const text = this.buildContent(device)
      const existing = await IndexingModel.findAll({ where: { source } })

      if (existing.length === 1 && existing[0].content === text) return

      await this.removeEntries(source)
      await pineconeService.addDocuments([{ text, source }])
      await PineconeBackupService.saveIndexingBackup([{ text, source }], 'json')
    } catch (error) {
      logger.warn(
        `[DeviceIndexService] index failed for device ${device.deviceId}: ${String(error)}`
      )
    }
  }

  static async remove(deviceId: number): Promise<void> {
    try {
      await this.removeEntries(this.source(deviceId))
    } catch (error) {
      logger.warn(
        `[DeviceIndexService] remove failed for device ${deviceId}: ${String(error)}`
      )
    }
  }

  static async reindexAll(): Promise<number> {
    const devices = await DeviceModel.findAll({ where: { deleted: 0 } })
    for (const device of devices) {
      await this.index(device)
    }
    return devices.length
  }

  private static async removeEntries(source: string): Promise<void> {
    const entries = await IndexingModel.findAll({ where: { source } })
    for (const entry of entries) {
      await pineconeService.deleteByContentAndSource(entry.content, source)
      await entry.destroy()
    }
  }
}
