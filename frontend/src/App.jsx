import { useState, useEffect } from 'react'
import { LearningTracker } from './components/LearningTracker'
import { CertCard } from './components/CertCard'

const content = {
  en: { 
    title: "AL DevStack", 
    hero: "Learning Dashboard",
    track: "Live Progress", 
    certs: "Milestones", 
    langBtn: "RU",
    courses: [
      { name: "JS Algorithms", progress: 85, color: "bg-yellow-500" },
      { name: "Frontend Libraries", progress: 40, color: "bg-blue-500" }
    ]
  },
  ru: { 
    title: "AL DevStack", 
    hero: "Панель обучения",
    track: "Прогресс в реальном времени", 
    certs: "Достижения", 
    langBtn: "EN",
    courses: [
      { name: "Алгоритмы JS", progress: 85, color: "bg-yellow-500" },
      { name: "Библиотеки Frontend", progress: 40, color: "bg-blue-500" }
    ]
  }
}

function App() {
  const [isEn, setIsEn] = useState(true)
  const [isDark, setIsDark] = useState(true)
  const t = isEn ? content.en : content.ru

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <div className="min-h-screen transition-colors duration-500 selection:bg-blue-500/30">
      <header className="max-w-5xl mx-auto px-6 py-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-blue-500 tracking-tighter">
            {t.title} <span className="text-slate-600 text-xs font-normal">v0.1.0</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">{t.hero}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => setIsDark(!isDark)} className="p-2 hover:bg-slate-800 rounded-xl transition text-lg">
            {isDark ? '🌙' : '☀️'}
          </button>
          <div className="w-[1px] h-6 bg-slate-800"></div>
          <button onClick={() => setIsEn(!isEn)} className="px-4 py-2 hover:bg-slate-800 rounded-xl transition text-xs font-bold text-slate-300">
            {t.langBtn}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 grid lg:grid-cols-12 gap-8">
        {/* Левая колонка: Трекер */}
        <section className="lg:col-span-7 space-y-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-[1px] bg-slate-800"></span> {t.track}
          </h2>
          <div className="grid gap-4">
            {t.courses.map(c => <LearningTracker key={c.name} title={c.name} progress={c.progress} color={c.color} />)}
          </div>
        </section>

        {/* Правая колонка: Сертификаты */}
        <section className="lg:col-span-5 space-y-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-[1px] bg-slate-800"></span> {t.certs}
          </h2>
          <div className="space-y-3">
            <CertCard name="Responsive Web Design" date="OCT 2023" isRu={!isEn} />
            <CertCard name="Scientific Computing Python" date="DEC 2023" isRu={!isEn} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
