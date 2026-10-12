import { StatusCodes } from 'http-status-codes'

import { appConfigs } from '../../configs/appConfig'
import { UserModel } from '../../models/UserModel'
import { type VoiceId } from '../../schemas/VoiceSchema'
import { AppError } from '../../utilities/AppError'
import logger from '../../utilities/logger'
import { VOICE_OPTIONS, isVoiceId, type VoiceOption } from './voiceCatalog'

export interface VoicePreference {
  voice: VoiceId
  options: readonly VoiceOption[]
}

function defaultVoice(): VoiceId {
  const configured = appConfigs.realtime.voice
  return isVoiceId(configured) ? configured : 'marin'
}

export class VoicePreferenceService {
  /** Voice for the user, falling back to the configured default when unset or no longer offered. */
  static async getVoice(userId: number): Promise<VoiceId> {
    const user = await UserModel.findOne({
      where: { deleted: 0, userId },
      attributes: ['userId', 'userVoice']
    })
    return isVoiceId(user?.userVoice) ? user.userVoice : defaultVoice()
  }

  static async getPreference(userId: number): Promise<VoicePreference> {
    try {
      return { voice: await this.getVoice(userId), options: VOICE_OPTIONS }
    } catch (serviceError) {
      logger.error(`[VoicePreferenceService] getPreference failed: ${String(serviceError)}`)
      throw new AppError('Failed to get voice preference', StatusCodes.INTERNAL_SERVER_ERROR)
    }
  }

  static async setVoice(userId: number, voice: VoiceId): Promise<VoicePreference> {
    try {
      const user = await UserModel.findOne({ where: { deleted: 0, userId } })
      if (user == null) throw AppError.notFound('User not found')

      await user.update({ userVoice: voice })
      return { voice, options: VOICE_OPTIONS }
    } catch (serviceError) {
      if (serviceError instanceof AppError) throw serviceError
      logger.error(`[VoicePreferenceService] setVoice failed: ${String(serviceError)}`)
      throw new AppError('Failed to save voice preference', StatusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}
