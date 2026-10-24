import { MQTTService } from './MQTT.service'
import { parseReportedState, type ActuatorState } from './reportedState'

export type { ActuatorState }

/**
 * - confirmed: the device reported the requested state after the command.
 * - mismatch: the device kept reporting a different state.
 * - unconfirmed: the device reported nothing (offline, lost message, or old firmware).
 */
export type ActuatorConfirmation = 'confirmed' | 'mismatch' | 'unconfirmed'

export const ACTUATOR_CONFIRM_TIMEOUT_MS = 5000
export const ACTUATOR_MAX_ATTEMPTS = 2

export interface ConfirmedCommandResult {
  confirmation: ActuatorConfirmation
  attempts: number
}

export class ActuatorCommandService {
  /** Resends the command until the device confirms it or the attempts run out. */
  static async sendWithRetry(
    deviceId: number,
    state: ActuatorState,
    maxAttempts: number = ACTUATOR_MAX_ATTEMPTS
  ): Promise<ConfirmedCommandResult> {
    let confirmation: ActuatorConfirmation = 'unconfirmed'
    let attempts = 0
    while (attempts < maxAttempts && confirmation !== 'confirmed') {
      attempts += 1
      confirmation = await ActuatorCommandService.sendAndConfirm(deviceId, state)
    }
    return { confirmation, attempts }
  }

  /**
   * Publishes the command, then waits for the device to report its state on
   * `iot/v1/device/{id}/state`. Only reports received after the publish count, so a
   * stale or retained state cannot confirm a command the device never executed.
   */
  static sendAndConfirm(
    deviceId: number,
    state: ActuatorState,
    timeoutMs: number = ACTUATOR_CONFIRM_TIMEOUT_MS
  ): Promise<ActuatorConfirmation> {
    return new Promise((resolve) => {
      let sawOtherState = false

      const finish = (result: ActuatorConfirmation): void => {
        clearTimeout(timer)
        unsubscribe()
        resolve(result)
      }

      const unsubscribe = MQTTService.onDeviceStatus((reportedDeviceId, payload) => {
        if (reportedDeviceId !== deviceId) return
        const reported = parseReportedState(payload)
        if (reported == null) return
        // A different state may be a heartbeat sent just before the device handled the
        // command, so keep waiting for the real report until the timeout.
        if (reported === state) finish('confirmed')
        else sawOtherState = true
      })

      const timer = setTimeout(() => {
        finish(sawOtherState ? 'mismatch' : 'unconfirmed')
      }, timeoutMs)

      MQTTService.publishActuatorState(deviceId, state)
    })
  }
}
