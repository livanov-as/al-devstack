import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import { API_BASE_URL } from '../../config'

// Explicit type layout definition for a singular completed educational task item
interface ITask {
  _id: string
  task_name: string
  category: string
  date: string
  url?: string
}

// Backup sample data matching Mongoose schema if the backend is offline
const fallbackTasks: ITask[] = Array.from({ length: 10 }, (_, i) => ({
  _id: `demo-task-${i}`,
  task_name:
    i % 2 === 0
      ? `Completed validation middleware for Express controllers`
      : `Refactored main.py selectors inside beautifulsoup parser`,
  category: i % 2 === 0 ? 'javascript-v9' : 'python-v9',
  date: new Date(Date.now() - i * 3600000).toISOString(),
  url: 'https://freecodecamp.org',
}))

export default function TaskTimeline() {
  const { t, lang } = useLanguage()
  const [tasks, setTasks] = useState<ITask[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isMocked, setIsMocked] = useState<boolean>(false)

  useEffect(() => {
    fetch(`${API_BASE_URL}/progress/timeline`)
      .then((res) => {
        if (!res.ok) throw new Error('API Error')
        return res.json()
      })
      .then((data: any) => {
        const rawTasks =
          data && Array.isArray(data.tasks)
            ? (data.tasks as ITask[])
            : fallbackTasks
        const sortedData = rawTasks
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, 10)
        setTasks(sortedData)
        setIsMocked(!data || !Array.isArray(data.tasks))
        setLoading(false)
      })
      .catch((err: Error) => {
        console.warn(
          'Progress backend offline, initializing demo matrix mode:',
          err.message,
        )
        setTasks(fallbackTasks)
        setIsMocked(true)
        setLoading(false)
      })
  }, [])

  // Resolve category specs matching keys against structural GEO_MAPPING criteria directly
  const resolveCategoryDetails = (slug: string) => {
    const normSlug = slug?.toLowerCase() || ''

    if (normSlug === 'python-v9') {
      return {
        label: t.categoryPython,
        style: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      }
    }
    if (
      normSlug === 'responsive-web-design-v9' ||
      normSlug === 'javascript-v9' ||
      normSlug === 'front-end-development-libraries-v9'
    ) {
      return {
        label: t.categoryFrontend,
        style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      }
    }
    // back-end-development-and-apis-v9 and relational-databases-v9 map to backend domain
    return {
      label: t.categoryBackend,
      style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    }
  }

  const formatTime = (isoString: string): string => {
    try {
      const dateObj = new Date(isoString)
      return dateObj.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '--:--'
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-65 w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-65 w-full flex-col rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-md sm:p-6">
      {/* Header Info Block */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800/60 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-semibold tracking-wide text-slate-200 uppercase sm:text-sm">
              {t.taskTimelineTitle}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 sm:text-xs">
            {t.activityCalendarSubtitle}
          </p>
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

      {/* Task List Container */}
      <div className="scrollbar-thin mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs text-slate-500">
            No tasks recorded
          </p>
        ) : (
          tasks.map((task) => {
            const { label, style } = resolveCategoryDetails(task.category)
            const containerStyle =
              'group flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 transition-all duration-150 hover:border-slate-700/60 hover:bg-slate-800/30 text-left w-full block select-none'

            const CardWrapper = task.url ? 'a' : 'div'
            const formattedUrl = task.url
              ? task.url.startsWith('http://') ||
                task.url.startsWith('https://')
                ? task.url
                : `https://${task.url}`
              : null

            const extraProps = formattedUrl
              ? {
                  href: formattedUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }
              : {}

            return (
              <React.Fragment key={task._id}>
                {React.createElement(
                  CardWrapper,
                  {
                    className: containerStyle,
                    ...extraProps,
                  },
                  <div className="flex w-full items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 transition-transform group-hover:scale-110" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-mono text-[10px] font-medium text-slate-300 transition-colors group-hover:text-slate-200 sm:text-xs">
                          {task.task_name}
                        </p>
                        {task.url && (
                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-600 opacity-0 transition-all duration-150 group-hover:text-slate-400 group-hover:opacity-100" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[8px] font-semibold tracking-wider uppercase sm:text-[9px] ${style}`}
                        >
                          {label}
                        </span>
                        <span className="font-mono text-slate-500 transition-colors group-hover:text-slate-400">
                          {formatTime(task.date)}
                        </span>
                      </div>
                    </div>
                  </div>,
                )}
              </React.Fragment>
            )
          })
        )}
      </div>
    </div>
  )
}
