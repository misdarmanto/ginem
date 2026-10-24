import { MQTTService } from '../mqtt/MQTT.service'
import { parseReportedState, type ActuatorState } from '../mqtt/reportedState'

/** Firmware reports every 30s (state) and 5s (telemetry); three missed heartbeats means offline. */
export const DEVICE_PRESENCE_TIMEOUT_MS = 90_000

export interface DeviceLiveStatus {
  /** Relay state the device itself reported; null until it reports one. */
  reportedState: ActuatorState | null
  lastSeenAt: string | null
  online: boolean
}

interface WithToJson {
  deviceId: number
  toJSON: () => object
}

/**
 * What the devices themselves say, as opposed to the command log or the manually set
 * `deviceStatus`. Held in memory, so it refills within one heartbeat after a restart.
 */
export class DeviceLiveStatusService {
  static forDevice(deviceId: number, now: Date = new Date()): DeviceLiveStatus {
    const state = MQTTService.getLastDeviceState(deviceId)
    const telemetry = MQTTService.getLastDeviceTelemetry(deviceId)

    const lastSeenMs = Math.max(
      state != null ? Date.parse(state.receivedAt) : 0,
      telemetry != null ? Date.parse(telemetry.receivedAt) : 0
    )

    return {
      reportedState: state != null ? parseReportedState(state.payload) : null,
      lastSeenAt: lastSeenMs > 0 ? new Date(lastSeenMs).toISOString() : null,
      online: lastSeenMs > 0 && now.getTime() - lastSeenMs <= DEVICE_PRESENCE_TIMEOUT_MS
    }
  }

  static attach<T extends WithToJson>(device: T) {
    return { ...device.toJSON(), liveStatus: DeviceLiveStatusService.forDevice(device.deviceId) }
  }
}
