import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
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
@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
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

  @Post('auth/login')
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-domain WebSocket handshake between Vercel and Railway
      maxAge: 1000 * 60 * 60 * 24, // Matches the manual JWT payload token 24h expiration limit
      path: '/', // Globally active across all telemetry routing interfaces
    })

    return {
      status: 'AUTHENTICATED',
      username: result.username,
      role: result.role,
    }
  }

  @Patch('auth/role')
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

  @Get('admin/users')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({ summary: 'Retrieve cluster users and FinOps capacity metrics (live for ADMIN, sandbox RAM mock for DEMO_USER)' })
  @ApiResponse({ status: 200, description: 'Cluster telemetry and user list returned.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Standard USER profiles cannot access administrative telemetry.' })
  async getAdminUsers(@Req() req: Request) {
    const operatorUser = req.user

    if (!operatorUser || (operatorUser.role !== UserRole.ADMIN && operatorUser.role !== UserRole.DEMO_USER)) {
      this.logger.warn(`Security Alert: Unauthorized admin telemetry access attempt by "${operatorUser?.username}".`)
      throw new ForbiddenException('Access denied: Administrative telemetry restricted to ADMIN and DEMO preview profiles')
    }

    return this.authService.getAdminUsersTelemetry(operatorUser.role)
  }

  @Delete('admin/users/:username')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({ summary: 'Forcefully remove a target user and all associated telemetry data in a transaction' })
  @ApiResponse({ status: 200, description: 'User and associated records deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Self-deletion or last admin safeguard triggered.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient administrative clearances.' })
  async deleteUser(
    @Req() req: Request,
    @Param('username') targetUsername: string,
  ) {
    const operatorUser = req.user

    if (!operatorUser || operatorUser.role !== UserRole.ADMIN) {
      this.logger.error(`Security Alert: Non-admin user "${operatorUser?.username}" attempted cascade user deletion.`)
      throw new ForbiddenException('Access denied: Operations restricted strictly to ADMINISTRATOR profiles')
    }

    return this.authService.deleteUserByAdmin(operatorUser.username, targetUsername)
  }

  @Post('admin/users/:username/sync')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({ summary: 'Manually trigger an out-of-schedule GitHub Actions parser workflow dispatch for a user' })
  @ApiResponse({ status: 200, description: 'Background parser workflow dispatch triggered.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Target user missing or sandbox profile specified.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient administrative clearances.' })
  async triggerUserSync(
    @Req() req: Request,
    @Param('username') targetUsername: string,
  ) {
    const operatorUser = req.user

    if (!operatorUser || operatorUser.role !== UserRole.ADMIN) {
      this.logger.error(`Security Alert: Non-admin user "${operatorUser?.username}" attempted manual parser dispatch.`)
      throw new ForbiddenException('Access denied: Operations restricted strictly to ADMINISTRATOR profiles')
    }

    return this.authService.triggerManualUserSync(operatorUser.username, targetUsername)
  }
}
