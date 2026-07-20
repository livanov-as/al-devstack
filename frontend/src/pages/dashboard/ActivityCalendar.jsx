import React, { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { API_BASE_URL } from '../../config'

export default function ActivityCalendar() {
  const { t } = useLanguage()
  const [activityMap, setActivityMap] = useState({})
  const [loading, setLoading] = useState(true)

  // 1. Fetch aggregated calendar data directly from the dedicated telemetry endpoint
  useEffect(() => {
    // Automatically detect browser timezone to prevent localized date shifting
    const clientTimezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    fetch(
      `${API_BASE_URL}/progress/calendar?timezone=${encodeURIComponent(clientTimezone)}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error('Calendar API Link Offline')
        return res.json()
      })
      .then((data) => {
        // Enforce safe payload mapping: { "YYYY-MM-DD": count }
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setActivityMap(data)
        } else {
          setActivityMap({})
        }
        setLoading(false)
      })
      .catch((err) => {
        console.warn(
          'Telemetry server unreachable, fallback empty state:',
          err.message,
        )
        setActivityMap({})
        setLoading(false)
      })
  }, [])

  // 2. Generate a flat sequential array tracking exactly the last 31 days
  const calendarDays = useMemo(() => {
    const result = []
    const totalTargetDays = 31
    const today = new Date()

    for (let i = totalTargetDays - 1; i >= 0; i--) {
      const targetDate = new Date()
      targetDate.setDate(today.getDate() - i)

      // Normalize date objects into static YYYY-MM-DD keys respecting local timezone offsets
      const offset = targetDate.getTimezoneOffset()
      const localZoneDate = new Date(targetDate.getTime() - offset * 60 * 1000)
      const dateStringKey = localZoneDate.toISOString().split('T')[0]

      const taskCount = activityMap[dateStringKey] || 0
      result.push({ date: dateStringKey, count: taskCount })
    }

    return result
  }, [activityMap])

  // Cyberpunk design system matrix color tiers
  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-800 border-slate-700/40'
    if (count <= 2) return 'bg-emerald-900 border-emerald-800'
    if (count <= 5) return 'bg-emerald-700 border-emerald-600'
    if (count <= 7) return 'bg-emerald-500 border-emerald-400'
    return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] border-emerald-300' // 8+ concurrent tasks
  }

  if (loading) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-200 uppercase">
            {t.activityCalendarTitle || 'Activity Matrix'}
          </h3>
          <p className="text-[11px] text-slate-400">
            {t.activityCalendarSubtitle ||
              'Satellite data synchronization for the last 31 days'}
          </p>
        </div>
        {/* Compact dashboard timeline footprint indicator */}
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-emerald-400 uppercase">
          {t.activityCalendarBadge || '31-Day Strip'}
        </span>
      </div>

      {/* Grid wrapper transformed into an elegant, dense horizontal baseline strip */}
      <div className="scrollbar-thin scrollbar-thumb-slate-800 mt-5 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1">
          {calendarDays.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count > 0 ? `${day.count} ${t.tasks || 'tasks'}` : t.noTasks || 'no tasks'}`}
              className={`h-3 w-3 cursor-pointer rounded-xs border transition-all duration-150 hover:z-10 hover:scale-125 ${getColorClass(day.count)}`}
            />
          ))}
        </div>
      </div>

      {/* Cyberpunk synchronization status matrix legend footprint */}
      <div className="mt-4 flex items-center justify-end gap-1.5 font-mono text-[10px] text-slate-500">
        <span>{t.less || 'Less'}</span>
        <div className="h-2.5 w-2.5 rounded-xs border border-slate-700/50 bg-slate-800" />
        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-900" />
        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-700" />
        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
        <span>{t.more || 'More'}</span>
      </div>
    </div>
  )
}
