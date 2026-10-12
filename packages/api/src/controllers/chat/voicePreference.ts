import { type Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { type IAuthenticatedRequest } from '../../interfaces/shared/request.interface'
import { type ISelectVoiceSchema } from '../../schemas/VoiceSchema'
import { VoicePreferenceService } from '../../services/chat'
import { handleError } from '../../utilities/requestHandler'
import { ResponseData } from '../../utilities/response'

export const getVoicePreference = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const data = await VoicePreferenceService.getPreference(req.jwtPayload?.userId as number)
    return res.status(StatusCodes.OK).json(ResponseData.success({ data }))
  } catch (serverError) {
    return handleError(res, serverError)
  }
}

export const selectVoice = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { voice } = req.body as ISelectVoiceSchema
    const data = await VoicePreferenceService.setVoice(
      req.jwtPayload?.userId as number,
      voice
    )
    return res
      .status(StatusCodes.OK)
      .json(ResponseData.success({ data, message: 'Voice updated successfully' }))
  } catch (serverError) {
    return handleError(res, serverError)
  }
}
