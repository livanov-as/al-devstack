import { describe, it, expect, beforeEach } from 'vitest'
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { AuthGuard } from './auth.guard.js'
import { CryptoService } from '../crypto.service.js'
import { UserRole } from '../../schemas/user.schema.js'

function createMockContext(requestObj: Record<string, any>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => requestObj,
    }),
  } as unknown as ExecutionContext
}

describe('AuthGuard', () => {
  let cryptoService: CryptoService
  let authGuard: AuthGuard

  beforeEach(() => {
    process.env.CACHE_SECRET_TOKEN = 'test_guard_secret_key'
    cryptoService = new CryptoService()
    authGuard = new AuthGuard(cryptoService as any)
  })

  it('throws UnauthorizedException when session cookie is missing', async () => {
    const req = { cookies: {}, method: 'GET', url: '/api/progress/geo-stats' }
    const ctx = createMockContext(req)

    await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('throws UnauthorizedException when JWT signature is invalid', async () => {
    const req = {
      cookies: { al_session: 'invalid.jwt.signature' },
      method: 'GET',
      url: '/api/progress/geo-stats',
    }
    const ctx = createMockContext(req)

    await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('blocks mutation requests for DEMO_USER with ForbiddenException', async () => {
    const demoToken = cryptoService.generateJwt({
      username: 'recruiter-tech-lead',
      role: UserRole.DEMO_USER,
    })

    const deleteReq = {
      cookies: { al_session: demoToken },
      method: 'DELETE',
      url: '/api/progress/reset?regionId=all',
    }
    await expect(authGuard.canActivate(createMockContext(deleteReq))).rejects.toThrow(
      ForbiddenException,
    )

    const patchReq = {
      cookies: { al_session: demoToken },
      method: 'PATCH',
      url: '/api/auth/role',
    }
    await expect(authGuard.canActivate(createMockContext(patchReq))).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('allows read-only GET requests for DEMO_USER and attaches user context', async () => {
    const demoToken = cryptoService.generateJwt({
      username: 'recruiter-tech-lead',
      role: UserRole.DEMO_USER,
    })

    const req: Record<string, any> = {
      cookies: { al_session: demoToken },
      method: 'GET',
      url: '/api/admin/users',
    }

    const result = await authGuard.canActivate(createMockContext(req))
    expect(result).toBe(true)
    expect(req.user).toEqual({
      username: 'recruiter-tech-lead',
      role: UserRole.DEMO_USER,
    })
  })

  it('allows mutation requests for USER and ADMIN roles', async () => {
    const adminToken = cryptoService.generateJwt({
      username: 'livanov-as',
      role: UserRole.ADMIN,
    })

    const req: Record<string, any> = {
      cookies: { al_session: adminToken },
      method: 'DELETE',
      url: '/api/progress/reset?regionId=europe',
    }

    const result = await authGuard.canActivate(createMockContext(req))
    expect(result).toBe(true)
    expect(req.user).toEqual({
      username: 'livanov-as',
      role: UserRole.ADMIN,
    })
  })
})
