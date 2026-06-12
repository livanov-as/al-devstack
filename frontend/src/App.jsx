import React from 'react'
import LanguageProvider from './context/LanguageProvider'
import { useLanguage } from './hooks/useLanguage'
import ActivityCalendar from './pages/dashboard/ActivityCalendar'
import TaskTimeline from './pages/dashboard/TaskTimeline'
import WorldMap from './pages/dashboard/WorldMap'
import CertificatesGrid from './pages/dashboard/CertificatesGrid'

function Header() {
  const { lang, setLang } = useLanguage()
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xl font-black tracking-wider text-emerald-400">
          al-devstack
        </span>
        <span className="rounded-full border border-slate-700/50 bg-slate-800 px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-tight text-slate-400 uppercase">
          dashboard
        </span>
      </div>
      <button
        onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
        className="cursor-pointer rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-300 transition-all duration-200 hover:border-emerald-500/50 hover:text-emerald-400 active:scale-95"
      >
        {lang.toUpperCase()}
      </button>
    </header>
  )
}

function DashboardContent() {
  return (
    <div className="mx-auto h-[calc(100vh-64px)] max-w-7xl overflow-hidden p-4 sm:p-6">
      {/* Strict desktop view bounds alignment */}
      <div className="grid h-full max-h-full grid-cols-1 items-stretch gap-6 pb-4 lg:grid-cols-12">
        {/* LEFT INFOGRAPHICS ZONE (60%) - Uniform distributed layouts */}
        <div className="flex h-full flex-col space-y-5 overflow-hidden lg:col-span-7">
          <div className="shrink-0">
            <ActivityCalendar />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <WorldMap />
          </div>
          <div className="shrink-0">
            <CertificatesGrid />
          </div>
        </div>

        {/* RIGHT LIVE TERMINAL ZONE (40%) - Anchored matching view height */}
        <div className="flex h-full max-h-full flex-col overflow-hidden lg:col-span-5">
          <TaskTimeline />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <div className="h-screen w-screen overflow-hidden bg-[#020617] text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        <Header />
        <main>
          <DashboardContent />
        </main>
      </div>
    </LanguageProvider>
  )
}
