import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Shield,
  Lock,
  RefreshCw,
  Trash2,
  UserCog,
  Database,
  ShieldAlert,
  CheckCircle2,
  Play,
  Loader2,
} from 'lucide-react'
import { useAuth, UserRole } from '../context/AuthContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useLanguage } from '../hooks/useLanguage'
import { API_BASE_URL } from '../config'

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
}

interface AdminUserRow {
  username: string
  role: UserRole
  taskCount: number
  createdAt: string
  lastActiveAt: string
}

interface AdminTelemetryResponse {
  isSandbox: boolean
  finops: {
    activeUserSlots: number
    maxUserSlots: number
    totalUsers: number
    totalProgressDocs: number
    totalCertificateDocs: number
    clusterStatus: string
  }
  users: AdminUserRow[]
}

export default function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const isDemo = user?.role === UserRole.DEMO_USER

  useEscapeKey(isOpen, onClose)

  const [isFlushing, setIsFlushing] = useState<boolean>(false)
  const [busyUser, setBusyUser] = useState<string | null>(null)
  const [syncingUsers, setSyncingUsers] = useState<Record<string, number>>({})
  const baselineCountsRef = useRef<Record<string, number>>({})
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(
    null,
  )
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hasActiveSyncs = Object.keys(syncingUsers).length > 0

  const {
    data: adminData,
    isLoading,
    refetch,
  } = useQuery<AdminTelemetryResponse>({
    queryKey: ['admin-users-telemetry'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to load admin telemetry')
      }
      return res.json()
    },
    enabled: isOpen,
    refetchInterval: isOpen && hasActiveSyncs ? 10000 : false,
  })

  // Clear active sync spinner when taskCount changes or safety timeout expires
  useEffect(() => {
    if (!hasActiveSyncs || !adminData?.users) return

    setSyncingUsers((prev) => {
      let changed = false
      const next = { ...prev }
      const now = Date.now()

      for (const [targetName, startedAt] of Object.entries(prev)) {
        const row = adminData.users.find((u) => u.username === targetName)
        const baseline = baselineCountsRef.current[targetName]
        const maxTimeoutMs =
          row?.role === UserRole.ADMIN ? 20 * 60 * 1000 : 5 * 60 * 1000

        const countChanged =
          row !== undefined &&
          baseline !== undefined &&
          row.taskCount !== baseline
        const isTimedOut = now - startedAt > maxTimeoutMs

        if (!row || countChanged || isTimedOut) {
          delete next[targetName]
          delete baselineCountsRef.current[targetName]
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [adminData, hasActiveSyncs])

  useEffect(() => {
    if (isOpen) {
      setFeedbackMsg(null)
      setErrorMsg(null)
      setConfirmDeleteUser(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFlushCache = async () => {
    if (isDemo || isFlushing) return
    setIsFlushing(true)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      const res = await fetch(`${API_BASE_URL}/admin/cache-flush`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Cache flush failed')
      }

      await queryClient.invalidateQueries({ queryKey: ['geo-stats'] })
      setFeedbackMsg(t.adminCacheFlushedMsg)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to flush GIS cache.')
    } finally {
      setIsFlushing(false)
    }
  }

  const handleForceSync = async (targetUsername: string) => {
    if (isDemo || busyUser || syncingUsers[targetUsername]) return
    setBusyUser(targetUsername)
    setErrorMsg(null)
    setFeedbackMsg(null)

    const currentRow = adminData?.users.find(
      (u) => u.username === targetUsername,
    )
    baselineCountsRef.current[targetUsername] = currentRow?.taskCount ?? 0

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/users/${encodeURIComponent(targetUsername)}/sync`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Manual sync dispatch failed')
      }

      setSyncingUsers((prev) => ({
        ...prev,
        [targetUsername]: Date.now(),
      }))
      setFeedbackMsg(`${t.adminSyncDispatchedMsg} "${targetUsername}".`)
    } catch (err: any) {
      delete baselineCountsRef.current[targetUsername]
      setErrorMsg(err.message || 'Failed to dispatch parser sync.')
    } finally {
      setBusyUser(null)
    }
  }

  const handleToggleRole = async (targetRow: AdminUserRow) => {
    if (isDemo || busyUser) return
    const nextRole =
      targetRow.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN

    setBusyUser(targetRow.username)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      const res = await fetch(`${API_BASE_URL}/auth/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: targetRow.username,
          role: nextRole,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Role mutation failed')
      }

      await refetch()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role.')
    } finally {
      setBusyUser(null)
    }
  }

  const handleDeleteUser = async (targetUsername: string) => {
    if (isDemo || busyUser) return

    if (confirmDeleteUser !== targetUsername) {
      setConfirmDeleteUser(targetUsername)
      return
    }

    setBusyUser(targetUsername)
    setConfirmDeleteUser(null)
    setErrorMsg(null)
    setFeedbackMsg(null)

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/users/${encodeURIComponent(targetUsername)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Cascade user deletion failed')
      }

      await refetch()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user.')
    } finally {
      setBusyUser(null)
    }
  }

  const finops = adminData?.finops
  const usersList = adminData?.users || []

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                  {t.adminModalTitle}
                </h3>
                {isDemo && (
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-400">
                    {t.adminReadOnlyBadge}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {t.adminModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t.closeModalAria}
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sandbox Read-Only Banner */}
        {isDemo && (
          <div className="mt-4 flex shrink-0 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold tracking-wide text-amber-400">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>{t.adminSandboxBanner}</span>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 p-2.5 text-xs text-rose-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {feedbackMsg && (
          <div className="mt-3 flex shrink-0 items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="scrollbar-thin mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
            </div>
          ) : (
            <>
              {/* FinOps Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                  <span className="block text-[10px] tracking-wider text-slate-500 uppercase">
                    {t.adminSlotsLabel}
                  </span>
                  <span className="mt-1 block text-base font-black text-emerald-400">
                    {finops?.activeUserSlots ?? 0} /{' '}
                    {finops?.maxUserSlots ?? 10}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                  <span className="block text-[10px] tracking-wider text-slate-500 uppercase">
                    {t.adminProgressDocsLabel}
                  </span>
                  <span className="mt-1 block text-base font-black text-slate-200">
                    {finops?.totalProgressDocs ?? 0}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                  <span className="block text-[10px] tracking-wider text-slate-500 uppercase">
                    {t.adminCertDocsLabel}
                  </span>
                  <span className="mt-1 block text-base font-black text-slate-200">
                    {finops?.totalCertificateDocs ?? 0}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                  <span className="block text-[10px] tracking-wider text-slate-500 uppercase">
                    {t.adminClusterStatusLabel}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Database className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {finops?.clusterStatus ?? 'CONNECTED'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Users Registry Header + Flush Cache Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                  {t.adminUsersTableTitle} ({usersList.length})
                </h4>
                <button
                  type="button"
                  disabled={isDemo || isFlushing}
                  title={isDemo ? t.sandboxLockedTooltip : undefined}
                  onClick={handleFlushCache}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all ${
                    isDemo
                      ? 'cursor-not-allowed border-slate-700 bg-slate-800/60 text-slate-500'
                      : 'cursor-pointer border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-95'
                  }`}
                >
                  {isDemo ? (
                    <Lock className="h-3 w-3 text-amber-400" />
                  ) : (
                    <RefreshCw
                      className={`h-3 w-3 ${isFlushing ? 'animate-spin' : ''}`}
                    />
                  )}
                  <span>
                    {isFlushing
                      ? t.adminFlushingCacheBtn
                      : t.adminFlushCacheBtn}
                  </span>
                </button>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] tracking-wider text-slate-400 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">{t.adminColUser}</th>
                      <th className="px-3 py-2.5">{t.adminColRole}</th>
                      <th className="px-3 py-2.5">{t.adminColTasks}</th>
                      <th className="px-3 py-2.5 text-right">
                        {t.adminColActions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersList.map((row) => {
                      const isSelf = row.username === user?.username
                      const isRowBusy = busyUser === row.username
                      const isRowSyncing = Boolean(syncingUsers[row.username])
                      const isConfirming = confirmDeleteUser === row.username

                      return (
                        <tr
                          key={row.username}
                          className="transition-colors hover:bg-slate-900/50"
                        >
                          <td className="px-3 py-2.5 font-semibold text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span>{row.username}</span>
                              {isSelf && (
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                                row.role === UserRole.ADMIN
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : 'border-slate-700 bg-slate-800 text-slate-300'
                              }`}
                            >
                              {row.role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-400">
                            {row.taskCount}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Force Sync Button */}
                              <button
                                type="button"
                                disabled={isDemo || isRowBusy || isRowSyncing}
                                title={
                                  isDemo
                                    ? `${t.adminSyncTooltip} — ${t.sandboxLockedTooltip}`
                                    : t.adminSyncTooltip
                                }
                                onClick={() => handleForceSync(row.username)}
                                className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${
                                  isDemo
                                    ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                                    : isRowSyncing
                                      ? 'cursor-wait border-sky-500/40 bg-sky-500/20 text-sky-300'
                                      : 'cursor-pointer border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                                }`}
                              >
                                {isDemo ? (
                                  <Lock className="h-3 w-3 text-amber-400/80" />
                                ) : isRowSyncing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                                <span className="hidden sm:inline">
                                  {isRowSyncing ? 'Syncing...' : 'Sync'}
                                </span>
                              </button>

                              {/* Role Toggle Button */}
                              <button
                                type="button"
                                disabled={isDemo || isRowBusy || isSelf}
                                title={
                                  isDemo
                                    ? `${t.adminRoleToggleTooltip} — ${t.sandboxLockedTooltip}`
                                    : t.adminRoleToggleTooltip
                                }
                                onClick={() => handleToggleRole(row)}
                                className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${
                                  isDemo || isSelf
                                    ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                                    : 'cursor-pointer border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                }`}
                              >
                                {isDemo ? (
                                  <Lock className="h-3 w-3 text-amber-400/80" />
                                ) : (
                                  <UserCog className="h-3 w-3" />
                                )}
                                <span className="hidden sm:inline">Role</span>
                              </button>

                              {/* Cascade Delete Button */}
                              <button
                                type="button"
                                disabled={isDemo || isRowBusy || isSelf}
                                title={
                                  isDemo
                                    ? `${t.adminDeleteTooltip} — ${t.sandboxLockedTooltip}`
                                    : isConfirming
                                      ? `${t.adminDeleteConfirm} ${row.username}?`
                                      : t.adminDeleteTooltip
                                }
                                onClick={() => handleDeleteUser(row.username)}
                                className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${
                                  isDemo || isSelf
                                    ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                                    : isConfirming
                                      ? 'cursor-pointer border-rose-500 bg-rose-500/30 text-rose-200'
                                      : 'cursor-pointer border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                }`}
                              >
                                {isDemo ? (
                                  <Lock className="h-3 w-3 text-amber-400/80" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                <span className="hidden sm:inline">
                                  {isConfirming ? 'OK?' : 'Delete'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
