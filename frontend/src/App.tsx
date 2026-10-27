import { Component, ErrorInfo, ReactNode } from 'react'
import LanguageProvider from './context/LanguageProvider'
import { useLanguage } from './hooks/useLanguage'
import ActivityCalendar from './pages/dashboard/ActivityCalendar'
import TaskTimeline from './pages/dashboard/TaskTimeline'
import WorldMap from './pages/dashboard/WorldMap'
import CertificatesGrid from './pages/dashboard/CertificatesGrid'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Explicit class-based Error Boundary system implementation for React 19 runtime safety
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Telemetry UX Runtime Exception caught:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-full min-h-65 w-full flex-col items-center justify-center rounded-xl border border-rose-950/40 bg-rose-950/5 p-6 text-center backdrop-blur-md">
            <span className="font-mono text-xs font-bold tracking-widest text-rose-400 uppercase">
              // System Error Boundary Triggered
            </span>
            <p className="mt-2 font-mono text-[11px] text-slate-400">
              An unexpected runtime crash occurred within this dashboard
              cluster.
            </p>
          </div>
        )
      )
    }

    return this.props.children
  }
}

function Header() {
  const { lang, setLang } = useLanguage()
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-4 backdrop-blur-md md:px-6">
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
    <div className="mx-auto h-full min-h-screen overflow-y-auto p-4 md:p-6 lg:h-[calc(100vh-64px)] lg:min-h-0 lg:overflow-hidden">
      {/* Upgraded grid system breakpoint to lg for explicit tablet optimization */}
      <div className="grid h-full max-h-full grid-cols-1 items-stretch gap-5 pb-2 lg:grid-cols-12">
        {/* LEFT INFOGRAPHICS ZONE (Approx. 66% width matrix) - Map & Calendar cluster */}
        <div className="flex h-full flex-col space-y-5 lg:col-span-8 lg:overflow-hidden">
          {/* Main geographic progress tracking engine mapping workspace */}
          <div className="flex min-h-0 flex-1 flex-col">
            <ErrorBoundary>
              <WorldMap />
            </ErrorBoundary>
          </div>
          {/* Horizontally stretched localized 31-day activity strip */}
          <div className="shrink-0">
            <ErrorBoundary>
              <ActivityCalendar />
            </ErrorBoundary>
          </div>
        </div>

        {/* RIGHT LIVE TERMINAL ZONE (Approx. 33% width matrix) - Synchronized processing feeds */}
        <div className="flex h-full flex-col space-y-5 lg:col-span-4 lg:max-h-full lg:overflow-hidden">
          {/* Top segment: Live tasks stream telemetry stream */}
          <div className="min-h-0 flex-1">
            <ErrorBoundary>
              <TaskTimeline />
            </ErrorBoundary>
          </div>
          {/* Bottom segment: Earned credentials certified archive */}
          <div className="min-h-0 flex-1">
            <ErrorBoundary>
              <CertificatesGrid />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <div className="h-full min-h-screen w-screen overflow-x-hidden bg-[#020617] text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400 lg:h-screen lg:overflow-hidden">
        <Header />
        <main>
          <DashboardContent />
        </main>
      </div>
    </LanguageProvider>
  )
}
