import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { CheckCircle2, Clock } from 'lucide-react'

// Backup sample data matching Mongoose schema if the backend is offline
const fallbackTasks = Array.from({ length: 15 }, (_, i) => ({
  _id: `demo-task-${i}`,
  task_name:
    i % 2 === 0
      ? `Completed validation middleware for Express controllers`
      : `Refactored main.py selectors inside beautifulsoup parser`,
  category: i % 2 === 0 ? 'javascript-v9' : 'python-parser',
  date: new Date(Date.now() - i * 3600000).toISOString(),
}))

export default function TaskTimeline() {
  const { t } = useLanguage()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMocked, setIsMocked] = useState(false)

  useEffect(() => {
    fetch('http://localhost:5000/api/progress')
      .then((res) => {
        if (!res.ok) throw new Error('API Error')
        return res.json()
      })
      .then((data) => {
        // Safe backend array verification mapping to data.tasks structure
        const rawTasks =
          data && Array.isArray(data.tasks) ? data.tasks : fallbackTasks

        // Sort records by timestamp and restrict feed to the last 50 entries
        const sortedData = rawTasks
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 50)

        setTasks(sortedData)
        setIsMocked(!data || !Array.isArray(data.tasks))
        setLoading(false)
      })
      .catch((err) => {
        console.warn(
          'Progress backend offline, initializing demo matrix mode:',
          err.message,
        )
        setTasks(fallbackTasks)
        setIsMocked(true)
        setLoading(false)
      })
  }, [])

  // Parses individual category slugs into uniform UI tech badges
  const resolveCategoryDetails = (slug) => {
    const normSlug = slug?.toLowerCase() || ''
    if (normSlug.includes('python') || normSlug.includes('parser')) {
      return {
        label: t.categoryParser,
        style: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      }
    }
    if (
      normSlug.includes('v9') ||
      normSlug.includes('javascript') ||
      normSlug.includes('front')
    ) {
      return {
        label: t.categoryFrontend,
        style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      }
    }
    return {
      label: t.categoryBackend,
      style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    }
  }

  const formatTime = (isoString) => {
    try {
      const dateObj = new Date(isoString)
      return dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '--:--'
    }
  }

  // Loading Phase (Fully adapted to parent container height boundaries)
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md">
      {/* Header Info Block */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800/60 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
              {t.timelineTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-400">{t.timelineSub}</p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase ${
            isMocked
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {isMocked ? 'Demo Mode' : 'Live API'}
        </span>
      </div>

      {/* Task List Container with Cyberpunk Fade-Out Gradient Mask */}
      <div className="scrollbar-thin mt-4 flex-1 space-y-3 overflow-y-auto mask-[linear-gradient(to_bottom,white_85%,transparent_100%)] pr-1">
        {tasks.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs text-slate-500">
            No tasks recorded
          </p>
        ) : (
          tasks.map((task) => {
            const { label, style } = resolveCategoryDetails(task.category)

            return (
              <div
                key={task._id}
                className="group flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 transition-all duration-150 hover:border-slate-700/60 hover:bg-slate-800/30"
              >
                <div className="mt-0.5 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 transition-transform group-hover:scale-110" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {/* Maps strictly to task_name from database schema */}
                  <p className="line-clamp-2 font-mono text-xs font-medium text-slate-300 transition-colors group-hover:text-slate-200">
                    {task.task_name}
                  </p>

                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider uppercase ${style}`}
                    >
                      {label}
                    </span>
                    {/* Maps strictly to date from database schema */}
                    <span className="font-mono text-slate-500">
                      {formatTime(task.date)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
