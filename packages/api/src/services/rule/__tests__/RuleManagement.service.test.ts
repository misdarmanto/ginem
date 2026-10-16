import { StatusCodes } from 'http-status-codes'
import { AppError } from '../../../utilities/AppError'
import type { ICreateRule } from '../../../schemas/RuleSchema'
import { RuleCache } from '../RuleCache.service'
import { RuleManagementService } from '../RuleManagement.service'

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

const mockTx = { id: 'tx' }

jest.mock('../../../configs/database', () => ({
  sequelizeInit: {
    transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => await work(mockTx))
  }
}))

jest.mock('../../../models/DeviceModel', () => ({ DeviceModel: { findOne: jest.fn() } }))

jest.mock('../../../models/ruleAssociations', () => ({
  RuleModel: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  RuleTriggerModel: { create: jest.fn(), destroy: jest.fn(), update: jest.fn() },
  RuleConditionModel: { create: jest.fn(), destroy: jest.fn(), update: jest.fn() },
  RuleActionModel: { create: jest.fn(), destroy: jest.fn(), update: jest.fn() },
  RuleExecutionLogModel: {}
}))

const { sequelizeInit } = jest.requireMock('../../../configs/database')
const { DeviceModel } = jest.requireMock('../../../models/DeviceModel')
const { RuleModel, RuleTriggerModel, RuleConditionModel, RuleActionModel } =
  jest.requireMock('../../../models/ruleAssociations')
const logger = jest.requireMock('../../../utilities/logger').default

const SENSOR = { deviceId: 10, deviceName: 'Temp Sensor', deviceType: 'sensor' }
const ACTUATOR = { deviceId: 20, deviceName: 'Fan Relay', deviceType: 'actuator' }
const LEGACY_HYBRID = { deviceId: 30, deviceName: 'Old Gate', deviceType: 'hybrid' }
const devices: Record<string, unknown> = {
  [SENSOR.deviceName]: SENSOR,
  [ACTUATOR.deviceName]: ACTUATOR,
  [LEGACY_HYBRID.deviceName]: LEGACY_HYBRID
}

function ruleRow(ruleId: number, withTrigger = true, overrides: Record<string, unknown> = {}) {
  return {
    ruleId,
    update: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    get: () => ({
      ruleId,
      name: `Rule ${ruleId}`,
      originalPrompt: 'prompt',
      conditionLogic: 'AND',
      isActive: true,
      cooldownSec: 60,
      lastTriggeredAt: null,
      triggers: withTrigger
        ? [
            {
              deviceId: SENSOR.deviceId,
              metric: 'temperature',
              eventType: 'telemetry',
              device: { deviceName: SENSOR.deviceName }
            }
          ]
        : [],
      conditions: [
        {
          deviceId: SENSOR.deviceId,
          metric: 'temperature',
          operator: '>',
          threshold: 25,
          unit: 'C',
          device: { deviceName: SENSOR.deviceName }
        }
      ],
      actions: [
        {
          deviceId: ACTUATOR.deviceId,
          actionType: 'set_state',
          state: 'on',
          device: { deviceName: ACTUATOR.deviceName }
        }
      ],
      ...overrides
    })
  }
}

function createPayload(overrides: Partial<ICreateRule> = {}): ICreateRule {
  return {
    name: '  Fan on hot  ',
    originalPrompt: 'hidupkan kipas jika suhu > 25',
    conditionLogic: 'AND',
    cooldownSec: 60,
    isActive: true,
    trigger: { deviceName: SENSOR.deviceName, metric: ' Temperature ' },
    conditions: [{ metric: ' Temperature ', operator: '>', threshold: 25, unit: 'C' }],
    actions: [{ deviceName: ACTUATOR.deviceName, state: 'on' }],
    ...overrides
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  RuleCache.clear()
  DeviceModel.findOne.mockImplementation(
    async ({ where }: { where: { deviceName: string } }) => devices[where.deviceName] ?? null
  )
  RuleModel.findAll.mockResolvedValue([])
  RuleModel.create.mockResolvedValue({ ruleId: 7 })
  RuleModel.update.mockResolvedValue([1])
  RuleModel.findOne.mockResolvedValue(ruleRow(7))
})

afterEach(() => {
  RuleCache.clear()
})

