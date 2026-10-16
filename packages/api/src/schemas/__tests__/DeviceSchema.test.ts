import {
  createDeviceSchema,
  findAllDeviceSchema,
  findDetailDeviceSchema,
  removeDeviceSchema,
  updateDeviceSchema
} from '../DeviceSchema'

describe('DeviceSchema', () => {
  describe('createDeviceSchema', () => {
    it('accepts a valid device payload', () => {
      const result = createDeviceSchema.parse({
        deviceName: 'Living Room Light',
        deviceType: 'actuator'
      })

      expect(result.deviceName).toBe('Living Room Light')
      expect(result.deviceType).toBe('actuator')
    })

    it.each([['sensor'], ['actuator']])('accepts the %s type', (deviceType) => {
      expect(createDeviceSchema.safeParse({ deviceName: 'Device', deviceType }).success).toBe(true)
    })

    it.each([['hybrid'], ['gateway'], ['']])('rejects the %p type', (deviceType) => {
      expect(createDeviceSchema.safeParse({ deviceName: 'Device', deviceType }).success).toBe(false)
    })

    it('accepts optional deviceDescription', () => {
      const result = createDeviceSchema.parse({
        deviceName: 'Living Room Light',
        deviceDescription: 'Ceiling lamp in living room',
        deviceType: 'actuator'
      })

      expect(result.deviceDescription).toBe('Ceiling lamp in living room')
    })

    it('rejects invalid device type', () => {
      const result = createDeviceSchema.safeParse({
        deviceName: 'Sensor',
        deviceType: 'invalid'
      })

      expect(result.success).toBe(false)
    })
  })

  describe('deviceDescription word limit', () => {
    const base = { deviceName: 'Relay', deviceType: 'actuator' as const }
    const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ')

    it('accepts 100 words and rejects 101', () => {
      expect(
        createDeviceSchema.safeParse({ ...base, deviceDescription: words(100) }).success
      ).toBe(true)
      expect(
        createDeviceSchema.safeParse({ ...base, deviceDescription: words(101) }).success
      ).toBe(false)
    })
  })

  describe('updateDeviceSchema', () => {
    it('rejects changing a device to the removed hybrid type', () => {
      expect(updateDeviceSchema.safeParse({ deviceId: 1, deviceType: 'hybrid' }).success).toBe(false)
    })

    it('still accepts changing between sensor and actuator', () => {
      expect(updateDeviceSchema.safeParse({ deviceId: 1, deviceType: 'sensor' }).success).toBe(true)
      expect(updateDeviceSchema.safeParse({ deviceId: 1, deviceType: 'actuator' }).success).toBe(true)
    })

    it('requires positive deviceId', () => {
      const result = updateDeviceSchema.safeParse({
        deviceId: 0,
        deviceName: 'Updated'
      })

      expect(result.success).toBe(false)
    })

    it('accepts deviceDescription update', () => {
      const result = updateDeviceSchema.parse({
        deviceId: 1,
        deviceDescription: 'Updated description'
      })

      expect(result.deviceDescription).toBe('Updated description')
    })
  })

  describe('findDetailDeviceSchema', () => {
    it('coerces string deviceId to number', () => {
      const result = findDetailDeviceSchema.parse({ deviceId: '12' })

      expect(result.deviceId).toBe(12)
    })
  })

  describe('removeDeviceSchema', () => {
    it('accepts coerced positive deviceId', () => {
      const result = removeDeviceSchema.parse({ deviceId: '3' })

      expect(result.deviceId).toBe(3)
    })
  })

  describe('findAllDeviceSchema', () => {
    it('applies defaults and transforms pagination flag', () => {
      const result = findAllDeviceSchema.parse({
        jwtPayload: { userId: 1 },
        pagination: 'true'
      })

      expect(result.page).toBe(1)
      expect(result.size).toBe(20)
      expect(result.pagination).toBe(true)
    })

    it('rejects size above 100', () => {
      const result = findAllDeviceSchema.safeParse({
        jwtPayload: { userId: 1 },
        size: 101
      })

      expect(result.success).toBe(false)
    })
  })
})
