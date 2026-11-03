import { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  fallback: ReactNode
}

export default function ProtectedRoute({
  children,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#020617] font-mono text-xs text-emerald-400">
        <div className="mb-2 h-5 w-5 animate-spin rounded-full border-b-2 border-emerald-500" />
        <span className="animate-pulse">// INITIALIZING SECURE CORE...</span>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <>{fallback}</>
}
