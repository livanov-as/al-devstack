import { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import LanguageProvider from './context/LanguageProvider'
import { AuthProvider, useAuth, UserRole } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AuthForm from './components/AuthForm'
import { useLanguage } from './hooks/useLanguage'
import ActivityCalendar from './pages/dashboard/ActivityCalendar'
import TaskTimeline from './pages/dashboard/TaskTimeline'
import WorldMap from './pages/dashboard/WorldMap'
import CertificatesGrid from './pages/dashboard/CertificatesGrid'
import { IGisData } from './pages/dashboard/hooks/useWorldMap'
import { API_BASE_URL } from './config'
import { LogOut, Radio } from 'lucide-react'

const WS_SERVER_URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://al-devstack-production.up.railway.app'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

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
  const { t, lang, setLang } = useLanguage()
  const { logout, user } = useAuth()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xl font-black tracking-wider text-emerald-400">
          al-devstack
        </span>
        <span className="rounded-full border border-slate-700/50 bg-slate-800 px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-tight text-slate-400 uppercase">
          dashboard
        </span>
        {user && (
          <span className="hidden rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 font-mono text-[10px] text-emerald-400 sm:inline">
            // {user.username} ({user.role})
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
          className="cursor-pointer rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-300 transition-all duration-200 hover:border-emerald-500/50 hover:text-emerald-400 active:scale-95"
        >
          {lang.toUpperCase()}
        </button>
        <button
          onClick={() => logout()}
          title={t.logoutTooltip}
          className="flex cursor-pointer items-center justify-center rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-all duration-200 hover:border-rose-500/50 hover:text-rose-400 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

function DashboardContent() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [syncProgress, setSyncProgress] = useState<number>(0)
  const [isCompletingSync, setIsCompletingSync] = useState<boolean>(false)

  // Read cached GIS sync state from React Query without issuing duplicate requests
  const { data: gisData } = useQuery<IGisData>({
    queryKey: ['geo-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/progress/geo-stats`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('GIS Link Offline')
      return res.json()
    },
  })

  const isSyncing = Boolean(gisData?.isSyncing)

  // Adaptive role-based progress estimator (ADMIN: ~19 min, USER: ~4 min)
  useEffect(() => {
    if (!isSyncing) {
      setSyncProgress(0)
      setIsCompletingSync(false)
      return
    }

    const expectedDurationMs =
      user?.role === UserRole.ADMIN ? 19 * 60 * 1000 : 4 * 60 * 1000
    const startedAt = Date.now()

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      const estimatedPercent = Math.min(
        96,
        Math.floor((elapsed / expectedDurationMs) * 100),
      )
      setSyncProgress((prev) => Math.max(prev, estimatedPercent))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isSyncing, user?.role])

  // Subscribe to isolated user WebSocket room for real-time telemetry updates
  useEffect(() => {
    if (!user) return

    const socket = io(WS_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('telemetry_updated', () => {
      setSyncProgress(100)
      setIsCompletingSync(true)

      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['geo-stats'] })
        queryClient.invalidateQueries({ queryKey: ['activity-calendar'] })
        queryClient.invalidateQueries({ queryKey: ['progress-timeline'] })
        queryClient.invalidateQueries({ queryKey: ['certificates-archive'] })
        setIsCompletingSync(false)
      }, 600)
    })

    return () => {
      socket.disconnect()
    }
  }, [user, queryClient])

  const showSyncOverlay = isSyncing || isCompletingSync

  return (
    <div className="relative mx-auto h-full min-h-screen overflow-y-auto p-4 md:p-6 lg:h-[calc(100vh-64px)] lg:min-h-0 lg:overflow-hidden">
      {showSyncOverlay && (
        <div className="animate-fade-in fixed inset-x-0 top-16 bottom-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col items-center rounded-xl border border-emerald-500/30 bg-slate-900/90 p-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.12)]">
            <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <Radio className="h-6 w-6 animate-pulse text-emerald-400" />
            </div>
            <h3 className="font-mono text-sm font-bold tracking-wider text-emerald-400 uppercase">
              {t.syncingTitle}
            </h3>
            <p className="mt-2 font-mono text-xs leading-relaxed text-slate-300">
              {t.syncingSubtitle}
            </p>
            <div className="mt-4 flex w-full items-center justify-between font-mono text-[11px] font-bold text-emerald-400">
              <span>TELEMETRY UPLINK</span>
              <span>{syncProgress}%</span>
            </div>
            <div className="mt-1.5 w-full overflow-hidden rounded-full bg-slate-800 p-0.5">
              <div
                style={{ width: `${Math.max(4, syncProgress)}%` }}
                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500 ease-out"
              />
            </div>
            <span className="mt-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              {t.syncingHint}
            </span>
          </div>
        </div>
      )}

      <div className="grid h-full max-h-full grid-cols-1 items-stretch gap-5 pb-2 lg:grid-cols-12">
        <div className="flex h-full flex-col space-y-5 lg:col-span-8 lg:overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <ErrorBoundary>
              <WorldMap />
            </ErrorBoundary>
          </div>
          <div className="shrink-0">
            <ErrorBoundary>
              <ActivityCalendar />
            </ErrorBoundary>
          </div>
        </div>

        <div className="flex h-full flex-col space-y-5 lg:col-span-4 lg:max-h-full lg:overflow-hidden">
          <div className="min-h-0 flex-1">
            <ErrorBoundary>
              <TaskTimeline />
            </ErrorBoundary>
          </div>
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
      <AuthProvider>
        <ProtectedRoute fallback={<AuthForm />}>
          <div className="h-full min-h-screen w-screen overflow-x-hidden bg-[#020617] text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400 lg:h-screen lg:overflow-hidden">
            <Header />
            <main>
              <DashboardContent />
            </main>
          </div>
        </ProtectedRoute>
      </AuthProvider>
    </LanguageProvider>
  )
}
