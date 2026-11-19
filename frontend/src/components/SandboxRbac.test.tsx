// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LanguageProvider from '../context/LanguageProvider'
import { AuthProvider, UserRole } from '../context/AuthContext'
import AuthForm from './AuthForm'
import ResetProgressModal from './ResetProgressModal'
import AdminModal from './AdminModal'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>{ui}</AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('Frontend Auth & Sandbox RBAC Protection', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('al_lang', 'en')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders AuthForm with login inputs and Demo Mode fast-track trigger', () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response)

    renderWithProviders(<AuthForm />)

    expect(screen.getByText(/al-devstack \/\/ core/i)).toBeTruthy()
    expect(screen.getByText(/Explore Sandbox \(Demo Mode\)/i)).toBeTruthy()
    expect(screen.getByText(/Initialize Session/i)).toBeTruthy()
  })

  it('locks ResetProgressModal mutation button under DEMO_USER role', async () => {
    localStorage.setItem(
      'al_user',
      JSON.stringify({
        username: 'recruiter-tech-lead',
        role: UserRole.DEMO_USER,
      }),
    )

    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/progress/calendar')) {
        return { ok: true, status: 200, json: async () => ({}) } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          regions: {},
          globalFullStack: false,
          strictLessonProgress: false,
        }),
      } as Response
    })

    renderWithProviders(<ResetProgressModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/SANDBOX READ-ONLY MODE/i)).toBeTruthy()
    })

    const resetBtn = screen.getByRole('button', {
      name: /Execute Progress Reset/i,
    }) as HTMLButtonElement
    expect(resetBtn.disabled).toBe(true)
  })

  it('locks AdminModal mutations for DEMO_USER and unlocks them for ADMIN', async () => {
    const mockAdminResponse = {
      isSandbox: false,
      finops: {
        activeUserSlots: 2,
        maxUserSlots: 10,
        totalUsers: 2,
        totalProgressDocs: 500,
        totalCertificateDocs: 3,
        clusterStatus: 'CONNECTED',
      },
      users: [
        {
          username: 'livanov-as',
          role: UserRole.ADMIN,
          taskCount: 377,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        },
        {
          username: 'alice-dev',
          role: UserRole.USER,
          taskCount: 123,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        },
      ],
    }

    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/admin/users')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockAdminResponse,
        } as Response
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response
    })

    // 1. Verify DEMO_USER sees locked Flush GIS Cache button
    localStorage.setItem(
      'al_user',
      JSON.stringify({
        username: 'recruiter-tech-lead',
        role: UserRole.DEMO_USER,
      }),
    )

    const { unmount } = renderWithProviders(
      <AdminModal isOpen={true} onClose={() => {}} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Cluster Admin & FinOps Core/i)).toBeTruthy()
    })

    const demoFlushBtn = screen.getByRole('button', {
      name: /Flush GIS Cache/i,
    }) as HTMLButtonElement
    expect(demoFlushBtn.disabled).toBe(true)

    unmount()

    // 2. Verify ADMIN sees unlocked Flush GIS Cache button
    localStorage.setItem(
      'al_user',
      JSON.stringify({
        username: 'livanov-as',
        role: UserRole.ADMIN,
      }),
    )

    renderWithProviders(<AdminModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      const adminFlushBtn = screen.getByRole('button', {
        name: /Flush GIS Cache/i,
      }) as HTMLButtonElement
      expect(adminFlushBtn.disabled).toBe(false)
    })
  })
})
