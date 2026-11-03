import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from '../auth.service.js'
import { UserRole } from '../../schemas/user.schema.js'

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    
    // 1. Extract the secure token from the HttpOnly session cookie boundary
    const token = request.cookies?.['al_session']
    if (!token) {
      this.logger.warn(`Security Access Denied: Mismatched session cookie context.`)
      throw new UnauthorizedException('Authentication session required')
    }

    // 2. Cryptographically verify the zero-dependency manual JWT signature
    const payload = this.authService.verifyJwt(token)
    if (!payload || !payload.username) {
      this.logger.warn(`Security Access Denied: Cryptographic token verification failed.`)
      throw new UnauthorizedException('Invalid or expired authentication session')
    }

    // 3. Inject the resolved user context directly into the request pipeline (Isolation Core)
    request.user = {
      username: payload.username,
      role: payload.role as UserRole,
    }

    // 4. Demo Guard Enforcement: Rigidly block mutation commands for test preview accounts
    const targetHttpMethod = request.method
    const isMutationAction = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(targetHttpMethod)
    
    if (payload.role === UserRole.DEMO_USER && isMutationAction) {
      const targetPath = request.url
      if (!targetPath.includes('progress/cache-flush')) {
        this.logger.error(`FinOps Security Triggered: DEMO_USER locked out from executing "${targetHttpMethod}" mutation layout.`)
        throw new ForbiddenException('Action denied: Write operations are locked under DEMO mode parameters')
      }
    }

    return true
  }
}
