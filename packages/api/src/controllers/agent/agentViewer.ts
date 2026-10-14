import { type IAuthenticatedRequest } from '../../interfaces/shared/request.interface'
import { type AgentViewer } from '../../services/agent'

/** Who is asking: admins see every command, other users only their own. */
export function viewerOf(req: IAuthenticatedRequest): AgentViewer {
  return {
    userId: req.jwtPayload?.userId as number,
    role: req.jwtPayload?.userRole ?? 'user'
  }
}
