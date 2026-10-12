import { RuleCache } from '../RuleCache.service'
import { RuleManagementService } from '../RuleManagement.service'

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('../../../configs/database', () => ({ sequelizeInit: { transaction: jest.fn() } }))
jest.mock('../../../models/DeviceModel', () => ({ DeviceModel: {} }))
jest.mock('../../../models/ruleAssociations', () => ({
  RuleModel: { findAll: jest.fn() },
  RuleTriggerModel: {},
  RuleConditionModel: {},
  RuleActionModel: {},
  RuleExecutionLogModel: {}
}))

const { RuleModel } = jest.requireMock('../../../models/ruleAssociations')
const logger = jest.requireMock('../../../utilities/logger').default

function ruleRow(ruleId: number, withTrigger = true) {
  return {
    ruleId,
    get: () => ({
      ruleId,
      name: `Rule ${ruleId}`,
      originalPrompt: 'prompt',
      conditionLogic: 'AND',
      isActive: true,
      cooldownSec: 0,
      lastTriggeredAt: null,
      triggers: withTrigger
        ? [
            {
              deviceId: 10,
              metric: 'temperature',
              eventType: 'telemetry',
              device: { deviceName: 'Temp Sensor' }
            }
          ]
        : [],
      conditions: [],
      actions: []
    })
  }
}

describe('RuleManagementService.refreshCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    RuleCache.clear()
  })

  afterEach(() => {
    RuleCache.clear()
  })

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
