import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import PQueue from 'p-queue'
import { UserRole } from '../schemas/user.schema.js'
import { DemoTelemetryService } from '../demo/demo-telemetry.service.js'

export interface TaskEnrichmentResult {
  tags: string[]
  difficulty: number
}

export interface InterviewTurn {
  question: string
  answer: string
  score: number
}

export interface InterviewResponse {
  mode: 'DEMO_PRESET' | 'LIVE_AI'
  presetTurn?: number
  question?: string
  feedback?: string
  score?: number
  isCompleted: boolean
  remainingLiveQuota?: number
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly queue = new PQueue({ concurrency: 1 })

  private readonly dailyUserSessions = new Map<string, { dateKey: string; count: number }>()
  private readonly demoLiveCalls = new Map<string, number>()

  private readonly DEMO_MAX_LIVE_CALLS = 2
  private readonly DEMO_GLOBAL_DAILY_CAP = 16
  private readonly USER_MAX_DAILY_SESSIONS = 5
  private readonly ADMIN_MAX_DAILY_SESSIONS = 50

  constructor(private readonly demoTelemetryService: DemoTelemetryService) {}

  private async callLlm(
    systemPrompt: string,
    userPrompt: string,
    temperature = 0.3,
  ): Promise<string> {
    return this.queue.add(async () => {
      const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase()
      const baseUrl = (process.env.AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '')
      const apiKey = process.env.AI_API_KEY || 'ollama'
      const primaryModel = process.env.AI_MODEL || 'qwen2.5-coder:1.5b'
      const fallbackModel = process.env.AI_FALLBACK_MODEL || primaryModel

      if (provider === 'cloud' && (!apiKey || apiKey === 'ollama')) {
        throw new HttpException(
          'AI Gateway Error: AI_API_KEY is missing for cloud provider',
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      }

      const candidateModels = [
        primaryModel,
        fallbackModel,
        ...(provider === 'cloud' ? ['openrouter/free'] : []),
      ].filter(Boolean)
      const models = Array.from(new Set(candidateModels))

      /* eslint-disable no-await-in-loop */
      for (const model of models) {
        const body: Record<string, any> = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
        }

        if (provider === 'ollama') {
          body.keep_alive = 0
          body.options = { num_ctx: 2048 }
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 45000)

        try {
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          })

          if (!response.ok) {
            const errText = await response.text().catch(() => '')
            this.logger.warn(
              `AI Gateway HTTP ${response.status} on "${model}": ${errText.slice(0, 160)}`,
            )
            continue
          }

          const json = (await response.json()) as any
          const content = json?.choices?.[0]?.message?.content?.trim()
          if (content) return content
        } catch (err) {
          this.logger.warn(`AI Gateway failed on "${model}": ${(err as Error).message}`)
        } finally {
          clearTimeout(timeoutId)
        }
      }
      /* eslint-enable no-await-in-loop */
      
      throw new HttpException(
        'AI Gateway unavailable: All configured LLM endpoints failed to respond',
        HttpStatus.BAD_GATEWAY,
      )
    }) as Promise<string>
  }

  private extractJsonObject<T>(rawText: string): T | null {
    try {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      return JSON.parse(cleaned) as T
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (!match) return null
      try {
        return JSON.parse(match[0]) as T
      } catch {
        return null
      }
    }
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0]
  }

  private checkAndIncrementSessionQuota(username: string, role: UserRole): void {
    const todayKey = this.getTodayKey()
    const limit =
      role === UserRole.ADMIN ? this.ADMIN_MAX_DAILY_SESSIONS : this.USER_MAX_DAILY_SESSIONS

    const record = this.dailyUserSessions.get(username)
    if (!record || record.dateKey !== todayKey) {
      this.dailyUserSessions.set(username, { dateKey: todayKey, count: 1 })
      return
    }

    if (record.count >= limit) {
      throw new HttpException(
        `FinOps Quota Exceeded: Daily limit of ${limit} AI interview sessions reached.`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    record.count += 1
  }

  private buildDemoQuotaKey(username: string, clientIp?: string): string {
    const normalizedIp = (clientIp || 'unknown-ip').trim()
    return `${this.getTodayKey()}:${username}:${normalizedIp}`
  }

  getRemainingDemoQuota(username: string, clientIp?: string): number {
    const globalUsed = this.demoLiveCalls.get(`${this.getTodayKey()}:global-demo`) || 0
    if (globalUsed >= this.DEMO_GLOBAL_DAILY_CAP) return 0

    const perGuestUsed = this.demoLiveCalls.get(this.buildDemoQuotaKey(username, clientIp)) || 0
    return Math.max(0, this.DEMO_MAX_LIVE_CALLS - perGuestUsed)
  }

  private consumeDemoLiveCall(username: string, clientIp?: string): number {
    const globalKey = `${this.getTodayKey()}:global-demo`
    const globalUsed = this.demoLiveCalls.get(globalKey) || 0

    if (globalUsed >= this.DEMO_GLOBAL_DAILY_CAP) {
      throw new HttpException(
        'Sandbox FinOps Guard: Global daily demo AI quota reached. Preset scenarios remain unlimited.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const guestKey = this.buildDemoQuotaKey(username, clientIp)
    const guestUsed = this.demoLiveCalls.get(guestKey) || 0
    if (guestUsed >= this.DEMO_MAX_LIVE_CALLS) {
      throw new HttpException(
        'Sandbox FinOps Limit: Maximum 2 live AI questions per guest reached.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    this.demoLiveCalls.set(globalKey, globalUsed + 1)
    this.demoLiveCalls.set(guestKey, guestUsed + 1)
    return Math.max(0, this.DEMO_MAX_LIVE_CALLS - (guestUsed + 1))
  }

  async enrichTaskMetadata(taskName: string, category: string): Promise<TaskEnrichmentResult> {
    const systemPrompt =
      'You are a technical curriculum analyzer. Given a freeCodeCamp task title and category slug, ' +
      'return ONLY valid JSON with keys: "tags" (array of 2 to 4 concise technical skill tags in English, e.g. ["JavaScript", "DOM", "Async/Await"]) ' +
      'and "difficulty" (integer from 1 to 10). Do not include markdown or commentary.'

    try {
      const raw = await this.callLlm(systemPrompt, JSON.stringify({ task_name: taskName, category }), 0.1)
      const parsed = this.extractJsonObject<{ tags?: unknown; difficulty?: unknown }>(raw)

      const safeTags = Array.isArray(parsed?.tags)
        ? parsed!.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 4)
        : []

      const rawDiff = Number(parsed?.difficulty)
      const safeDifficulty =
        Number.isFinite(rawDiff) && rawDiff >= 1 && rawDiff <= 10 ? Math.round(rawDiff) : 3

      return { tags: safeTags.length > 0 ? safeTags : [category], difficulty: safeDifficulty }
    } catch (err) {
      this.logger.warn(`Task enrichment fallback for "${taskName}": ${(err as Error).message}`)
      return { tags: [category], difficulty: 3 }
    }
  }

  async startInterview(
    username: string,
    role: UserRole,
    lang: 'en' | 'ru',
    recentTasks: Array<{ task_name: string; category: string; tags?: string[] }>,
    useLiveAiInDemo = false,
    clientIp?: string,
  ): Promise<InterviewResponse> {
    if (role === UserRole.DEMO_USER && !useLiveAiInDemo) {
      const preset = this.demoTelemetryService.getDemoInterviewPreset('start')
      return {
        mode: 'DEMO_PRESET',
        ...preset,
        remainingLiveQuota: this.getRemainingDemoQuota(username, clientIp),
      }
    }

    const remainingLiveQuota =
      role === UserRole.DEMO_USER
        ? this.consumeDemoLiveCall(username, clientIp)
        : (this.checkAndIncrementSessionQuota(username, role), undefined)

    const topicSummary =
      recentTasks.length > 0
        ? recentTasks
            .slice(0, 12)
            .map((t) => `${t.task_name} [${(t.tags?.length ? t.tags : [t.category]).join(', ')}]`)
            .join('; ')
        : 'JavaScript ES6+, DOM Manipulation, Responsive Web Design, REST APIs'

    const targetLanguage = lang === 'ru' ? 'Russian' : 'English'
    const systemPrompt =
      `You are a senior full-stack technical interviewer conducting a concise mock interview in ${targetLanguage}. ` +
      'Based on the candidate’s recent completed curriculum topics, ask ONE sharp, practical technical question (2-3 sentences max). ' +
      `Respond strictly in ${targetLanguage} as plain text without markdown wrappers.`

    const question = await this.callLlm(systemPrompt, `Recent completed topics: ${topicSummary}`, 0.4)
    return { mode: 'LIVE_AI', question, isCompleted: false, remainingLiveQuota }
  }

  async answerInterview(
    username: string,
    role: UserRole,
    lang: 'en' | 'ru',
    question: string,
    userAnswer: string,
    history: InterviewTurn[],
    useLiveAiInDemo = false,
    clientIp?: string,
  ): Promise<InterviewResponse> {
    const turnNumber = history.length + 1
    const maxTurns = role === UserRole.DEMO_USER ? 2 : 3

    if (role === UserRole.DEMO_USER && !useLiveAiInDemo) {
      const preset = this.demoTelemetryService.getDemoInterviewPreset(
        'answer',
        turnNumber,
        userAnswer,
      )
      return {
        mode: 'DEMO_PRESET',
        ...preset,
        remainingLiveQuota: this.getRemainingDemoQuota(username, clientIp),
      }
    }

    const remainingLiveQuota =
      role === UserRole.DEMO_USER ? this.consumeDemoLiveCall(username, clientIp) : undefined

    const isCompleted = turnNumber >= maxTurns
    const targetLanguage = lang === 'ru' ? 'Russian' : 'English'
    const systemPrompt =
      `You are a senior full-stack technical interviewer evaluating a candidate's answer in ${targetLanguage}. ` +
      'Return ONLY valid JSON with keys: "score" (integer 1-10), ' +
      `"feedback" (2-3 constructive sentences in ${targetLanguage} evaluating technical accuracy), ` +
      (isCompleted
        ? '"next_question" (null, as the interview session is now complete).'
        : `"next_question" (one concise follow-up technical question in ${targetLanguage} building on their answer).`)

    const raw = await this.callLlm(
      systemPrompt,
      JSON.stringify({ question, candidate_answer: userAnswer, turn: `${turnNumber}/${maxTurns}` }),
      0.3,
    )
    const parsed = this.extractJsonObject<{ score?: unknown; feedback?: unknown; next_question?: unknown }>(raw)

    const rawScore = Number(parsed?.score)
    const score = Number.isFinite(rawScore) && rawScore >= 1 && rawScore <= 10 ? Math.round(rawScore) : 7
    const feedback =
      typeof parsed?.feedback === 'string' && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : lang === 'ru'
          ? 'Ответ принят. Хорошее понимание базовых концепций.'
          : 'Answer recorded. Solid grasp of the core concepts.'
    const nextQuestion =
      !isCompleted && typeof parsed?.next_question === 'string' && parsed.next_question.trim()
        ? parsed.next_question.trim()
        : undefined

    return {
      mode: 'LIVE_AI',
      score,
      feedback,
      question: nextQuestion,
      isCompleted: isCompleted || !nextQuestion,
      remainingLiveQuota,
    }
  }
}
