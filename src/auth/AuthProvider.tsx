import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api/auth'
import { TOKEN_KEY } from '../api/client'
import type { AuthUser } from '../api/types'

const USER_KEY = 'clubes_user'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  requiresContext: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  applyUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)
  const [loading, setLoading] = useState(Boolean(token))

  const applyUser = useCallback((next: AuthUser) => {
    setUser(next)
    localStorage.setItem(USER_KEY, JSON.stringify(next))
  }, [])

  const persistSession = useCallback(
    (nextToken: string, nextUser: AuthUser) => {
      localStorage.setItem(TOKEN_KEY, nextToken)
      setToken(nextToken)
      applyUser(nextUser)
    },
    [applyUser],
  )

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    authApi
      .me()
      .then((next) => {
        if (!cancelled) applyUser(next)
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [applyUser, clearSession, token])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password)
      persistSession(result.token, result.user)
      return result.user
    },
    [persistSession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // El token local se limpia igual.
    }
    clearSession()
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      requiresContext: Boolean(user?.requires_context && !user.contexto),
      login,
      logout,
      applyUser,
    }),
    [applyUser, loading, login, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
