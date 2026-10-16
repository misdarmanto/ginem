import { DeviceModel, type IDeviceAttributes } from '../../models/DeviceModel'
import { pineconeService } from '../rag/Pinecone.service'
import logger from '../../utilities/logger'

const DEVICE_VECTOR_SOURCE = 'device'

type IndexableDevice = Pick<
  IDeviceAttributes,
  'deviceId' | 'deviceName' | 'deviceType' | 'deviceDescription' | 'deviceMetadata'
>

/** Keeps each registered device searchable in the vector DB so the LLM can retrieve it. */
export class DeviceIndexService {
  private static vectorId(deviceId: number): string {
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
      await pineconeService.upsertById(
        this.vectorId(device.deviceId),
        this.buildContent(device),
        DEVICE_VECTOR_SOURCE
      )
    } catch (error) {
      logger.warn(
        `[DeviceIndexService] index failed for device ${device.deviceId}: ${String(error)}`
      )
    }
  }

  static async remove(deviceId: number): Promise<void> {
    try {
      await pineconeService.deleteById(this.vectorId(deviceId))
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
}
