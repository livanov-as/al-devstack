import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { Request } from 'express'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { AuthGuard } from '../auth/guards/auth.guard.js'
import { AiService, InterviewTurn } from './ai.service.js'
import { Progress, ProgressDocument } from '../schemas/progress.schema.js'
import { UserRole } from '../schemas/user.schema.js'
import { DemoTelemetryService } from '../demo/demo-telemetry.service.js'

@ApiTags('AI Tech Interviewer & Enrichment')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly demoTelemetryService: DemoTelemetryService,
    @InjectModel(Progress.name)
    private readonly progressModel: Model<ProgressDocument>,
  ) {}

  private extractClientIp(req: Request): string {
    const proxyHeaders = [
      req.headers['x-vercel-forwarded-for'],
      req.headers['x-real-ip'],
      req.headers['x-forwarded-for'],
    ]

    for (const header of proxyHeaders) {
      if (typeof header === 'string' && header.trim()) {
        return header.split(',')[0].trim()
      }
    }

    return req.ip || 'unknown-ip'
  }

  @Get('interview/quota')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({ summary: 'Retrieve remaining daily live AI interview quota for DEMO_USER' })
  getInterviewQuota(@Req() req: Request) {
    const username = req.user!.username
    const role = req.user!.role

    if (role !== UserRole.DEMO_USER) {
      return { remainingLiveQuota: null, maxLiveQuota: null }
    }

    const clientIp = this.extractClientIp(req)
    return {
      remainingLiveQuota: this.aiService.getRemainingDemoQuota(username, clientIp),
      maxLiveQuota: 2,
    }
  }

  @Post('interview/start')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({ summary: 'Start a bilingual (EN/RU) AI technical interview based on 31-day progress' })
  async startInterview(
    @Req() req: Request,
    @Body('lang') rawLang?: string,
    @Body('useLiveAi') useLiveAi?: boolean,
  ) {
    const username = req.user!.username
    const role = req.user!.role
    const lang: 'en' | 'ru' = rawLang === 'ru' ? 'ru' : 'en'
    const clientIp = this.extractClientIp(req)

    let recentTasks: Array<{ task_name: string; category: string; tags?: string[] }>

    if (role === UserRole.DEMO_USER) {
      recentTasks = this.demoTelemetryService.getTimelineTasks().tasks.map((t) => ({
        task_name: t.task_name,
        category: t.category,
        tags: ['JavaScript', 'Arrays', 'Closures', 'State Management'],
      }))
    } else {
      const thirtyOneDaysAgo = new Date()
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31)

      recentTasks = await this.progressModel
        .find({ username, date: { $gte: thirtyOneDaysAgo } })
        .sort({ date: -1 })
        .limit(15)
        .select('task_name category tags')
        .lean()
    }

    return this.aiService.startInterview(
      username,
      role,
      lang,
      recentTasks,
      Boolean(useLiveAi),
      clientIp,
    )
  }

  @Post('interview/answer')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('al_session')
  @ApiOperation({ summary: 'Submit candidate answer for AI evaluation and next follow-up question' })
  async answerInterview(
    @Req() req: Request,
    @Body('lang') rawLang?: string,
    @Body('question') question?: string,
    @Body('answer') answer?: string,
    @Body('history') history?: InterviewTurn[],
    @Body('useLiveAi') useLiveAi?: boolean,
  ) {
    if (!question || !question.trim() || !answer || !answer.trim()) {
      throw new BadRequestException('Both "question" and "answer" fields are required.')
    }

    const username = req.user!.username
    const role = req.user!.role
    const lang: 'en' | 'ru' = rawLang === 'ru' ? 'ru' : 'en'
    const safeHistory = Array.isArray(history) ? history.slice(0, 10) : []
    const clientIp = this.extractClientIp(req)

    return this.aiService.answerInterview(
      username,
      role,
      lang,
      question.trim(),
      answer.trim(),
      safeHistory,
      Boolean(useLiveAi),
      clientIp,
    )
  }
}
