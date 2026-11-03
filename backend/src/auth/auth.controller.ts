import {
  Controller,
  Post,
  Patch,
  Body,
  Res,
  Req,
  HttpStatus,
  HttpCode,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { ApiOperation, ApiResponse, ApiTags, ApiCookieAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service.js'
import { AuthCredentialsDto } from './dto/auth-credentials.dto.js'
import { AuthGuard } from './guards/auth.guard.js'
import { UserRole } from '../schemas/user.schema.js'

@ApiTags('Identity & Authentication Infrastructure')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new dashboard account with FIFO rotation guard enforcement' })
  @ApiResponse({ status: 201, description: 'User account provisioned successfully.' })
  @ApiResponse({ status: 400, description: 'Malformed credentials payload provided.' })
  @ApiResponse({ status: 409, description: 'Conflict: Target username already allocated.' })
  async register(@Body() authCredentialsDto: AuthCredentialsDto) {
    this.logger.log(`Auth Subsystem: Initializing registration request for "${authCredentialsDto.username}".`)
    const user = await this.authService.register(authCredentialsDto)
    return {
      status: 'SUCCESS',
      username: user.username,
      role: user.role,
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials and establish a secure session context' })
  @ApiResponse({ status: 200, description: 'Authentication successful, secure HttpOnly cookie set.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Invalid username or password signature.' })
  async login(
    @Body() authCredentialsDto: AuthCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Auth Subsystem: Processing login verification sequence for "${authCredentialsDto.username}".`)
    const result = await this.authService.login(authCredentialsDto)

    // Securely pack and inject the zero-dependency JWT into an architectural HttpOnly cookie boundary
    res.cookie('al_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Enforce secure HTTPS transit only in cloud cluster matrices
      sameSite: 'lax', // Mitigation vector against Cross-Site Request Forgery (CSRF) vectors
      maxAge: 1000 * 60 * 60 * 24, // Matches the manual JWT payload token 24h expiration limit
      path: '/', // Globally active across all telemetry routing interfaces
    })

    return {
      status: 'AUTHENTICATED',
      username: result.username,
      role: result.role,
    }
  }

  @Patch('role')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({ summary: 'Administrative mutation endpoint to update target user roles mapping' })
  @ApiResponse({ status: 200, description: 'User role updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Target user missing or last admin safeguard triggered.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient administrative clearances.' })
  async changeRole(
    @Req() req: Request,
    @Body('username') targetUsername: string,
    @Body('role') newRole: UserRole,
  ) {
    const operatorUser = req.user
    
    // Strict RBAC Gatekeeper Enforcement at the controller endpoint boundary
    if (!operatorUser || operatorUser.role !== UserRole.ADMIN) {
      this.logger.error(`Security Alert: Non-admin user "${operatorUser?.username}" attempted role mutation layout.`)
      throw new ForbiddenException('Access denied: Operations restricted strictly to ADMINISTRATOR profiles')
    }

    this.logger.log(`RBAC Management: Admin "${operatorUser.username}" updating "${targetUsername}" to role status ${newRole}.`)
    return this.authService.updateUserRole(targetUsername, newRole)
  }
}
