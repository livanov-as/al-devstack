import { useLocalStorage } from '../hooks/useLocalStorage'

export default function Dashboard() {
  const [courses, setCourses] = useLocalStorage('al_courses', [
    { id: 1, name: "JS Algorithms", progress: 85, color: "bg-yellow-500" },
    { id: 2, name: "Frontend Libraries", progress: 40, color: "bg-blue-500" }
  ])

  const updateProgress = (id, delta) => {
    setCourses(courses.map(c => 
      c.id === id ? { ...c, progress: Math.min(100, Math.max(0, c.progress + delta)) } : c
    ))
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header>
        <h2 className="text-2xl font-black tracking-tight text-(--text-primary)">
          Learning <span className="text-blue-500">Tracker</span>
        </h2>
      </header>

      <div className="grid gap-6">
        {courses.map(course => (
          <div key={course.id} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{course.name}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => updateProgress(course.id, -5)}
                  className="w-8 h-8 rounded-full border border-slate-700 hover:bg-slate-800 transition"
                > - </button>
                <button 
                  onClick={() => updateProgress(course.id, 5)}
                  className="w-8 h-8 rounded-full border border-slate-700 hover:bg-slate-800 transition text-blue-400"
                > + </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`${course.color} h-full transition-all duration-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]`}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <span className="font-mono font-bold text-sm w-10 text-right">
                {course.progress}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
