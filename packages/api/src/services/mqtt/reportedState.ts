export type ActuatorState = 'on' | 'off'

const REPORTED_STATES: Record<string, ActuatorState> = {
  on: 'on',
  '1': 'on',
  off: 'off',
  '0': 'off'
}

/** Reads the relay state a device published on its `/state` topic, or null if unreadable. */
export function parseReportedState(payload: unknown): ActuatorState | null {
  const raw =
    payload != null && typeof payload === 'object'
      ? (payload as { state?: unknown }).state
      : payload
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  return REPORTED_STATES[String(raw).trim().toLowerCase()] ?? null
}
