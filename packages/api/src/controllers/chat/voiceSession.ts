import { type Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { type IAuthenticatedRequest } from '../../interfaces/shared/request.interface'
import { handleError } from '../../utilities/requestHandler'
import { ResponseData } from '../../utilities/response'
import { VoiceSessionService } from '../../services/chat'

export const createVoiceSession = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const session = await VoiceSessionService.createClientSecret(req.jwtPayload?.userId)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(StatusCodes.OK).json(
      ResponseData.success({
        data: session,
        message: 'Voice session created successfully'
      })
    )
  } catch (serverError) {
    return handleError(res, serverError)
  }
}
