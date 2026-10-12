import { type Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { type IAuthenticatedRequest } from '../../interfaces/shared/request.interface'
import { type IPreviewVoiceSchema } from '../../schemas/VoiceSchema'
import { VoicePreviewService } from '../../services/chat'
import { handleError } from '../../utilities/requestHandler'

export const previewVoice = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { voice } = req.query as unknown as IPreviewVoiceSchema
    const audio = await VoicePreviewService.synthesize(voice)

    res.locals.skipCompression = true
    res.status(StatusCodes.OK)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', String(audio.length))
    res.setHeader('Content-Encoding', 'identity')
    res.setHeader('Cache-Control', 'private, max-age=86400')

    return res.send(audio)
  } catch (serverError) {
    return handleError(res, serverError)
  }
}
