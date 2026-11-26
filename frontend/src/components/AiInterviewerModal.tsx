import { useState, useEffect, useRef } from 'react'
import {
  X,
  Bot,
  Sparkles,
  Send,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Info,
} from 'lucide-react'
import { useAuth, UserRole } from '../context/AuthContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useLanguage } from '../hooks/useLanguage'
import { API_BASE_URL } from '../config'

interface AiInterviewerModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CompletedTurn {
  mode: 'DEMO_PRESET' | 'LIVE_AI'
  presetTurn?: number
  question: string
  answer: string
  score: number
  feedback: string
  isShortDemoAnswer?: boolean
}

interface InterviewApiResponse {
  mode: 'DEMO_PRESET' | 'LIVE_AI'
  presetTurn?: number
  question?: string
  feedback?: string
  score?: number
  isCompleted: boolean
  remainingLiveQuota?: number
}

const DEMO_MAX_LIVE_CALLS = 2
const DEMO_QUOTA_STORAGE_KEY = 'al_ai_demo_quota'

function getTodayDateKey(): string {
  return new Date().toISOString().split('T')[0]
}

function readLocalDemoRemaining(): number {
  try {
    const raw = localStorage.getItem(DEMO_QUOTA_STORAGE_KEY)
    if (!raw) return DEMO_MAX_LIVE_CALLS
    const parsed = JSON.parse(raw) as { dateKey?: string; used?: number }
    if (parsed.dateKey !== getTodayDateKey()) {
      localStorage.removeItem(DEMO_QUOTA_STORAGE_KEY)
      return DEMO_MAX_LIVE_CALLS
    }
    const used = Number(parsed.used) || 0
    return Math.max(0, DEMO_MAX_LIVE_CALLS - used)
  } catch {
    return DEMO_MAX_LIVE_CALLS
  }
}

function writeLocalDemoRemaining(remaining: number): void {
  try {
    const safeRemaining = Math.max(
      0,
      Math.min(DEMO_MAX_LIVE_CALLS, Math.floor(remaining)),
    )
    const used = DEMO_MAX_LIVE_CALLS - safeRemaining
    localStorage.setItem(
      DEMO_QUOTA_STORAGE_KEY,
      JSON.stringify({ dateKey: getTodayDateKey(), used }),
    )
  } catch {
    // Ignore storage quota errors in restricted browser contexts
  }
}

