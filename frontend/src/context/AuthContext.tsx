import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { API_BASE_URL } from '../config'

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  DEMO_USER = 'DEMO_USER',
}

export interface UserContextData {
  username: string
  role: UserRole
}

interface AuthContextType {
  user: UserContextData | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  loginAsDemo: () => Promise<void>
  logout: (sessionExpiredMessage?: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserContextData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const logout = (sessionExpiredMessage?: string) => {
    setUser(null)
    localStorage.removeItem('al_user')
    if (sessionExpiredMessage) {
      localStorage.setItem('al_session_err', sessionExpiredMessage)
    }
    // Force clean page reload to invalidate TanStack query caches cleanly
    window.location.reload()
  }

  // Inject architectural global 401 response proxy interceptor layout boundary
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      // Auto-catch expired context: clear state metadata and eject user to AuthForm view boundary
      if (response.status === 401) {
        const urlStr =
          typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
        // Skip auth check endpoints to prevent infinite redirect cycle loops during login
        if (
          !urlStr.includes('/auth/login') &&
          !urlStr.includes('/auth/register') &&
          !urlStr.includes('/progress/calendar')
        ) {
          console.warn(
            'Identity Core Security Action: 401 Unauthorized caught. Terminating session context.',
          )
          logout('Session expired. Telemetry authentication required.')
        }
      }
      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Verifies existing session context upon initial cluster mounting
  useEffect(() => {
    async function verifySession() {
      try {
        // We use geo-stats or any guard-protected endpoint to verify cookie validity
        const res = await fetch(`${API_BASE_URL}/progress/calendar`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (res.ok) {
          // If session cookie is valid, we can parse user credentials safely.
          const cachedUser = localStorage.getItem('al_user')
          if (cachedUser) {
            setUser(JSON.parse(cachedUser))
          }
        } else {
          localStorage.removeItem('al_user')
        }
      } catch (error) {
        console.error(
          'Identity Infrastructure: Session verification failed',
          error,
        )
      } finally {
        setIsLoading(false)
      }
    }
    verifySession()
  }, [])

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(
        errData.message || 'Invalid credentials matrix configuration',
      )
    }

    const data = await res.json()
    const userData: UserContextData = {
      username: data.username,
      role: data.role,
    }
    setUser(userData)
    localStorage.setItem('al_user', JSON.stringify(userData))
    localStorage.removeItem('al_session_err') // Clear historical error tokens upon successful login sequences
  }

  const register = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || 'Registration transaction aborted')
    }

    // Auto-login after successful SaaS profile provisioning
    await login(username, password)
  }

  const loginAsDemo = async () => {
    // Zero-Load Context Swap: Authenticate under fixed DEMO parameters
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'recruiter-tech-lead',
        password: 'SecurePass123!',
      }),
    })

    if (!res.ok) {
      throw new Error('FinOps Sandbox: Demo mode allocation failed')
    }

    const data = await res.json()
    const userData: UserContextData = {
      username: data.username,
      role: data.role,
    }
    setUser(userData)
    localStorage.setItem('al_user', JSON.stringify(userData))
    localStorage.removeItem('al_session_err')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error(
      'useAuth must be executed within an architectural AuthProvider node',
    )
  }
  return context
}
