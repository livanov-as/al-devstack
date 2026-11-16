import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Query,
  Headers,
  Body,
  Res,
  Req,
  ForbiddenException, 
  HttpStatus,
  HttpCode,
  UseGuards,
  Logger,
} from '@nestjs/common'
import { Response, Request } from 'express'
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger'
import { UserRole } from './schemas/user.schema.js'
import { InjectConnection } from '@nestjs/mongoose'
import type { Connection } from 'mongoose' // Explicitly enforce type-only import to resolve ESM runtime crashes
import { AppService } from './app.service.js'
import { AuthGuard } from './auth/guards/auth.guard.js'

@ApiTags('Telemetry & Credentials Infrastructure')
@Controller()
export class AppController {
  // Encapsulated HTTP request routing diagnostics logger
  private readonly logger = new Logger(AppController.name)

  constructor(
    private readonly appService: AppService,
    @InjectConnection() private connection: Connection, // Inject direct Atlas connection state
  ) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check endpoint for cloud infrastructure monitoring',
  })
  async getHealth() {
    // Check if the MongoDB connection state is active (1 means connected)
    const isConnected = this.connection.readyState === 1
    if (!isConnected) {
      this.logger.error(
        'Infrastructure Alert: MongoDB Atlas cluster connection is DEGRADED.',
      )
    }
    return {
      status: 'OK',
      database: isConnected ? 'CONNECTED' : 'DEGRADED',
      timestamp: new Date(),
    }
  }

  @Get('progress/calendar')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Retrieve 31-day activity synchronization matrix for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated temporal task completion counters dictionary map',
  })
  async getCalendar(@Req() req: Request, @Query('timezone') timezone?: string) {
    let clientTimezone = timezone || 'UTC'
    const timezoneRegex = /^[A-Za-z0-9_\-/]+$/

    if (!timezoneRegex.test(clientTimezone)) {
      this.logger.warn(
        `Malicious or malformed timezone payload blocked: ${clientTimezone}. Fallback to UTC enforced.`,
      )
      clientTimezone = 'UTC'
    }

    // Extract target username and role from the securely isolated request context mapping
    const username = req.user!.username
    const role = req.user!.role
    return this.appService.getCalendarStats(username, clientTimezone, role)
  }

  @Get('progress/timeline')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Fetch live tracking task stream feed for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Array containing historical curriculum completions items sorted chronologically desc',
  })
  async getTimeline(@Req() req: Request) {
    const username = req.user!.username
    const role = req.user!.role
    return this.appService.getTimelineTasks(username, role)
  }

  @Get('certificates')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'List all verified earned credentials collections archived in Atlas for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Active and legacy certificates array list matching layout indices',
  })
  async getCertificates(@Req() req: Request) {
    const username = req.user!.username
    const role = req.user!.role
    return this.appService.getCertificates(username, role)
  }

  @Get('progress/geo-stats')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Compile regional GIS progress analytics facets mapping for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Geographic breakdown schema mapping states matched to freeCodeCamp credentials set rules',
  })
  async getGeoStats(@Req() req: Request, @Res() res: Response) {
    const username = req.user!.username
    const role = req.user!.role
    // Pass username and active role to service layer to isolate GIS statistics calculations per profile
    const { data, cacheHit } = await this.appService.getGeoStats(username, role)
    res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS')
    return res.status(HttpStatus.OK).json(data)
  }

  @Delete('progress/reset')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({
    summary: 'Reset user progress tasks globally or for a specific geographical region while preserving certificates',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress records cleared and isolated GIS cache invalidated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Write operations are locked under DEMO mode parameters',
  })
  async resetProgress(
    @Req() req: Request,
    @Query('regionId') queryRegionId?: string,
    @Body('regionId') bodyRegionId?: string,
  ) {
    const username = req.user!.username
    const targetRegion = queryRegionId ?? bodyRegionId
    return this.appService.resetUserProgress(username, targetRegion)
  }

  @Patch('progress/strict-mode')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({
    summary: 'Toggle strict lesson-based percentage calculation mode on the GIS map',
  })
  @ApiResponse({
    status: 200,
    description: 'Strict lesson progress flag updated and isolated GIS cache invalidated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Write operations are locked under DEMO mode parameters',
  })
  async updateStrictMode(
    @Req() req: Request,
    @Body('strictLessonProgress') strictLessonProgress: boolean,
  ) {
    const username = req.user!.username
    return this.appService.updateStrictLessonProgress(username, strictLessonProgress)
  }

  @Post('progress/cache-flush')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Invalidate in-memory regional GIS analytics stats cache',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache successfully dropped from memory allocation layers',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Security token authorization validation signatures mismatched',
  })
  async flushCache(
    @Headers('authorization') authHeader: string,
    @Body('token') tokenFromBody: string,
    @Body('username') targetUsername?: string,
  ) {
    const tokenFromHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null
    return this.appService.flushCache(tokenFromHeader, tokenFromBody, targetUsername)
  }

  @Post('admin/cache-flush')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({
    summary: 'Invalidate in-memory regional GIS analytics stats cache via authenticated ADMIN session',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache successfully dropped from memory allocation layers',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Operations restricted strictly to ADMINISTRATOR profiles',
  })
  async flushCacheByAdmin(@Req() req: Request) {
    const operatorUser = req.user
    if (!operatorUser || operatorUser.role !== UserRole.ADMIN) {
      this.logger.error(
        `Security Alert: Non-admin user "${operatorUser?.username}" attempted admin cache flush.`,
      )
      throw new ForbiddenException(
        'Access denied: Operations restricted strictly to ADMINISTRATOR profiles',
      )
    }

    return this.appService.flushCacheByAdmin(operatorUser.username)
  }
}
