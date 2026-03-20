import { useLocalStorage } from '../hooks/useLocalStorage'
import { Zap, Target, TrendingUp, Plus, Minus } from 'lucide-react'

export default function Dashboard() {
  const [courses, setCourses] = useLocalStorage('al_courses', [
    { id: 1, name: 'JS Algorithms', progress: 85, color: 'bg-yellow-500' },
    { id: 2, name: 'Frontend Libraries', progress: 40, color: 'bg-blue-500' },
  ])

  const updateProgress = (id, delta) => {
    setCourses(
      courses.map((c) =>
        c.id === id
          ? { ...c, progress: Math.min(100, Math.max(0, c.progress + delta)) }
          : c,
      ),
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-10 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight">
            <Zap className="fill-yellow-400/20 text-yellow-400" size={28} />
            Learning <span className="text-blue-500">Tracker</span>
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 italic">
            Твой путь к Fullstack Developer
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-2 px-4 md:flex">
          <TrendingUp size={16} className="text-emerald-500" />
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            Active Streak: 5 Days
          </span>
        </div>
      </header>

      <div className="grid gap-6 text-(--text-primary)">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md transition-all hover:border-blue-500/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${course.color} animate-pulse`}
                />
                <h3 className="text-lg font-bold tracking-tight">
                  {course.name}
                </h3>
              </div>
              <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => updateProgress(course.id, -5)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition hover:bg-slate-700"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => updateProgress(course.id, 5)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-blue-400 transition hover:bg-slate-700"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`${course.color} h-full shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)] transition-all duration-700 ease-out`}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <div className="flex min-w-16.25 items-center justify-end gap-1 font-mono text-sm font-black text-blue-400">
                <Target size={14} />
                {course.progress}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
