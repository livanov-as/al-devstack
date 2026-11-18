import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X,
  RotateCcw,
  Lock,
  ShieldAlert,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { useAuth, UserRole } from '../context/AuthContext'
import { useLanguage } from '../hooks/useLanguage'
import { IGisData } from '../pages/dashboard/hooks/useWorldMap'
import { API_BASE_URL } from '../config'

interface ResetProgressModalProps {
  isOpen: boolean
  onClose: () => void
}

const SECTOR_OPTIONS = [
  { id: 'all', labelKey: 'resetSectorAll' },
  { id: 'europe', name: 'Europe' },
  { id: 'asia', name: 'Asia' },
  { id: 'africa', name: 'Africa' },
  { id: 'north_america', name: 'North America' },
  { id: 'south_america', name: 'South America' },
  { id: 'australia_oceania', name: 'Australia & Oceania' },
]

export default function ResetProgressModal({
  isOpen,
  onClose,
}: ResetProgressModalProps) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const isDemo = user?.role === UserRole.DEMO_USER

  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [strictMode, setStrictMode] = useState<boolean>(false)
  const [isTogglingStrict, setIsTogglingStrict] = useState<boolean>(false)
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: gisData } = useQuery<
    IGisData & { strictLessonProgress?: boolean }
  >({
    queryKey: ['geo-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/progress/geo-stats`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('GIS Link Offline')
      return res.json()
    },
  })

  useEffect(() => {
    if (gisData && typeof gisData.strictLessonProgress === 'boolean') {
      setStrictMode(gisData.strictLessonProgress)
    }
  }, [gisData])

  useEffect(() => {
    if (isOpen) {
      setFeedbackMsg(null)
      setErrorMsg(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleToggleStrictMode = async () => {
    if (isTogglingStrict) return

    const nextValue = !strictMode

    // Sandbox FinOps Mode: recalculate map percentages locally in RAM without Atlas mutations
    if (isDemo) {
      setStrictMode(nextValue)
      queryClient.setQueryData<any>(['geo-stats'], (prev: any) => {
        if (!prev || !prev.regions) return prev
        const updatedRegions: Record<string, any> = {}
        for (const [key, region] of Object.entries(prev.regions) as [
          string,
          any,
        ][]) {
          let percentage = 0
          if (region.hasCertificate && !nextValue) {
            percentage = 100
          } else if (region.total > 0) {
            percentage = Math.min(
              100,
              Math.round((region.completed / region.total) * 100),
            )
          }
          updatedRegions[key] = { ...region, percentage }
        }
        return {
          ...prev,
          regions: updatedRegions,
          strictLessonProgress: nextValue,
        }
      })
      return
    }

    setIsTogglingStrict(true)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      const res = await fetch(`${API_BASE_URL}/progress/strict-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ strictLessonProgress: nextValue }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(
          errData.message || 'Failed to update strict progress mode',
        )
      }

      setStrictMode(nextValue)
      await queryClient.invalidateQueries({ queryKey: ['geo-stats'] })
    } catch (err: any) {
      setErrorMsg(err.message || 'Strict mode toggle failed.')
    } finally {
      setIsTogglingStrict(false)
    }
  }

  const handleConfirmReset = async () => {
    if (isDemo || isResetting) return

    setIsResetting(true)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      const res = await fetch(
        `${API_BASE_URL}/progress/reset?regionId=${encodeURIComponent(selectedSector)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Progress reset operation failed')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['geo-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['progress-timeline'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-calendar'] }),
      ])

      setFeedbackMsg(t.resetSuccessMsg)
      window.setTimeout(() => {
        onClose()
      }, 1100)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset telemetry records.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 font-mono shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                {t.resetModalTitle}
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {t.resetModalSubtitle}
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

        {/* Sandbox Read-Only Banner */}
        {isDemo && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold tracking-wide text-amber-400">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>{t.resetSandboxBanner}</span>
          </div>
        )}

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {feedbackMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Controls */}
        <div className="mt-5 space-y-4">
          {/* Sector Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {t.resetSectorLabel}
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              disabled={isResetting}
              className="w-full cursor-pointer rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-200 transition-colors outline-none focus:border-emerald-500/50"
            >
              {SECTOR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.labelKey ? t[opt.labelKey] : opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Strict Lesson Mode Toggle */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 p-3.5">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                {t.resetStrictLabel}
              </span>
              <span className="text-[11px] leading-relaxed text-slate-400">
                {t.resetStrictHint}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={strictMode}
              disabled={isTogglingStrict}
              onClick={handleToggleStrictMode}
              className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                strictMode
                  ? 'border-emerald-400 bg-emerald-500'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                  strictMode ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Certificates Preservation Notice */}
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-slate-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{t.resetCertNotice}</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDemo || isResetting}
            title={isDemo ? t.sandboxLockedTooltip : undefined}
            onClick={handleConfirmReset}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all ${
              isDemo
                ? 'cursor-not-allowed border-slate-700 bg-slate-800/60 text-slate-500'
                : 'cursor-pointer border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 active:scale-[0.98]'
            }`}
          >
            {isDemo && <Lock className="h-3.5 w-3.5 text-amber-400" />}
            <span>
              {isResetting ? t.resetConfirmingBtn : t.resetConfirmBtn}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