describe('RuleManagementService.refreshCache', () => {
  it('loads every valid active rule into the cache', async () => {
    RuleModel.findAll.mockResolvedValue([ruleRow(1), ruleRow(2)])

    await RuleManagementService.refreshCache()

    expect(RuleCache.isLoaded()).toBe(true)
    expect(RuleCache.getAll().map((r) => r.ruleId)).toEqual([1, 2])
  })

  it('skips a rule without trigger instead of poisoning the whole cache', async () => {
    RuleModel.findAll.mockResolvedValue([ruleRow(1), ruleRow(2, false), ruleRow(3)])

    await RuleManagementService.refreshCache()

    expect(RuleCache.getAll().map((r) => r.ruleId)).toEqual([1, 3])
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ruleId=2'))
  })

  it('rethrows and keeps the previous cache when the database query fails', async () => {
    RuleCache.setRules([])
    RuleModel.findAll.mockRejectedValue(new Error('db down'))

    await expect(RuleManagementService.refreshCache()).rejects.toThrow('db down')
    expect(RuleCache.getAll()).toEqual([])
  })
})

describe('RuleManagementService.create', () => {
  it('persists rule, trigger, conditions and actions in one transaction', async () => {
    const result = await RuleManagementService.create(createPayload())

    expect(RuleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Fan on hot', cooldownSec: 60, isActive: true }),
      { transaction: mockTx }
    )
    expect(RuleTriggerModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 7, deviceId: 10, metric: 'temperature' }),
      { transaction: mockTx }
    )
    expect(RuleConditionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 7, deviceId: 10, metric: 'temperature', threshold: 25 }),
      { transaction: mockTx }
    )
    expect(RuleActionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 7, deviceId: 20, state: 'on' }),
      { transaction: mockTx }
    )
    expect(result.ruleId).toBe(7)
  })

  it('refreshes the rule cache after a successful create', async () => {
    RuleModel.findAll.mockResolvedValue([ruleRow(7)])

    await RuleManagementService.create(createPayload())

    expect(RuleCache.getAll().map((r) => r.ruleId)).toEqual([7])
  })

  it('generates a name when none is given', async () => {
    await RuleManagementService.create(createPayload({ name: '   ' }))

    expect(RuleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rule: Temp Sensor → Fan Relay' }),
      expect.anything()
    )
  })

  it('rejects an unknown trigger device with 404 before opening a transaction', async () => {
    const error = await RuleManagementService.create(
      createPayload({ trigger: { deviceName: 'Ghost', metric: 'temperature' } })
    ).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).statusCode).toBe(StatusCodes.NOT_FOUND)
    expect(sequelizeInit.transaction).not.toHaveBeenCalled()
  })

  it('rejects an actuator as trigger with 400', async () => {
    const error = await RuleManagementService.create(
      createPayload({ trigger: { deviceName: ACTUATOR.deviceName, metric: 'temperature' } })
    ).catch((e: unknown) => e)

    expect((error as AppError).statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(RuleModel.create).not.toHaveBeenCalled()
  })

  it('rejects a device of the removed hybrid type as trigger and as action target', async () => {
    const asTrigger = await RuleManagementService.create(
      createPayload({ trigger: { deviceName: LEGACY_HYBRID.deviceName, metric: 'temperature' } })
    ).catch((e: unknown) => e)
    const asAction = await RuleManagementService.create(
      createPayload({ actions: [{ deviceName: LEGACY_HYBRID.deviceName, state: 'on' }] })
    ).catch((e: unknown) => e)

    expect((asTrigger as AppError).statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect((asAction as AppError).statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(RuleModel.create).not.toHaveBeenCalled()
  })

  it('says which device type each side of a rule needs', async () => {
    const trigger = await RuleManagementService.create(
      createPayload({ trigger: { deviceName: ACTUATOR.deviceName, metric: 'temperature' } })
    ).catch((e: unknown) => e)
    const action = await RuleManagementService.create(
      createPayload({ actions: [{ deviceName: SENSOR.deviceName, state: 'on' }] })
    ).catch((e: unknown) => e)

    expect((trigger as AppError).message).toContain('Use a sensor.')
    expect((action as AppError).message).toContain('Use an actuator.')
  })

  it('rejects a sensor as action target with 400', async () => {
    const error = await RuleManagementService.create(
      createPayload({ actions: [{ deviceName: SENSOR.deviceName, state: 'on' }] })
    ).catch((e: unknown) => e)

    expect((error as AppError).statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(RuleModel.create).not.toHaveBeenCalled()
  })

  it('wraps unexpected database errors as a generic 500', async () => {
    RuleModel.create.mockRejectedValue(new Error('constraint violation'))

    const error = await RuleManagementService.create(createPayload()).catch((e: unknown) => e)

    expect((error as AppError).statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect((error as AppError).message).toBe('Failed to create rule')
  })
})

describe('RuleManagementService.update', () => {
  it('returns 404 when the rule does not exist', async () => {
    RuleModel.findOne.mockResolvedValue(null)

    const error = await RuleManagementService.update({ ruleId: 99 }).catch((e: unknown) => e)

    expect((error as AppError).statusCode).toBe(StatusCodes.NOT_FOUND)
    expect(sequelizeInit.transaction).not.toHaveBeenCalled()
  })

  it('keeps existing children when only scalar fields change', async () => {
    await RuleManagementService.update({ ruleId: 7, cooldownSec: 5 })

    expect(RuleModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rule 7', cooldownSec: 5 }),
      { where: { ruleId: 7 }, transaction: mockTx }
    )
    expect(RuleTriggerModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 7, deviceId: 10, metric: 'temperature' }),
      { transaction: mockTx }
    )
    expect(RuleConditionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 10, operator: '>', threshold: 25 }),
      { transaction: mockTx }
    )
    expect(RuleActionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 20, state: 'on' }),
      { transaction: mockTx }
    )
  })

  it('hard-deletes old trigger, conditions and actions before recreating them', async () => {
    await RuleManagementService.update({ ruleId: 7, actions: [{ deviceName: 'Fan Relay', state: 'off' }] })

    for (const model of [RuleTriggerModel, RuleConditionModel, RuleActionModel]) {
      expect(model.destroy).toHaveBeenCalledWith({
        where: { ruleId: 7 },
        force: true,
        transaction: mockTx
      })
    }
    expect(RuleActionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'off' }),
      { transaction: mockTx }
    )
  })

  it('rejects an actuator as the new trigger before opening a transaction', async () => {
    const error = await RuleManagementService.update({
      ruleId: 7,
      trigger: { deviceName: ACTUATOR.deviceName, metric: 'temperature' }
    }).catch((e: unknown) => e)

    expect((error as AppError).statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(sequelizeInit.transaction).not.toHaveBeenCalled()
  })

  it('refreshes the rule cache after a successful update', async () => {
    RuleModel.findAll.mockResolvedValue([ruleRow(7)])

    await RuleManagementService.update({ ruleId: 7, isActive: true })

    expect(RuleCache.getAll().map((r) => r.ruleId)).toEqual([7])
  })
})

