import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api, tokenStore } from "@/lib/api"
import type { User } from "@/lib/types"

interface AuthState {
  user: User | null
  loading: boolean
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On load: if a token exists, ask backend who we are
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  async function loginWithGoogle(credential: string) {
    const res = await api.post<{ access_token: string; user: User }>("/auth/google", {
      credential,
    })
    tokenStore.set(res.access_token)
    setUser(res.user)
  }

  function logout() {
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}
