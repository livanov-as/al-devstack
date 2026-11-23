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
  question: string
  answer: string
  score: number
  feedback: string
}

interface InterviewApiResponse {
  mode: 'DEMO_PRESET' | 'LIVE_AI'
  question?: string
  feedback?: string
  score?: number
  isCompleted: boolean
  remainingLiveQuota?: number
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
  const [activeQuestion, setActiveQuestion] = useState<string>('')
  const [displayedQuestion, setDisplayedQuestion] = useState<string>('')
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [history, setHistory] = useState<CompletedTurn[]>([])
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const scrollBottomRef = useRef<HTMLDivElement>(null)

  // Smooth typewriter streaming effect for AI questions
  useEffect(() => {
    if (!activeQuestion) {
      setDisplayedQuestion('')
      return
    }

    setDisplayedQuestion('')
    let index = 0
    const timer = window.setInterval(() => {
      index += 2
      setDisplayedQuestion(activeQuestion.slice(0, index))
      if (index >= activeQuestion.length) {
        window.clearInterval(timer)
      }
    }, 18)

    return () => window.clearInterval(timer)
  }, [activeQuestion])

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, displayedQuestion, isCompleted])

  const resetSessionState = () => {
    setActiveQuestion('')
    setDisplayedQuestion('')
    setUserAnswer('')
    setHistory([])
    setIsCompleted(false)
    setErrorMsg(null)
  }

  useEffect(() => {
    if (isOpen) {
      resetSessionState()
      setUseLiveAi(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleStartSession = async (liveMode: boolean) => {
    if (isLoading) return
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
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to start AI interview')
      }

      const data: InterviewApiResponse = await res.json()
      if (typeof data.remainingLiveQuota === 'number') {
        setRemainingQuota(data.remainingLiveQuota)
      }
      setActiveQuestion(data.question || '')
      setIsCompleted(Boolean(data.isCompleted))
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Interviewer service unavailable.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitAnswer = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!activeQuestion || !userAnswer.trim() || isLoading) return

    const currentQuestion = activeQuestion
    const currentAnswer = userAnswer.trim()

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
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to evaluate answer')
      }

      const data: InterviewApiResponse = await res.json()
      if (typeof data.remainingLiveQuota === 'number') {
        setRemainingQuota(data.remainingLiveQuota)
      }

      setHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: currentAnswer,
          score: data.score ?? 7,
          feedback: data.feedback || '',
        },
      ])

      setUserAnswer('')
      setActiveQuestion(data.question || '')
      setIsCompleted(Boolean(data.isCompleted))
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit interview response.')
    } finally {
      setIsLoading(false)
    }
  }

  const hasStarted =
    Boolean(activeQuestion) || history.length > 0 || isCompleted
  const avgScore =
    history.length > 0
      ? (
          history.reduce((sum, item) => sum + item.score, 0) / history.length
        ).toFixed(1)
      : null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-end bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[82vh] w-full max-w-lg flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                  {t.aiModalTitle}
                </h3>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
                  {lang.toUpperCase()}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {t.aiModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-slate-500 transition-colors hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sandbox Banner */}
        {isDemo && !useLiveAi && (
          <div className="mt-3 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold tracking-wide text-amber-400">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 shrink-0" />
              <span>{t.aiDemoBanner}</span>
            </div>
            {remainingQuota !== null && (
              <span className="shrink-0 text-[10px] text-amber-300">
                {t.aiLiveQuotaLabel}: {remainingQuota}
              </span>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 p-2.5 text-xs text-rose-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="scrollbar-thin mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {!hasStarted ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-slate-950/40 p-6 text-center">
              <Sparkles className="h-8 w-8 text-emerald-400" />
              <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-300">
                {t.aiModalSubtitle}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleStartSession(false)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold tracking-wider text-emerald-400 uppercase transition-all hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
                >
                  <Bot className="h-4 w-4" />
                  <span>{t.aiStartBtn}</span>
                </button>

                {isDemo && (
                  <button
                    type="button"
                    disabled={isLoading || remainingQuota === 0}
                    onClick={() => handleStartSession(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-xs font-bold tracking-wider text-sky-400 uppercase transition-all hover:bg-sky-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {t.aiTryLiveBtn}
                      {remainingQuota !== null ? ` (${remainingQuota})` : ''}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Completed Turns History */}
              {history.map((turn, idx) => (
                <div
                  key={idx}
                  className="space-y-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5"
                >
                  <div className="text-xs leading-relaxed text-slate-300">
                    <span className="font-bold text-emerald-400">
                      Q{idx + 1}:{' '}
                    </span>
                    {turn.question}
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-slate-200">
                    <span className="font-bold text-sky-400">YOU: </span>
                    {turn.answer}
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs">
                    <p className="leading-relaxed text-slate-300">
                      {turn.feedback}
                    </p>
                    <span className="shrink-0 rounded border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                      {t.aiScoreLabel}: {turn.score}/10
                    </span>
                  </div>
                </div>
              ))}

              {/* Active Streamed Question */}
              {!isCompleted && displayedQuestion && (
                <div className="rounded-xl border border-emerald-500/30 bg-slate-950/60 p-4">
                  <span className="mb-1.5 inline-block rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
                    {t.aiNextQuestionBadge}
                  </span>
                  <p className="text-xs leading-relaxed text-slate-100">
                    {displayedQuestion}
                  </p>
                </div>
              )}

              {/* Completion Summary */}
              {isCompleted && (
                <div className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <h4 className="mt-2 text-xs font-bold tracking-wider text-emerald-400 uppercase">
                    {t.aiCompletedTitle}
                  </h4>
                  {avgScore && (
                    <p className="mt-1 text-xs text-slate-300">
                      {t.aiScoreLabel}:{' '}
                      <span className="font-bold text-emerald-400">
                        {avgScore} / 10
                      </span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => resetSessionState()}
                    className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
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
            className="mt-4 flex shrink-0 flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row"
          >
            <textarea
              rows={2}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={isLoading}
              placeholder={t.aiAnswerPlaceholder}
              className="w-full flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              disabled={isLoading || !userAnswer.trim()}
              className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold tracking-wider text-emerald-400 uppercase transition-all hover:bg-emerald-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
          </form>
        )}
      </div>
    </div>
  )
}