export default function AiInterviewerModal({
  isOpen,
  onClose,
}: AiInterviewerModalProps) {
  const { user } = useAuth()
  const { t, lang } = useLanguage()

  const isDemo = user?.role === UserRole.DEMO_USER

  useEscapeKey(isOpen, onClose)

  const [useLiveAi, setUseLiveAi] = useState<boolean>(false)
  const [activeMode, setActiveMode] = useState<'DEMO_PRESET' | 'LIVE_AI'>(
    'DEMO_PRESET',
  )
  const [activePresetTurn, setActivePresetTurn] = useState<number | undefined>(
    undefined,
  )
  const [liveQuestionText, setLiveQuestionText] = useState<string>('')
  const [displayedQuestion, setDisplayedQuestion] = useState<string>('')
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [history, setHistory] = useState<CompletedTurn[]>([])
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [remainingQuota, setRemainingQuota] = useState<number>(() =>
    readLocalDemoRemaining(),
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const scrollBottomRef = useRef<HTMLDivElement>(null)

  // Resolve active question dynamically so DEMO_PRESET translates immediately on EN/RU toggle
  const resolvedActiveQuestion =
    activeMode === 'DEMO_PRESET' && activePresetTurn
      ? activePresetTurn === 1
        ? t.aiDemoQ1
        : t.aiDemoQ2
      : liveQuestionText

  // Smooth typewriter streaming effect for AI questions
  useEffect(() => {
    if (!resolvedActiveQuestion) {
      setDisplayedQuestion('')
      return
    }

    setDisplayedQuestion('')
    let index = 0
    const timer = window.setInterval(() => {
      index += 3
      setDisplayedQuestion(resolvedActiveQuestion.slice(0, index))
      if (index >= resolvedActiveQuestion.length) {
        window.clearInterval(timer)
      }
    }, 16)

    return () => window.clearInterval(timer)
  }, [resolvedActiveQuestion])

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, displayedQuestion, isCompleted])

  const resetSessionState = () => {
    setActivePresetTurn(undefined)
    setLiveQuestionText('')
    setDisplayedQuestion('')
    setUserAnswer('')
    setHistory([])
    setIsCompleted(false)
    setErrorMsg(null)
  }

  useEffect(() => {
    if (!isOpen) return

    resetSessionState()
    setUseLiveAi(false)

    if (!isDemo) return

    const localLeft = readLocalDemoRemaining()
    setRemainingQuota(localLeft)

    let cancelled = false
    fetch(`${API_BASE_URL}/ai/interview/quota`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || typeof data.remainingLiveQuota !== 'number') {
          return
        }
        const synced = Math.min(localLeft, data.remainingLiveQuota)
        setRemainingQuota(synced)
        writeLocalDemoRemaining(synced)
      })
      .catch(() => {
        // Keep localStorage fallback quota if network check fails
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, isDemo])

  if (!isOpen) return null

  const syncQuotaFromResponse = (
    serverRemaining?: number,
    consumed = false,
  ) => {
    if (!isDemo) return
    if (typeof serverRemaining === 'number') {
      const next = Math.min(readLocalDemoRemaining(), serverRemaining)
      setRemainingQuota(next)
      writeLocalDemoRemaining(next)
    } else if (consumed) {
      const next = Math.max(0, readLocalDemoRemaining() - 1)
      setRemainingQuota(next)
      writeLocalDemoRemaining(next)
    }
  }

  const handleStartSession = async (liveMode: boolean) => {
    if (isLoading) return
    if (isDemo && liveMode && remainingQuota <= 0) return

    setIsLoading(true)
    setErrorMsg(null)
    resetSessionState()
    setUseLiveAi(liveMode)

    try {
      const res = await fetch(`${API_BASE_URL}/ai/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lang,
          useLiveAi: liveMode,
        }),
      })

      if (!res.ok) {
        if (res.status === 429 && isDemo && liveMode) {
          setRemainingQuota(0)
          writeLocalDemoRemaining(0)
          return
        }
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to start AI interview')
      }

      const data: InterviewApiResponse = await res.json()
      syncQuotaFromResponse(data.remainingLiveQuota, liveMode)

      setActiveMode(data.mode)
      setActivePresetTurn(data.presetTurn)
      setLiveQuestionText(data.question || '')
      setIsCompleted(Boolean(data.isCompleted))
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Interviewer service unavailable.')
    } finally {
      setIsLoading(false)
    }
  }

  const submitCurrentAnswer = async () => {
    if (!resolvedActiveQuestion || !userAnswer.trim() || isLoading) return

    const currentQuestion = resolvedActiveQuestion
    const currentAnswer = userAnswer.trim()
    const currentTurnNumber = history.length + 1
    const isShortDemo =
      activeMode === 'DEMO_PRESET' && currentAnswer.length < 15

    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`${API_BASE_URL}/ai/interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lang,
          question: currentQuestion,
          answer: currentAnswer,
          history: history.map((h) => ({
            question: h.question,
            answer: h.answer,
            score: h.score,
          })),
          useLiveAi,
        }),
      })

      if (!res.ok) {
        if (res.status === 429 && isDemo && useLiveAi) {
          setRemainingQuota(0)
          writeLocalDemoRemaining(0)
          return
        }
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to evaluate answer')
      }

      const data: InterviewApiResponse = await res.json()
      syncQuotaFromResponse(data.remainingLiveQuota, useLiveAi)

      setHistory((prev) => [
        ...prev,
        {
          mode: data.mode,
          presetTurn: data.presetTurn ?? currentTurnNumber,
          question: currentQuestion,
          answer: currentAnswer,
          score: data.score ?? 7,
          feedback: data.feedback || '',
          isShortDemoAnswer: isShortDemo,
        },
      ])

      setUserAnswer('')
      setActiveMode(data.mode)
      setActivePresetTurn(
        data.mode === 'DEMO_PRESET' && !data.isCompleted
          ? currentTurnNumber + 1
          : undefined,
      )
      setLiveQuestionText(data.question || '')
      setIsCompleted(Boolean(data.isCompleted))
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit interview response.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitAnswer = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    await submitCurrentAnswer()
  }

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submitCurrentAnswer()
    }
  }

  const hasStarted =
    Boolean(resolvedActiveQuestion) || history.length > 0 || isCompleted
  const avgScore =
    history.length > 0
      ? (
          history.reduce((sum, item) => sum + item.score, 0) / history.length
        ).toFixed(1)
      : null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                  {t.aiModalTitle}
                </h3>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                  {lang.toUpperCase()}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {t.aiModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t.closeModalAria}
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sandbox Active Preset Banner */}
        {isDemo && hasStarted && !useLiveAi && (
          <div className="mt-3 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold tracking-wide text-amber-400">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 shrink-0" />
              <span>{t.aiDemoBanner}</span>
            </div>
            <span className="shrink-0 text-[11px] text-amber-300">
              {t.aiLiveQuotaLabel}: {remainingQuota}/{DEMO_MAX_LIVE_CALLS}
            </span>
          </div>
        )}

        {/* Friendly Daily Live Quota Exhausted Banner */}
        {isDemo && remainingQuota <= 0 && (
          <div className="mt-3 flex shrink-0 items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold tracking-wide text-amber-400 uppercase">
                {t.aiQuotaExhaustedTitle}
              </p>
              <p className="mt-1 leading-relaxed text-slate-300">
                {t.aiQuotaExhaustedBody}
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="scrollbar-thin mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {!hasStarted ? (
            isDemo ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Option 1: Unlimited RAM Demo Scenario */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleStartSession(false)}
                  className="group flex cursor-pointer flex-col justify-between rounded-xl border border-emerald-500/30 bg-slate-950/50 p-4 text-left transition-all hover:border-emerald-400 hover:bg-emerald-500/10 active:scale-[0.99] disabled:opacity-50"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        <Cpu className="h-4 w-4" />
                      </span>
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">
                        RAM · FREE
                      </span>
                    </div>
                    <h4 className="mt-3 text-sm font-bold text-slate-100 group-hover:text-emerald-300">
                      {t.aiPresetCardTitle}
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      {t.aiPresetCardDesc}
                    </p>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-400 uppercase">
                    <Bot className="h-3.5 w-3.5" />
                    <span>{t.aiStartBtn}</span>
                  </div>
                </button>

                {/* Option 2: Real OpenRouter LLM Session */}
                <button
                  type="button"
                  disabled={isLoading || remainingQuota <= 0}
                  onClick={() => handleStartSession(true)}
                  className="group flex cursor-pointer flex-col justify-between rounded-xl border border-sky-500/30 bg-slate-950/50 p-4 text-left transition-all hover:border-sky-400 hover:bg-sky-500/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-slate-800 disabled:opacity-45"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300 uppercase">
                        {remainingQuota}/{DEMO_MAX_LIVE_CALLS}
                      </span>
                    </div>
                    <h4 className="mt-3 text-sm font-bold text-slate-100 group-hover:text-sky-300">
                      {t.aiLiveCardTitle}
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      {t.aiLiveCardDesc}
                    </p>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-sky-400 uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {t.aiTryLiveBtn} ({remainingQuota}/{DEMO_MAX_LIVE_CALLS})
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-slate-950/40 p-6 text-center">
                <Sparkles className="h-8 w-8 text-emerald-400" />
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
                  {t.aiModalSubtitle}
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleStartSession(false)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-5 py-2.5 text-xs font-bold tracking-wider text-emerald-400 uppercase transition-all hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
                  >
                    <Bot className="h-4 w-4" />
                    <span>{t.aiStartBtn}</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            <>
              {/* Completed Turns History */}
              {history.map((turn, idx) => {
                const resolvedTurnQuestion =
                  turn.mode === 'DEMO_PRESET' && turn.presetTurn
                    ? turn.presetTurn === 1
                      ? t.aiDemoQ1
                      : t.aiDemoQ2
                    : turn.question

                const resolvedTurnFeedback =
                  turn.mode === 'DEMO_PRESET' && turn.presetTurn
                    ? turn.presetTurn === 1
                      ? t.aiDemoF1
                      : t.aiDemoF2
                    : turn.feedback

                return (
                  <div
                    key={idx}
                    className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4"
                  >
                    <div className="text-sm leading-relaxed text-slate-200">
                      <span className="font-bold text-emerald-400">
                        Q{idx + 1}:{' '}
                      </span>
                      {resolvedTurnQuestion}
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-sm whitespace-pre-wrap text-slate-200">
                      <span className="font-bold text-sky-400">
                        {t.aiUserLabel}:{' '}
                      </span>
                      {turn.answer}
                    </div>
                    <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="leading-relaxed text-slate-300">
                          {resolvedTurnFeedback}
                        </p>
                        <span className="shrink-0 rounded border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                          {t.aiScoreLabel}: {turn.score}/10
                        </span>
                      </div>
                      {turn.isShortDemoAnswer && (
                        <p className="border-t border-amber-500/20 pt-2 text-xs text-amber-400">
                          {t.aiDemoShortHint}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Active Streamed Question */}
              {!isCompleted && displayedQuestion && (
                <div className="rounded-xl border border-emerald-500/30 bg-slate-950/60 p-4">
                  <span className="mb-2 inline-block rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                    {t.aiNextQuestionBadge} · {history.length + 1} /{' '}
                    {isDemo ? 2 : 3}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-100">
                    {displayedQuestion}
                  </p>
                </div>
              )}

              {/* Completion Summary */}
              {isCompleted && (
                <div className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                  <h4 className="mt-2 text-sm font-bold tracking-wider text-emerald-400 uppercase">
                    {t.aiCompletedTitle}
                  </h4>
                  {avgScore && (
                    <p className="mt-1 text-sm text-slate-300">
                      {t.aiScoreLabel}:{' '}
                      <span className="font-bold text-emerald-400">
                        {avgScore} / 10
                      </span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => resetSessionState()}
                    className="mt-4 flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t.aiRestartBtn}</span>
                  </button>
                </div>
              )}

              <div ref={scrollBottomRef} />
            </>
          )}
        </div>

        {/* Answer Input Form */}
        {hasStarted && !isCompleted && (
          <form
            onSubmit={handleSubmitAnswer}
            className="mt-4 flex shrink-0 flex-col gap-2 border-t border-slate-800 pt-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea
                rows={3}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                disabled={isLoading}
                placeholder={t.aiAnswerPlaceholder}
                className="w-full flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={isLoading || !userAnswer.trim()}
                className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-5 py-2.5 text-xs font-bold tracking-wider text-emerald-400 uppercase transition-all hover:bg-emerald-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-400" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>{t.aiSubmitAnswerBtn}</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-slate-500">{t.aiInputHint}</span>
          </form>
        )}
      </div>
    </div>
  )
}
