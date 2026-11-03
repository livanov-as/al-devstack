import { UserRole } from '../schemas/user.schema.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string
        role: UserRole
      }
    }
  }
}
