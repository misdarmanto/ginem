import { type Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ResponseData } from '../../utilities/response'

import { type IAuthenticatedRequest } from '../../interfaces/shared/request.interface'
import { DeviceLiveStatusService, DeviceService } from '../../services/device'
import { handleError } from '../../utilities/requestHandler'
import { type IFindAllDevice } from '../../schemas/DeviceSchema'

export const findAllDevice = async (
  req: IAuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const payload = req.query as unknown as IFindAllDevice
    const result = await DeviceService.findAll(payload)
    const data = {
      ...result,
      items: result.items.map((device) => DeviceLiveStatusService.attach(device))
    }

    return res.status(StatusCodes.OK).json(ResponseData.success({ data }))
  } catch (serverError) {
    return handleError(res, serverError)
  }
}