describe('RuleManagementService.remove', () => {
  it('returns 404 when the rule does not exist', async () => {
    RuleModel.findOne.mockResolvedValue(null)

    const error = await RuleManagementService.remove(99).catch((e: unknown) => e)

    expect((error as AppError).statusCode).toBe(StatusCodes.NOT_FOUND)
    expect(sequelizeInit.transaction).not.toHaveBeenCalled()
  })

  it('soft-deletes children and the rule inside one transaction', async () => {
    const row = ruleRow(7)
    RuleModel.findOne.mockResolvedValue(row)

    const result = await RuleManagementService.remove(7)

    for (const model of [RuleTriggerModel, RuleConditionModel, RuleActionModel]) {
      expect(model.update).toHaveBeenCalledWith(
        { deleted: true },
        { where: { ruleId: 7 }, transaction: mockTx }
      )
    }
    expect(row.update).toHaveBeenCalledWith(
      { deleted: true, isActive: false },
      { transaction: mockTx }
    )
    expect(row.destroy).toHaveBeenCalledWith({ transaction: mockTx })
    expect(result).toEqual({ ruleId: 7, deleted: true })
  })

  it('drops the removed rule from the cache', async () => {
    RuleCache.setRules([{ ruleId: 7 } as never])
    RuleModel.findAll.mockResolvedValue([])

    await RuleManagementService.remove(7)

    expect(RuleCache.getAll()).toEqual([])
  })

  it('wraps unexpected database errors as a generic 500', async () => {
    sequelizeInit.transaction.mockRejectedValueOnce(new Error('deadlock'))

    const error = await RuleManagementService.remove(7).catch((e: unknown) => e)

    expect((error as AppError).statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect((error as AppError).message).toBe('Failed to delete rule')
  })
})
