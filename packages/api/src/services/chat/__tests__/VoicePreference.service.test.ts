import { StatusCodes } from 'http-status-codes'
import { VoicePreferenceService } from '../VoicePreference.service'

jest.mock('../../../configs/appConfig', () => ({
  appConfigs: { realtime: { voice: 'marin' } }
}))

jest.mock('../../../utilities/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

jest.mock('../../../models/UserModel', () => ({
  UserModel: { findOne: jest.fn() }
}))

const { UserModel } = jest.requireMock('../../../models/UserModel')

describe('VoicePreferenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getVoice', () => {
    it("returns the user's saved voice", async () => {
      UserModel.findOne.mockResolvedValue({ userVoice: 'cedar' })

      expect(await VoicePreferenceService.getVoice(1)).toBe('cedar')
    })

    it.each([[null], ['nova'], [undefined]])(
      'falls back to the configured voice when saved value is %p',
      async (saved) => {
        UserModel.findOne.mockResolvedValue({ userVoice: saved })

        expect(await VoicePreferenceService.getVoice(1)).toBe('marin')
      }
    )

    it('falls back to the configured voice for an unknown user', async () => {
      UserModel.findOne.mockResolvedValue(null)

      expect(await VoicePreferenceService.getVoice(1)).toBe('marin')
    })
  })

  describe('getPreference', () => {
    it('returns the voice together with all options', async () => {
      UserModel.findOne.mockResolvedValue({ userVoice: 'coral' })

      const result = await VoicePreferenceService.getPreference(1)

      expect(result.voice).toBe('coral')
      expect(result.options).toHaveLength(10)
    })

    it('wraps database errors as a generic 500', async () => {
      UserModel.findOne.mockRejectedValue(new Error('db down'))

      await expect(VoicePreferenceService.getPreference(1)).rejects.toMatchObject({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR
      })
    })
  })

  describe('setVoice', () => {
    it('saves the chosen voice on the user', async () => {
      const update = jest.fn().mockResolvedValue(undefined)
      UserModel.findOne.mockResolvedValue({ update })

      const result = await VoicePreferenceService.setVoice(1, 'ballad')

      expect(update).toHaveBeenCalledWith({ userVoice: 'ballad' })
      expect(result.voice).toBe('ballad')
    })

    it('returns 404 for an unknown user', async () => {
      UserModel.findOne.mockResolvedValue(null)

      await expect(VoicePreferenceService.setVoice(9, 'ballad')).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND
      })
    })

    it('wraps database errors as a generic 500', async () => {
      UserModel.findOne.mockResolvedValue({
        update: jest.fn().mockRejectedValue(new Error('db down'))
      })

      await expect(VoicePreferenceService.setVoice(1, 'ballad')).rejects.toMatchObject({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to save voice preference'
      })
    })
  })
})
