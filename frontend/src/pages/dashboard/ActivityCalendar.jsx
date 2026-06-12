import React, { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../../hooks/useLanguage'

export default function ActivityCalendar() {
  const { t } = useLanguage()
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. Загружаем реальные данные из схемы Progress
  useEffect(() => {
    fetch('http://localhost:5000/api/progress')
      .then((res) => {
        if (!res.ok) throw new Error('API Error')
        return res.json()
      })
      .then((data) => {
        // Читаем массив из data.tasks согласно схеме роутера
        if (data && Array.isArray(data.tasks)) {
          setProgressData(data.tasks)
        } else {
          setProgressData([])
        }
        setLoading(false)
      })
      .catch((err) => {
        console.warn('Бэкенд недоступен, сетка активности пустая:', err.message)
        setProgressData([])
        setLoading(false)
      })
  }, [])

  // 2. Группируем массив прогресса по дням в формат { "YYYY-MM-DD": count }
  const activityMap = useMemo(() => {
    const map = {}
    progressData.forEach((item) => {
      if (!item.date) return
      // Вырезаем только дату "YYYY-MM-DD" из ISO-строки бэка
      const dateKey = item.date.split('T')[0]
      map[dateKey] = (map[dateKey] || 0) + 1
    })
    return map
  }, [progressData])

  // 3. Генерируем матрицу на последние 16 недель (7 строк на 16 колонок)
  const weeks = useMemo(() => {
    const result = []
    const totalDays = 16 * 7
    const now = new Date()
    const startOffset = now.getDay()

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(now.getDate() - i - startOffset)

      // Форматируем текущий день в строку YYYY-MM-DD с учетом таймзоны
      const offset = date.getTimezoneOffset()
      const localDate = new Date(date.getTime() - offset * 60 * 1000)
      const dateString = localDate.toISOString().split('T')[0]

      const count = activityMap[dateString] || 0
      result.push({ date: dateString, count })
    }

    // Бьем массив по 7 дней (недели)
    const groupedWeeks = []
    for (let i = 0; i < result.length; i += 7) {
      groupedWeeks.push(result.slice(i, i + 7))
    }
    return groupedWeeks
  }, [activityMap])

  // Логика градации цветов на основе количества реальных задач
  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-800 border-slate-700/40'
    if (count <= 2) return 'bg-emerald-900 border-emerald-800'
    if (count <= 5) return 'bg-emerald-700 border-emerald-600'
    if (count <= 7) return 'bg-emerald-500 border-emerald-400'
    return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] border-emerald-300' // 8+ задач
  }

  if (loading) {
    return (
      <div className="flex h-45 w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            {t.dashboardTitle}
          </h3>
          <p className="text-xs text-slate-400">{t.dashboardSub}</p>
        </div>

        {/* Индикатор подключенного API */}
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-emerald-400 uppercase">
          Live Tracker
        </span>
      </div>

      {/* Отрисовка сетки */}
      <div className="scrollbar-thin scrollbar-thumb-slate-800 mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-0.75">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.75">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count > 0 ? `${day.count} ${t.tasks}` : t.noTasks}`}
                  className={`h-2.75 w-2.75 cursor-pointer rounded-xs border transition-all duration-150 hover:z-10 hover:scale-125 ${getColorClass(day.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Легенда */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
        <span>{t.less}</span>
        <div className="h-2.75 w-2.75 rounded-xs border border-slate-700/50 bg-slate-800" />
        <div className="h-2.75 w-2.75 rounded-xs bg-emerald-900" />
        <div className="h-2.75 w-2.75 rounded-xs bg-emerald-700" />
        <div className="h-2.75 w-2.75 rounded-xs bg-emerald-500" />
        <div className="h-2.75 w-2.75 rounded-xs bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
        <span>{t.more}</span>
      </div>
    </div>
  )
}
